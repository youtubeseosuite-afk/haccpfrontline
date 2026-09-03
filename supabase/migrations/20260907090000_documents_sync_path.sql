-- File Path: /supabase/migrations/20260907090000_documents_sync_path.sql
-- Status: NEW FILE
-- Description: Adds sync_path — the file's stable relative path within
-- the customer's synced folder, used by the Local Sync Agent to identify
-- "is this the same file as before" across runs and machines. Matching on
-- title alone would risk collisions with manually-uploaded documents that
-- happen to share a filename; sync_path is a separate, explicit identity
-- only ever set by the sync upload endpoint. The partial unique index
-- (only enforced where sync_path is not null) keeps manually-uploaded
-- documents, which never set this column, unaffected.

alter table documents add column if not exists sync_path text;

create unique index if not exists idx_documents_org_sync_path
  on documents(organization_id, sync_path)
  where sync_path is not null;
