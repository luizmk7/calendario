-- Execute este arquivo no SQL Editor de um projeto Supabase ativo.
-- Estrutura isolada por usuário; o calendário inicial é criado no primeiro acesso.
BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_workspaces (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 initialized_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.calendar_companies (
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 id text NOT NULL CHECK (length(id) BETWEEN 1 AND 100),
 name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
 color text NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS public.calendar_posts (
 user_id uuid NOT NULL DEFAULT auth.uid(),
 id text NOT NULL CHECK (length(id) BETWEEN 1 AND 100),
 company_id text NOT NULL,
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 150),
 date date NOT NULL,
 time text NOT NULL CHECK (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 format text NOT NULL CHECK (format IN ('Feed','Stories','Reels')),
 notes text NOT NULL DEFAULT '' CHECK (length(notes)<=5000),
 image text NOT NULL DEFAULT '' CHECK (image = '' OR image ~ '^/api/images/[0-9a-f-]{36}$'),
 published integer NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
 PRIMARY KEY(user_id,id),
 FOREIGN KEY(user_id,company_id) REFERENCES public.calendar_companies(user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_calendar_posts_company_date ON public.calendar_posts(user_id,company_id,date);

ALTER TABLE public.calendar_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_workspaces,public.calendar_companies,public.calendar_posts FROM anon,authenticated;
GRANT SELECT,INSERT ON public.calendar_workspaces TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.calendar_companies,public.calendar_posts TO authenticated;

DROP POLICY IF EXISTS calendar_workspace_select ON public.calendar_workspaces;
CREATE POLICY calendar_workspace_select ON public.calendar_workspaces FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS calendar_workspace_insert ON public.calendar_workspaces;
CREATE POLICY calendar_workspace_insert ON public.calendar_workspaces FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS calendar_companies_owner ON public.calendar_companies;
CREATE POLICY calendar_companies_owner ON public.calendar_companies FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
DROP POLICY IF EXISTS calendar_posts_owner ON public.calendar_posts;
CREATE POLICY calendar_posts_owner ON public.calendar_posts FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);

-- SECURITY INVOKER preserva as mesmas regras de acesso de quem executa.
CREATE OR REPLACE FUNCTION public.initialize_calendar() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
 owner_id uuid := auth.uid();
 inserted integer;
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO public.calendar_workspaces(user_id) VALUES(owner_id) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 IF inserted=0 THEN RETURN; END IF;
 INSERT INTO public.calendar_companies(user_id,id,name,color,created_at) VALUES
 (owner_id,'vianzo','Vianzo','#c78543',now()),
 (owner_id,'empresa-2','Empresa 2','#527bd9',now()+interval '1 millisecond'),
 (owner_id,'empresa-3','Empresa 3','#b068ca',now()+interval '2 milliseconds');
 INSERT INTO public.calendar_posts(user_id,id,company_id,title,date,time,format,notes) VALUES
 (owner_id,'vianzo-3-Stories-0','vianzo','Story 1','2026-10-03','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-3-Stories-1','vianzo','Story 2','2026-10-03','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-3-Stories-2','vianzo','Story 3','2026-10-03','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-3-Feed-0','vianzo','Publicação no feed','2026-10-03','10:00','Feed','Maior fluxo'),
 (owner_id,'vianzo-4-Stories-0','vianzo','Story 1','2026-10-04','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-4-Stories-1','vianzo','Story 2','2026-10-04','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-4-Stories-2','vianzo','Story 3','2026-10-04','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-4-Feed-0','vianzo','Publicação no feed','2026-10-04','10:30','Feed','Maior fluxo'),
 (owner_id,'vianzo-5-Stories-0','vianzo','Story 1','2026-10-05','14:30','Stories','Início da semana'),
 (owner_id,'vianzo-5-Stories-1','vianzo','Story 2','2026-10-05','18:00','Stories','Início da semana'),
 (owner_id,'vianzo-6-Stories-0','vianzo','Story 1','2026-10-06','09:30','Stories','Presença'),
 (owner_id,'vianzo-6-Stories-1','vianzo','Story 2','2026-10-06','14:30','Stories','Presença'),
 (owner_id,'vianzo-6-Stories-2','vianzo','Story 3','2026-10-06','18:30','Stories','Presença'),
 (owner_id,'vianzo-6-Feed-0','vianzo','Publicação no feed','2026-10-06','10:00','Feed','Presença'),
 (owner_id,'vianzo-7-Stories-0','vianzo','Story 1','2026-10-07','09:30','Stories','Presença'),
 (owner_id,'vianzo-7-Stories-1','vianzo','Story 2','2026-10-07','14:30','Stories','Presença'),
 (owner_id,'vianzo-7-Stories-2','vianzo','Story 3','2026-10-07','18:30','Stories','Presença'),
 (owner_id,'vianzo-8-Stories-0','vianzo','Story 1','2026-10-08','09:30','Stories','Presença'),
 (owner_id,'vianzo-8-Stories-1','vianzo','Story 2','2026-10-08','18:30','Stories','Presença'),
 (owner_id,'vianzo-9-Stories-0','vianzo','Story 1','2026-10-09','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-9-Stories-1','vianzo','Story 2','2026-10-09','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-9-Stories-2','vianzo','Story 3','2026-10-09','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-10-Stories-0','vianzo','Story 1','2026-10-10','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-10-Stories-1','vianzo','Story 2','2026-10-10','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-10-Stories-2','vianzo','Story 3','2026-10-10','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-10-Feed-0','vianzo','Publicação no feed','2026-10-10','10:00','Feed','Maior fluxo'),
 (owner_id,'vianzo-11-Stories-0','vianzo','Story 1','2026-10-11','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-11-Stories-1','vianzo','Story 2','2026-10-11','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-11-Stories-2','vianzo','Story 3','2026-10-11','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-12-Stories-0','vianzo','Story 1','2026-10-12','14:30','Stories','Feriado · funcionamento 14h–21h'),
 (owner_id,'vianzo-12-Stories-1','vianzo','Story 2','2026-10-12','17:30','Stories','Feriado · funcionamento 14h–21h'),
 (owner_id,'vianzo-12-Stories-2','vianzo','Story 3','2026-10-12','20:00','Stories','Feriado · funcionamento 14h–21h'),
 (owner_id,'vianzo-13-Stories-0','vianzo','Story 1','2026-10-13','18:30','Stories','Presença'),
 (owner_id,'vianzo-14-Stories-0','vianzo','Story 1','2026-10-14','09:30','Stories','Presença'),
 (owner_id,'vianzo-14-Stories-1','vianzo','Story 2','2026-10-14','14:30','Stories','Presença'),
 (owner_id,'vianzo-14-Stories-2','vianzo','Story 3','2026-10-14','18:30','Stories','Presença'),
 (owner_id,'vianzo-14-Feed-0','vianzo','Publicação no feed','2026-10-14','10:00','Feed','Presença'),
 (owner_id,'vianzo-16-Stories-0','vianzo','Story 1','2026-10-16','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-16-Stories-1','vianzo','Story 2','2026-10-16','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-16-Stories-2','vianzo','Story 3','2026-10-16','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-17-Stories-0','vianzo','Story 1','2026-10-17','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-17-Stories-1','vianzo','Story 2','2026-10-17','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-17-Stories-2','vianzo','Story 3','2026-10-17','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-17-Feed-0','vianzo','Publicação no feed','2026-10-17','10:00','Feed','Maior fluxo'),
 (owner_id,'vianzo-18-Stories-0','vianzo','Story 1','2026-10-18','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-18-Stories-1','vianzo','Story 2','2026-10-18','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-18-Stories-2','vianzo','Story 3','2026-10-18','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-19-Stories-0','vianzo','Story 1','2026-10-19','14:30','Stories','Início da semana'),
 (owner_id,'vianzo-19-Stories-1','vianzo','Story 2','2026-10-19','17:30','Stories','Início da semana'),
 (owner_id,'vianzo-19-Stories-2','vianzo','Story 3','2026-10-19','20:00','Stories','Início da semana'),
 (owner_id,'vianzo-20-Stories-0','vianzo','Story 1','2026-10-20','09:30','Stories','Presença'),
 (owner_id,'vianzo-20-Stories-1','vianzo','Story 2','2026-10-20','14:30','Stories','Presença'),
 (owner_id,'vianzo-20-Stories-2','vianzo','Story 3','2026-10-20','18:30','Stories','Presença'),
 (owner_id,'vianzo-21-Stories-0','vianzo','Story 1','2026-10-21','09:30','Stories','Presença'),
 (owner_id,'vianzo-21-Stories-1','vianzo','Story 2','2026-10-21','14:30','Stories','Presença'),
 (owner_id,'vianzo-21-Stories-2','vianzo','Story 3','2026-10-21','18:30','Stories','Presença'),
 (owner_id,'vianzo-21-Feed-0','vianzo','Publicação no feed','2026-10-21','10:00','Feed','Presença'),
 (owner_id,'vianzo-22-Stories-0','vianzo','Story 1','2026-10-22','09:30','Stories','Presença'),
 (owner_id,'vianzo-22-Stories-1','vianzo','Story 2','2026-10-22','18:30','Stories','Presença'),
 (owner_id,'vianzo-23-Stories-0','vianzo','Story 1','2026-10-23','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-23-Stories-1','vianzo','Story 2','2026-10-23','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-23-Stories-2','vianzo','Story 3','2026-10-23','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-24-Stories-0','vianzo','Story 1','2026-10-24','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-24-Stories-1','vianzo','Story 2','2026-10-24','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-24-Stories-2','vianzo','Story 3','2026-10-24','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-24-Feed-0','vianzo','Publicação no feed','2026-10-24','10:00','Feed','Maior fluxo'),
 (owner_id,'vianzo-25-Stories-0','vianzo','Story 1','2026-10-25','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-25-Stories-1','vianzo','Story 2','2026-10-25','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-25-Stories-2','vianzo','Story 3','2026-10-25','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-26-Stories-0','vianzo','Story 1','2026-10-26','14:30','Stories','Início da semana'),
 (owner_id,'vianzo-26-Stories-1','vianzo','Story 2','2026-10-26','17:30','Stories','Início da semana'),
 (owner_id,'vianzo-26-Stories-2','vianzo','Story 3','2026-10-26','20:00','Stories','Início da semana'),
 (owner_id,'vianzo-27-Stories-0','vianzo','Story 1','2026-10-27','09:30','Stories','Presença'),
 (owner_id,'vianzo-27-Stories-1','vianzo','Story 2','2026-10-27','14:30','Stories','Presença'),
 (owner_id,'vianzo-27-Stories-2','vianzo','Story 3','2026-10-27','18:30','Stories','Presença'),
 (owner_id,'vianzo-28-Stories-0','vianzo','Story 1','2026-10-28','09:30','Stories','Presença'),
 (owner_id,'vianzo-28-Stories-1','vianzo','Story 2','2026-10-28','14:30','Stories','Presença'),
 (owner_id,'vianzo-28-Stories-2','vianzo','Story 3','2026-10-28','18:30','Stories','Presença'),
 (owner_id,'vianzo-28-Feed-0','vianzo','Publicação no feed','2026-10-28','10:00','Feed','Presença'),
 (owner_id,'vianzo-29-Stories-0','vianzo','Story 1','2026-10-29','09:30','Stories','Presença'),
 (owner_id,'vianzo-29-Stories-1','vianzo','Story 2','2026-10-29','14:30','Stories','Presença'),
 (owner_id,'vianzo-29-Stories-2','vianzo','Story 3','2026-10-29','18:30','Stories','Presença'),
 (owner_id,'vianzo-30-Stories-0','vianzo','Story 1','2026-10-30','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-30-Stories-1','vianzo','Story 2','2026-10-30','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-30-Stories-2','vianzo','Story 3','2026-10-30','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-31-Stories-0','vianzo','Story 1','2026-10-31','09:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-31-Stories-1','vianzo','Story 2','2026-10-31','14:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-31-Stories-2','vianzo','Story 3','2026-10-31','18:30','Stories','Maior fluxo'),
 (owner_id,'vianzo-31-Feed-0','vianzo','Publicação no feed','2026-10-31','10:00','Feed','Maior fluxo');
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_calendar() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.initialize_calendar() TO authenticated;

-- Bucket privado; cada usuário acessa somente a própria pasta.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('calendar-images','calendar-images',false,3145728,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
DROP POLICY IF EXISTS calendar_images_select ON storage.objects;
CREATE POLICY calendar_images_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id='calendar-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS calendar_images_insert ON storage.objects;
CREATE POLICY calendar_images_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='calendar-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS calendar_images_update ON storage.objects;
CREATE POLICY calendar_images_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='calendar-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text) WITH CHECK (bucket_id='calendar-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS calendar_images_delete ON storage.objects;
CREATE POLICY calendar_images_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='calendar-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
COMMIT;
