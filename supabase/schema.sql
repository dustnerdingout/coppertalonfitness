-- Copper Talon cloud sync: one row per signed in user holding the app's data.
-- Paste into Supabase > SQL Editor > New query, then Run. Safe to run more than once.

create table if not exists public.app_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row level security: each user can only see and change their own row
alter table public.app_data enable row level security;

drop policy if exists "Users read own data" on public.app_data;
create policy "Users read own data" on public.app_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own data" on public.app_data;
create policy "Users insert own data" on public.app_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own data" on public.app_data;
create policy "Users update own data" on public.app_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own data" on public.app_data;
create policy "Users delete own data" on public.app_data
  for delete to authenticated using ((select auth.uid()) = user_id);
