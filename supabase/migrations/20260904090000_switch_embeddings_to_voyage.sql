-- File Path: /supabase/migrations/20260904090000_switch_embeddings_to_voyage.sql
-- Status: NEW FILE
-- Description: Switches embedding dimension from 1536 (OpenAI
--              text-embedding-3-small) to 1024 (Voyage AI voyage-3.5,
--              Anthropic's recommended embeddings partner). Safe to run
--              even if rows already exist — they're cleared, since
--              embeddings from the old provider/dimension are incompatible
--              anyway and nothing has gone through Voyage yet.

drop index if exists idx_document_chunks_embedding;
delete from document_chunks;
alter table document_chunks alter column embedding type vector(1024);

create index if not exists idx_document_chunks_embedding
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Same function, updated to accept a 1024-dim query vector.
create or replace function match_document_chunks(
  p_document_version_id uuid,
  p_query_embedding vector(1024),
  p_match_count int default 5
)
returns table(chunk_id uuid, content text, similarity float)
language sql
stable
as $$
  select
    dc.id as chunk_id,
    dc.content,
    1 - (dc.embedding <=> p_query_embedding) as similarity
  from document_chunks dc
  where dc.document_version_id = p_document_version_id
  order by dc.embedding <=> p_query_embedding
  limit p_match_count;
$$;
