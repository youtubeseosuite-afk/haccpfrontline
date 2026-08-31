-- File Path: /supabase/migrations/20260901090000_compliance_score_function.sql
-- Status: NEW FILE
-- Description: compliance_score(org, standard) returns total_requirements and
--              covered_requirements for that org/standard pair. "Covered"
--              means a full-coverage evidence mapping to an approved
--              document. security invoker (default) — RLS on the underlying
--              tables still applies as the calling user, so this can't leak
--              another org's mapping data.

create or replace function compliance_score(
  p_organization_id uuid,
  p_standard_id uuid
)
returns table(total_requirements bigint, covered_requirements bigint)
language sql
stable
as $$
  select
    count(distinct sr.id) as total_requirements,
    count(distinct case
      when em.coverage_status = 'full' and doc.status = 'approved' then sr.id
    end) as covered_requirements
  from standard_requirements sr
  left join evidence_mappings em
    on em.requirement_id = sr.id
    and em.organization_id = p_organization_id
  left join documents doc
    on doc.id = em.document_id
  where sr.standard_id = p_standard_id;
$$;
