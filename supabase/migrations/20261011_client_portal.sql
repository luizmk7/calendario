-- Apply once in the SQL Editor of utkmkkmlvdanojnunmft.
-- Additive migration: existing companies, posts, notes and image paths are preserved.
BEGIN;
ALTER TABLE public.calendar_posts ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '' CHECK (length(topic)<=250);
ALTER TABLE public.calendar_posts ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 100);
ALTER TABLE public.calendar_posts ADD COLUMN IF NOT EXISTS published_quantity integer;
UPDATE public.calendar_posts SET published_quantity=CASE WHEN published=1 THEN quantity ELSE 0 END WHERE published_quantity IS NULL;
ALTER TABLE public.calendar_posts ALTER COLUMN published_quantity SET DEFAULT 0;
ALTER TABLE public.calendar_posts ALTER COLUMN published_quantity SET NOT NULL;
ALTER TABLE public.calendar_posts DROP CONSTRAINT IF EXISTS calendar_posts_published_quantity_check;
ALTER TABLE public.calendar_posts ADD CONSTRAINT calendar_posts_published_quantity_check CHECK (published_quantity BETWEEN 0 AND quantity);
ALTER TABLE public.calendar_posts DROP CONSTRAINT IF EXISTS calendar_posts_time_check;
ALTER TABLE public.calendar_posts ADD CONSTRAINT calendar_posts_time_check CHECK (time='' OR time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE public.calendar_posts ALTER COLUMN time SET DEFAULT '';

-- Workspaces already initialized before migration remain managers. New accounts
-- never provision a workspace by themselves; only SQL administrators may do so.
REVOKE INSERT ON public.calendar_workspaces FROM authenticated;
DROP POLICY IF EXISTS calendar_workspace_insert ON public.calendar_workspaces;
CREATE OR REPLACE FUNCTION public.initialize_calendar() RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.calendar_workspaces WHERE user_id=auth.uid()) THEN
  RAISE EXCEPTION 'Acesso ainda não vinculado.' USING ERRCODE='42501';
 END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.calendar_is_manager() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.calendar_workspaces WHERE user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.calendar_is_manager() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.calendar_is_manager() TO authenticated;
DROP POLICY IF EXISTS calendar_companies_owner ON public.calendar_companies;
CREATE POLICY calendar_companies_owner ON public.calendar_companies FOR ALL TO authenticated
 USING (user_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()))
 WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()));
DROP POLICY IF EXISTS calendar_posts_owner ON public.calendar_posts;
CREATE POLICY calendar_posts_owner ON public.calendar_posts FOR ALL TO authenticated
 USING (user_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()))
 WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()));

CREATE TABLE IF NOT EXISTS public.calendar_client_access (
 client_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES public.calendar_workspaces(user_id) ON DELETE CASCADE,
 company_id text NOT NULL,
 email text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(owner_id,company_id) REFERENCES public.calendar_companies(user_id,id) ON DELETE CASCADE,
 CHECK(client_id<>owner_id)
);
ALTER TABLE public.calendar_client_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_client_access FROM PUBLIC,anon,authenticated;
GRANT SELECT,DELETE ON public.calendar_client_access TO authenticated;
DROP POLICY IF EXISTS calendar_access_read ON public.calendar_client_access;
CREATE POLICY calendar_access_read ON public.calendar_client_access FOR SELECT TO authenticated USING (owner_id=(SELECT auth.uid()) OR client_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS calendar_access_revoke ON public.calendar_client_access;
CREATE POLICY calendar_access_revoke ON public.calendar_client_access FOR DELETE TO authenticated USING(owner_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()));

CREATE TABLE IF NOT EXISTS public.calendar_internal_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid(),
 company_id text NOT NULL,
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000),
 date date,
 resolved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(owner_id,company_id) REFERENCES public.calendar_companies(user_id,id) ON DELETE CASCADE
);
ALTER TABLE public.calendar_internal_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_internal_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.calendar_internal_notes TO authenticated;
DROP POLICY IF EXISTS calendar_notes_owner ON public.calendar_internal_notes;
CREATE POLICY calendar_notes_owner ON public.calendar_internal_notes FOR ALL TO authenticated
 USING (owner_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()))
 WITH CHECK (owner_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()));

