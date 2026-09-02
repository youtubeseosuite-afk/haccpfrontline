-- File Path: /supabase/migrations/20260903090000_risk_analysis_module.sql
-- Status: NEW FILE
-- Description: Two tables. organization_modules is a generic
-- module-entitlement system — which optional modules an org has, plus a
-- config jsonb for module-specific settings — built generic so future
-- optional modules (not just risk analysis) reuse this same table instead
-- of a bespoke on/off column each time. risks is the risk register itself,
-- supporting BOTH scoring methodologies per the org's chosen config:
-- 'simple_matrix' (likelihood x severity, 1-5 each) or 'fmea' (severity x
-- occurrence x detection = RPN, 1-10 each, standard FMEA scales).
-- methodology is copied onto each risk at creation time so a risk keeps
-- its original meaning even if the org's module config changes later;
-- columns unused by that risk's methodology stay null.

create table if not exists organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  module_key text not null,
  config jsonb not null default '{}'::jsonb,
  enabled_at timestamptz not null default now(),
  enabled_by uuid references auth.users(id),
  unique (organization_id, module_key)
);

alter table organization_modules enable row level security;

-- Org members can read their own org's entitlements (needed so server-side
-- gates and the sidebar can check "do we have this module" without the
-- service-role client). Only the service-role client writes here (admin
-- enable/disable via /admin/tenants), so there's no insert/update/delete
-- policy for regular tenant sessions.
drop policy if exists "organization_modules_select_own_org" on organization_modules;
create policy "organization_modules_select_own_org" on organization_modules for select
  using (organization_id in (select user_org_ids()));

create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  category text,
  methodology text not null check (methodology in ('simple_matrix', 'fmea')),
  likelihood smallint check (likelihood between 1 and 5),
  severity smallint check (severity between 1 and 10),
  occurrence smallint check (occurrence between 1 and 10),
  detection smallint check (detection between 1 and 10),
  risk_score integer,
  mitigation_plan text,
  status text not null default 'open' check (status in ('open', 'mitigating', 'closed')),
  owner_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table risks enable row level security;

drop policy if exists "risks_all_own_org" on risks;
create policy "risks_all_own_org" on risks for all
  using (organization_id in (select user_org_ids()))
  with check (organization_id in (select user_org_ids()));

create index if not exists idx_risks_organization_id on risks(organization_id);

-- Reuses the set_updated_at() function already defined for documents in
-- the Phase 1 migration.
drop trigger if exists trg_risks_updated_at on risks;
create trigger trg_risks_updated_at
before update on risks
for each row execute function set_updated_at();
