-- File Path: /supabase/migrations/20260831120000_phase1_qms_foundation_schema.sql
-- Status: NEW FILE
-- Description: Phase 1 data foundation for the AI-QMS Gap Analysis system.
--              Standards <-> Requirements <-> Documents <-> Evidence Mapping,
--              with organization-based multi-tenancy and RLS.
--              Standalone project — includes its own organizations/tenancy
--              layer, independent of any other QMS project.

-- =========================================================
-- 0. EXTENSIONS
-- =========================================================
create extension if not exists "pgcrypto";

-- =========================================================
-- 1. ORGANIZATIONS (multi-tenancy root)
-- =========================================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','auditor_readonly')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create or replace function user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from organization_members where user_id = auth.uid();
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;

drop policy if exists "organizations_select_members" on organizations;
create policy "organizations_select_members" on organizations for select
  using (id in (select user_org_ids()));

drop policy if exists "organization_members_select" on organization_members;
create policy "organization_members_select" on organization_members for select
  using (organization_id in (select user_org_ids()));

-- =========================================================
-- 2. STANDARDS
-- organization_id NULL = system-wide standard (ISO 9001, IFS, BRCGS)
-- organization_id set = customer's private/custom standard
-- =========================================================
create table if not exists standards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  code text not null,                 -- e.g. 'ISO9001:2015', 'IFS_FOOD_V8'
  name text not null,
  version text,
  description text,
  is_system_standard boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_standards_global_code
  on standards(code) where organization_id is null;

create unique index if not exists uq_standards_org_code
  on standards(organization_id, code) where organization_id is not null;

-- =========================================================
-- 3. STANDARD REQUIREMENTS
-- Self-referencing for clause hierarchy (e.g. 7.5 -> 7.5.3)
-- =========================================================
create table if not exists standard_requirements (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references standards(id) on delete cascade,
  parent_requirement_id uuid references standard_requirements(id) on delete cascade,
  requirement_code text not null,     -- e.g. '4.2.1', '7.5.3'
  title text not null,
  description text,
  risk_weight smallint not null default 1 check (risk_weight between 1 and 5),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (standard_id, requirement_code)
);

create index if not exists idx_standard_requirements_standard
  on standard_requirements(standard_id);
create index if not exists idx_standard_requirements_parent
  on standard_requirements(parent_requirement_id);

-- =========================================================
-- 4. DOCUMENTS + VERSIONS
-- documents = stable identity, document_versions = immutable history
-- =========================================================
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  document_type text not null default 'procedure'
    check (document_type in ('procedure','policy','record','form','plan','other')),
  chapter_number text,
  current_version_id uuid,            -- fk added below (circular dependency)
  owner_user_id uuid references auth.users(id),
  status text not null default 'draft'
    check (status in ('draft','in_review','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_org on documents(organization_id);

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version_number integer not null,
  storage_path text not null,         -- path in Supabase Storage bucket
  file_name text not null,
  mime_type text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','rejected','superseded')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  change_summary text,
  unique (document_id, version_number)
);

create index if not exists idx_document_versions_document
  on document_versions(document_id);

alter table documents
  drop constraint if exists fk_documents_current_version;
alter table documents
  add constraint fk_documents_current_version
  foreign key (current_version_id) references document_versions(id) on delete set null;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on documents;
create trigger trg_documents_updated_at
before update on documents
for each row execute function set_updated_at();

-- =========================================================
-- 5. EVIDENCE MAPPING (the junction layer)
-- source: manual | ai_suggested | ai_confirmed  <- used in Phase 3
-- =========================================================
create table if not exists evidence_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requirement_id uuid not null references standard_requirements(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  document_version_id uuid references document_versions(id) on delete set null,
  coverage_status text not null default 'full'
    check (coverage_status in ('full','partial','planned')),
  source text not null default 'manual'
    check (source in ('manual','ai_suggested','ai_confirmed')),
  notes text,
  mapped_by uuid references auth.users(id),
  mapped_at timestamptz not null default now(),
  unique (requirement_id, document_id)
);

create index if not exists idx_evidence_mappings_org on evidence_mappings(organization_id);
create index if not exists idx_evidence_mappings_requirement on evidence_mappings(requirement_id);
create index if not exists idx_evidence_mappings_document on evidence_mappings(document_id);

-- =========================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================
alter table standards enable row level security;
alter table standard_requirements enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table evidence_mappings enable row level security;

-- Standards: system standards visible to everyone; org standards to their own org
drop policy if exists "standards_select" on standards;
create policy "standards_select" on standards for select
  using (organization_id is null or organization_id in (select user_org_ids()));

drop policy if exists "standards_insert_own_org" on standards;
create policy "standards_insert_own_org" on standards for insert
  with check (organization_id in (select user_org_ids()));

drop policy if exists "standards_update_own_org" on standards;
create policy "standards_update_own_org" on standards for update
  using (organization_id in (select user_org_ids()));

drop policy if exists "standards_delete_own_org" on standards;
create policy "standards_delete_own_org" on standards for delete
  using (organization_id in (select user_org_ids()));

-- Requirements: inherit visibility from parent standard
drop policy if exists "requirements_select" on standard_requirements;
create policy "requirements_select" on standard_requirements for select
  using (
    standard_id in (
      select id from standards
      where organization_id is null or organization_id in (select user_org_ids())
    )
  );

drop policy if exists "requirements_modify_own_org" on standard_requirements;
create policy "requirements_modify_own_org" on standard_requirements for all
  using (standard_id in (select id from standards where organization_id in (select user_org_ids())))
  with check (standard_id in (select id from standards where organization_id in (select user_org_ids())));

-- Documents: fully org-scoped
drop policy if exists "documents_all_org" on documents;
create policy "documents_all_org" on documents for all
  using (organization_id in (select user_org_ids()))
  with check (organization_id in (select user_org_ids()));

-- Document versions: scoped via parent document's org
drop policy if exists "document_versions_all_org" on document_versions;
create policy "document_versions_all_org" on document_versions for all
  using (document_id in (select id from documents where organization_id in (select user_org_ids())))
  with check (document_id in (select id from documents where organization_id in (select user_org_ids())));

-- Evidence mappings: fully org-scoped
drop policy if exists "evidence_mappings_all_org" on evidence_mappings;
create policy "evidence_mappings_all_org" on evidence_mappings for all
  using (organization_id in (select user_org_ids()))
  with check (organization_id in (select user_org_ids()));
