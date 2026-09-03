-- File Path: /supabase/migrations/20260906090000_sync_tokens.sql
-- Status: NEW FILE
-- Description: Per-organization tokens for the Local Sync Agent to
-- authenticate with, entirely separate from normal Supabase Auth sessions
-- (the agent runs unattended via cron/Task Scheduler, not as a logged-in
-- user). Only token_hash (SHA-256) is stored — the raw token is generated,
-- shown once to the admin, and never persisted, same principle as a
-- password. No RLS policies are defined: only the service-role client ever
-- touches this table (admin generate/revoke in /admin/tenants, and
-- validation in the sync upload endpoint), so RLS defaults to deny for
-- every other role.

create table if not exists sync_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  token_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table sync_tokens enable row level security;

create index if not exists idx_sync_tokens_organization_id on sync_tokens(organization_id);