CREATE TABLE IF NOT EXISTS public.calendar_client_news (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 company_id text NOT NULL,
 author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000),
 date date,
 resolved boolean NOT NULL DEFAULT false,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(owner_id,company_id) REFERENCES public.calendar_companies(user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS calendar_news_company ON public.calendar_client_news(owner_id,company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS calendar_notes_company ON public.calendar_internal_notes(owner_id,company_id,created_at DESC);
ALTER TABLE public.calendar_client_news ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_client_news FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.calendar_client_news TO authenticated;
GRANT UPDATE(resolved,read_at) ON public.calendar_client_news TO authenticated;
DROP POLICY IF EXISTS calendar_news_read ON public.calendar_client_news;
CREATE POLICY calendar_news_read ON public.calendar_client_news FOR SELECT TO authenticated USING (
 owner_id=(SELECT auth.uid()) OR EXISTS(SELECT 1 FROM public.calendar_client_access a WHERE a.client_id=(SELECT auth.uid()) AND a.owner_id=calendar_client_news.owner_id AND a.company_id=calendar_client_news.company_id)
);
DROP POLICY IF EXISTS calendar_news_send ON public.calendar_client_news;
CREATE POLICY calendar_news_send ON public.calendar_client_news FOR INSERT TO authenticated WITH CHECK (
 author_id=(SELECT auth.uid()) AND resolved=false AND read_at IS NULL AND EXISTS(SELECT 1 FROM public.calendar_client_access a WHERE a.client_id=(SELECT auth.uid()) AND a.owner_id=calendar_client_news.owner_id AND a.company_id=calendar_client_news.company_id)
);
DROP POLICY IF EXISTS calendar_news_manage ON public.calendar_client_news;
CREATE POLICY calendar_news_manage ON public.calendar_client_news FOR UPDATE TO authenticated USING(owner_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager())) WITH CHECK(owner_id=(SELECT auth.uid()) AND (SELECT public.calendar_is_manager()));

-- Clients never receive SELECT on the owner's posts (legacy notes/image stay private).
-- This narrowly scoped RPC exposes only the agreed planning fields.
CREATE OR REPLACE FUNCTION public.calendar_client_posts(p_start date,p_end date)
RETURNS TABLE(id text,"companyId" text,title text,date date,format text,topic text,quantity integer,"publishedQuantity" integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.id,p.company_id,p.title,p.date,p.format,p.topic,p.quantity,p.published_quantity
 FROM public.calendar_posts p JOIN public.calendar_client_access a ON a.owner_id=p.user_id AND a.company_id=p.company_id
 WHERE a.client_id=auth.uid() AND p.date>=p_start AND p.date<=p_end AND p_end-p_start BETWEEN 0 AND 62
 ORDER BY p.date,p.id;
$$;
CREATE OR REPLACE FUNCTION public.calendar_client_company()
RETURNS TABLE(id text,name text,color text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT c.id,c.name,c.color FROM public.calendar_companies c JOIN public.calendar_client_access a ON a.owner_id=c.user_id AND a.company_id=c.id WHERE a.client_id=auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.calendar_link_client(p_email text,p_company_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_id uuid; target_email text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.calendar_workspaces WHERE user_id=auth.uid()) OR NOT EXISTS(SELECT 1 FROM public.calendar_companies WHERE user_id=auth.uid() AND id=p_company_id) THEN
  RAISE EXCEPTION 'Sem permissão para esta empresa.' USING ERRCODE='42501';
 END IF;
 SELECT id,email INTO target_id,target_email FROM auth.users WHERE lower(email)=lower(trim(p_email)) AND email_confirmed_at IS NOT NULL;
 IF target_id IS NULL THEN RAISE EXCEPTION 'Crie e confirme a conta do cliente no Supabase antes de vincular.'; END IF;
 IF EXISTS(SELECT 1 FROM public.calendar_workspaces WHERE user_id=target_id) THEN RAISE EXCEPTION 'Esta conta já é gestora. Use uma conta exclusiva para o cliente.'; END IF;
 -- Never silently transfer a client between companies or managers.
 INSERT INTO public.calendar_client_access(client_id,owner_id,company_id,email) VALUES(target_id,auth.uid(),p_company_id,target_email);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Este cliente já possui vínculo. Remova o acesso anterior antes de vincular novamente.';
END; $$;
REVOKE ALL ON FUNCTION public.calendar_client_posts(date,date),public.calendar_client_company(),public.calendar_link_client(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.calendar_client_posts(date,date),public.calendar_client_company(),public.calendar_link_client(text,text) TO authenticated;

-- Keep the legacy API's boolean and the new partial progress consistent.
CREATE OR REPLACE FUNCTION public.calendar_sync_progress() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.published=1 AND NEW.published_quantity=0 THEN NEW.published_quantity:=NEW.quantity; END IF;
 ELSIF NEW.published IS DISTINCT FROM OLD.published AND NEW.published_quantity IS NOT DISTINCT FROM OLD.published_quantity THEN
  NEW.published_quantity:=CASE WHEN NEW.published=1 THEN NEW.quantity ELSE 0 END;
 END IF;
 NEW.published:=CASE WHEN NEW.published_quantity=NEW.quantity THEN 1 ELSE 0 END;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.calendar_sync_progress() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS calendar_sync_progress ON public.calendar_posts;
CREATE TRIGGER calendar_sync_progress BEFORE INSERT OR UPDATE ON public.calendar_posts FOR EACH ROW EXECUTE FUNCTION public.calendar_sync_progress();
COMMIT;
