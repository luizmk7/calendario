import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration preserves data and isolates managers, clients and private notes", async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public,storage TO authenticated,anon;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY,bucket_id text,name text);
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
 `);
  const manager = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222",
    a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    unknown = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  for (const [id, email] of [
    [manager, "owner@example.com"],
    [other, "other@example.com"],
    [a, "a@example.com"],
    [b, "b@example.com"],
    [unknown, "unknown@example.com"],
  ])
    await db.query("INSERT INTO auth.users VALUES($1,$2,now())", [id, email]);
  await db.exec(
    await readFile(new URL("../supabase/setup.sql", import.meta.url), "utf8"),
  );
  const as = async (id) => {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("SET ROLE authenticated");
  };
  await as(manager);
  await db.exec("SELECT public.initialize_calendar()");
  await as(other);
  await db.exec("SELECT public.initialize_calendar()");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.calendar_posts SET published=1,notes='PRIVATE NOTE',image='/api/images/11111111-1111-4111-8111-111111111111' WHERE user_id=$1 AND id='vianzo-3-Stories-0'",
    [manager],
  );
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261011_client_portal.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration); // safe rerun
  const count = await db.query(
    "SELECT count(*)::int AS n FROM public.calendar_posts",
  );
  assert.equal(count.rows[0].n, 178);
  const old = await db.query(
    "SELECT published_quantity,notes,image FROM public.calendar_posts WHERE user_id=$1 AND id='vianzo-3-Stories-0'",
    [manager],
  );
  assert.equal(old.rows[0].published_quantity, 1);
  assert.equal(old.rows[0].notes, "PRIVATE NOTE");
  assert.match(old.rows[0].image, /api\/images/);
  await as(manager);
  await db.exec(
    "SELECT public.calendar_link_client('a@example.com','vianzo'); SELECT public.calendar_link_client('b@example.com','empresa-2')",
  );
  await db.exec(
    "INSERT INTO public.calendar_internal_notes(company_id,body) VALUES('vianzo','SECRET INTERNAL')",
  );
  await db.exec(
    "INSERT INTO public.calendar_posts(user_id,id,company_id,title,date,format,quantity,published_quantity) VALUES(auth.uid(),'batch','vianzo','Stories','2026-10-12','Stories',3,2)",
  );
  const progress = await db.query(
    "SELECT time,published,published_quantity FROM public.calendar_posts WHERE id='batch'",
  );
  assert.deepEqual(progress.rows[0], {
    time: "",
    published: 0,
    published_quantity: 2,
  });
  await db.exec(
    "UPDATE public.calendar_posts SET published_quantity=3 WHERE id='batch'",
  );
  assert.equal(
    (
      await db.query(
        "SELECT published FROM public.calendar_posts WHERE id='batch'",
      )
    ).rows[0].published,
    1,
  );
  await assert.rejects(
    db.exec("SELECT public.calendar_link_client('a@example.com','empresa-2')"),
  );
  await as(a);
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_client_company()")).rows[0]
      .name,
    "Vianzo",
  );
  const posts = (
    await db.query(
      "SELECT * FROM public.calendar_client_posts('2026-10-01','2026-10-31')",
    )
  ).rows;
  assert.equal(posts.length, 90);
  assert.ok(posts.every((p) => p.companyId === "vianzo"));
  assert.ok(
    posts.every(
      (p) =>
        !("notes" in p) &&
        !("image" in p) &&
        !("time" in p) &&
        !("user_id" in p),
    ),
  );
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_posts")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_internal_notes")).rows
      .length,
    0,
  );
  await assert.rejects(
    db.exec(
      "INSERT INTO public.calendar_workspaces(user_id) VALUES(auth.uid())",
    ),
  );
  await assert.rejects(db.exec("SELECT public.initialize_calendar()"));
  await assert.rejects(
    db.exec(
      "INSERT INTO public.calendar_companies(user_id,id,name,color) VALUES(auth.uid(),'hack','Hack','#000000')",
    ),
  );
  await assert.rejects(
    db.exec(
      "SELECT public.calendar_link_client('unknown@example.com','vianzo')",
    ),
  );
  await db.query(
    "INSERT INTO public.calendar_client_news(owner_id,company_id,body) VALUES($1,'vianzo','Saturday event')",
    [manager],
  );
  await assert.rejects(
    db.query(
      "INSERT INTO public.calendar_client_news(owner_id,company_id,body) VALUES($1,'empresa-2','Foreign event')",
      [manager],
    ),
  );
  await assert.rejects(
    db.query(
      "INSERT INTO public.calendar_client_news(owner_id,company_id,body,resolved) VALUES($1,'vianzo','Fake done',true)",
      [manager],
    ),
  );
  await db.exec("UPDATE public.calendar_client_news SET resolved=true");
  assert.equal(
    (await db.query("SELECT resolved FROM public.calendar_client_news")).rows[0]
      .resolved,
    false,
  );
  await as(b);
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_client_company()")).rows[0]
      .id,
    "empresa-2",
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM public.calendar_client_posts('2026-10-01','2026-10-31')",
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_client_news")).rows.length,
    0,
  );
  await as(other);
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_internal_notes")).rows
      .length,
    0,
  );
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_client_news")).rows.length,
    0,
  );
  await as(manager);
  await db.exec(
    "UPDATE public.calendar_client_news SET resolved=true,read_at=now()",
  );
  await db.query(
    "DELETE FROM public.calendar_client_access WHERE client_id=$1",
    [a],
  );
  await as(a);
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_client_company()")).rows
      .length,
    0,
  );
  assert.equal(
    (await db.query("SELECT * FROM public.calendar_client_news")).rows.length,
    0,
  );
  await as(unknown);
  assert.equal(
    (await db.query("SELECT public.calendar_is_manager() AS v")).rows[0].v,
    false,
  );
  await db.exec("RESET ROLE; SET ROLE anon");
  await assert.rejects(
    db.exec("SELECT * FROM public.calendar_client_company()"),
  );
  await assert.rejects(db.exec("SELECT * FROM public.calendar_internal_notes"));
  await db.close();
});
