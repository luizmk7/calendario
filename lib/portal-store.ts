import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortalData } from "./portal-types";
export class PortalError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "PORTAL_ERROR",
  ) {
    super(message);
  }
}
export async function portalRole(db: SupabaseClient, userId: string) {
  const access = await db
    .from("calendar_client_access")
    .select("owner_id,company_id")
    .eq("client_id", userId)
    .maybeSingle();
  if (access.error) {
    if (["42P01", "PGRST205"].includes(access.error.code))
      throw new PortalError(
        "Os novos recursos aguardam a atualização do banco.",
        503,
        "MIGRATION_REQUIRED",
      );
    throw access.error;
  }
  if (access.data)
    return {
      role: "client" as const,
      ownerId: access.data.owner_id as string,
      companyId: access.data.company_id as string,
    };
  const owner = await db
    .from("calendar_workspaces")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (owner.error) throw owner.error;
  return {
    role: owner.data ? ("manager" as const) : ("unassigned" as const),
    ownerId: userId,
    companyId: null,
  };
}
// Pagination prevents silently truncating the history at Supabase's row limit.
async function allRows(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
) {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += 500) {
    const r = await query(offset, offset + 499);
    if (r.error) throw r.error;
    rows.push(...(r.data || []));
    if (!r.data || r.data.length < 500) break;
  }
  return rows;
}
export async function readPortal(
  db: SupabaseClient,
  userId: string,
  start: string,
  end: string,
): Promise<PortalData> {
  const access = await portalRole(db, userId);
  const result: PortalData = {
    role: access.role,
    companies: [],
    posts: [],
    notes: [],
    news: [],
    clients: [],
  };
  if (access.role === "unassigned") return result;
  if (access.role === "manager") {
    const [companies, posts, notes, clients] = await Promise.all([
      allRows((a, b) =>
        db
          .from("calendar_companies")
          .select("id,name,color")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        db
          .from("calendar_posts")
          .select(
            "id,companyId:company_id,title,date,format,topic,quantity,publishedQuantity:published_quantity,internalNotes:notes",
          )
          .eq("user_id", userId)
          .gte("date", start)
          .lte("date", end)
          .order("date")
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        db
          .from("calendar_internal_notes")
          .select(
            "id,companyId:company_id,body,date,resolved,createdAt:created_at",
          )
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        db
          .from("calendar_client_access")
          .select("clientId:client_id,companyId:company_id,email")
          .eq("owner_id", userId)
          .order("client_id")
          .range(a, b),
      ),
    ]);
    Object.assign(result, { companies, posts, notes, clients });
  } else {
    const c = await db.rpc("calendar_client_company");
    if (c.error) throw c.error;
    result.companies = c.data || [];
    result.posts = (await allRows((a, b) =>
      db
        .rpc("calendar_client_posts", { p_start: start, p_end: end })
        .range(a, b),
    )) as PortalData["posts"];
  }
  result.news = (await allRows((a, b) =>
    db
      .from("calendar_client_news")
      .select(
        "id,companyId:company_id,body,date,resolved,readAt:read_at,createdAt:created_at",
      )
      .eq("owner_id", access.ownerId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(a, b),
  )) as PortalData["news"];
  return result;
}
