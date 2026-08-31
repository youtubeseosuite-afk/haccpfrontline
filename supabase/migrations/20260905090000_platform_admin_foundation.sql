-- File Path: /supabase/migrations/20260905090000_platform_admin_foundation.sql
-- Status: NEW FILE
-- Description: Phase 5 foundation. platform_admins + is_platform_admin()
--              mirror the user_org_ids() pattern but for platform-level
--              access, entirely separate from organization_members roles.
--              ai_usage_events logs token/cost per AI call for the admin
--              cost dashboard — tenants can write their own org's rows
--              (the AI routes run under the tenant's session) but nothing
--              in the anon-key path can read them back; admin reads go
--              through the service-role client, which bypasses RLS.
--              organizations.status lets the admin panel suspend a tenant.

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

drop policy if exists "platform_admins_self_read" on platform_admins;
create policy "platform_admins_self_read" on platform_admins for select
  using (user_id = auth.uid());

create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null check (event_type in ('gap_analysis', 'ai_draft', 'embedding')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_events_org on ai_usage_events(organization_id);
create index if not exists idx_ai_usage_events_created_at on ai_usage_events(created_at);

alter table ai_usage_events enable row level security;

-- Tenants can log their own org's usage (the AI routes run under the
-- tenant's session) but there is deliberately no select policy — reading
-- this table happens only via the service-role client in admin routes.
drop policy if exists "ai_usage_events_insert_own_org" on ai_usage_events;
create policy "ai_usage_events_insert_own_org" on ai_usage_events for insert
  with check (organization_id in (select user_org_ids()));

alter table organizations
  add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended'));
