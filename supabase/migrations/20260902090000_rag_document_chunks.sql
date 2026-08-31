-- File Path: /supabase/migrations/20260902090000_rag_document_chunks.sql
-- Status: NEW FILE
-- Description: Enables pgvector and adds document_chunks for RAG retrieval.
--              Each row is one chunk of an approved document version's text,
--              with its embedding. Embedding dimension (1536) matches
--              OpenAI's text-embedding-3-small — change it if you use a
--              different embedding model.

create extension if not exists vector;

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references document_versions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (document_version_id, chunk_index)
);

create index if not exists idx_document_chunks_org on document_chunks(organization_id);
create index if not exists idx_document_chunks_version on document_chunks(document_version_id);

-- Approximate nearest-neighbour index for cosine similarity search.
-- Run `analyze document_chunks;` after the first bulk ingestion so the
-- query planner has statistics to use it effectively.
create index if not exists idx_document_chunks_embedding
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table document_chunks enable row level security;

drop policy if exists "document_chunks_all_org" on document_chunks;
create policy "document_chunks_all_org" on document_chunks for all
  using (organization_id in (select user_org_ids()))
  with check (organization_id in (select user_org_ids()));
