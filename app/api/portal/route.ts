import { z } from "zod";
import { authorizedClient, AuthRequired } from "@/lib/supabase/server";
import { noStore, writeAllowed } from "@/lib/store";
import { dateSchema, portalAction } from "@/lib/portal-validation";
import { PortalError, portalRole, readPortal } from "@/lib/portal-store";
export const dynamic = "force-dynamic";
function fail(e: unknown) {
  console.error("Portal request failed", e);
  const status =
    e instanceof AuthRequired
      ? 401
      : e instanceof PortalError
        ? e.status
        : e instanceof z.ZodError || e instanceof SyntaxError
          ? 400
          : 503;
  return Response.json(
    {
      error:
        e instanceof AuthRequired || e instanceof PortalError
          ? e.message
          : e instanceof z.ZodError || e instanceof SyntaxError
            ? "Confira os campos informados."
            : "Não foi possível concluir. Tente novamente.",
      code: e instanceof PortalError ? e.code : undefined,
    },
    { status, headers: noStore },
  );
}
function range(req: Request) {
  const q = new URL(req.url).searchParams;
  const start = dateSchema.parse(q.get("start"));
  const end = dateSchema.parse(q.get("end"));
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (days < 0 || days > 62) throw new PortalError("Período inválido.");
  return { start, end };
}
export async function GET(req: Request) {
  try {
    const { supabase, user } = await authorizedClient();
    const { start, end } = range(req);
    return Response.json(await readPortal(supabase, user.id, start, end), {
      headers: noStore,
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    try {
      writeAllowed(req);
    } catch {
      throw new PortalError("Origem inválida.", 403);
    }
    const { supabase: db, user } = await authorizedClient();
    const { start, end } = range(req);
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new PortalError("Formato inválido.", 415);
    const raw = await req.text();
    if (raw.length > 20000)
      throw new PortalError("Conteúdo muito grande.", 413);
    const body = portalAction.parse(JSON.parse(raw));
    const access = await portalRole(db, user.id);
    if (body.action === "sendNews") {
      if (access.role !== "client" || access.companyId !== body.news.companyId)
        throw new PortalError("Sem acesso a esta empresa.", 403);
      const { error } = await db.from("calendar_client_news").insert({
        owner_id: access.ownerId,
        company_id: access.companyId,
        author_id: user.id,
        body: body.news.body,
        date: body.news.date,
      });
      if (error) throw error;
    } else {
      if (access.role !== "manager")
        throw new PortalError("Somente o gestor pode realizar esta ação.", 403);
      let error;
      switch (body.action) {
        case "saveCompany":
          ({ error } = await db
            .from("calendar_companies")
            .upsert(
              { ...body.company, user_id: user.id },
              { onConflict: "user_id,id" },
            ));
          break;
        case "deleteCompany":
          ({ error } = await db
            .from("calendar_companies")
            .delete()
            .eq("user_id", user.id)
            .eq("id", body.id));
          break;
        case "savePost": {
          const p = body.post;
          ({ error } = await db.from("calendar_posts").upsert(
            {
              user_id: user.id,
              id: p.id,
              company_id: p.companyId,
              title: p.title || p.format,
              date: p.date,
              format: p.format,
              topic: p.topic,
              quantity: p.quantity,
              published_quantity: p.publishedQuantity,
              published: p.publishedQuantity === p.quantity ? 1 : 0,
            },
            { onConflict: "user_id,id" },
          ));
          break;
        }
        case "deletePost":
          ({ error } = await db
            .from("calendar_posts")
            .delete()
            .eq("user_id", user.id)
            .eq("id", body.id));
          break;
        case "saveNote": {
          const n = body.note;
          ({ error } = await db.from("calendar_internal_notes").upsert({
            id: n.id,
            owner_id: user.id,
            company_id: n.companyId,
            body: n.body,
            date: n.date,
            resolved: n.resolved,
          }));
          break;
        }
        case "deleteNote":
          ({ error } = await db
            .from("calendar_internal_notes")
            .delete()
            .eq("owner_id", user.id)
            .eq("id", body.id));
          break;
        case "updateNews": {
          const fields: { resolved?: boolean; read_at?: string } = {};
          if (body.resolved !== undefined) fields.resolved = body.resolved;
          if (body.read) fields.read_at = new Date().toISOString();
          if (!Object.keys(fields).length)
            throw new PortalError("Nenhuma alteração informada.");
          ({ error } = await db
            .from("calendar_client_news")
            .update(fields)
            .eq("owner_id", user.id)
            .eq("id", body.id));
          break;
        }
        case "linkClient": {
          const r = await db.rpc("calendar_link_client", {
            p_email: body.email,
            p_company_id: body.companyId,
          });
          if (r.error)
            throw new PortalError(
              r.error.code === "P0001"
                ? r.error.message
                : "Não foi possível vincular este cliente.",
              400,
            );
          break;
        }
        case "revokeClient":
          ({ error } = await db
            .from("calendar_client_access")
            .delete()
            .eq("owner_id", user.id)
            .eq("client_id", body.clientId));
          break;
      }
      if (error) throw error;
    }
    return Response.json(await readPortal(db, user.id, start, end), {
      headers: noStore,
    });
  } catch (e) {
    return fail(e);
  }
}
