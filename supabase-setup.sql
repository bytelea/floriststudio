-- Florist Studio: private, per-user cloud workspace
-- Run this once in Supabase Dashboard > SQL Editor > New query.

create table if not exists public.workspace_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace_snapshots enable row level security;

revoke all on table public.workspace_snapshots from anon;
grant select, insert, update, delete on table public.workspace_snapshots to authenticated;

drop policy if exists "Users can read their own workspace" on public.workspace_snapshots;
create policy "Users can read their own workspace"
on public.workspace_snapshots for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own workspace" on public.workspace_snapshots;
create policy "Users can create their own workspace"
on public.workspace_snapshots for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own workspace" on public.workspace_snapshots;
create policy "Users can update their own workspace"
on public.workspace_snapshots for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own workspace" on public.workspace_snapshots;
create policy "Users can delete their own workspace"
on public.workspace_snapshots for delete
to authenticated
using ((select auth.uid()) = user_id);
