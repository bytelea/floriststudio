-- Run after supabase-complete-setup.sql. Results should show three tables,
-- RLS enabled, the florist-images bucket, and policies.
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('workspace_snapshots','user_profiles','privacy_audit_log')
order by tablename;

select id, name, public, file_size_limit from storage.buckets where id='florist-images';

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where (schemaname='public' and tablename in ('workspace_snapshots','user_profiles','privacy_audit_log'))
   or (schemaname='storage' and tablename='objects' and policyname like 'images_%')
order by schemaname, tablename, policyname;
