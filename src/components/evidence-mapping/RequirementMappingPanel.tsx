// File Path: /src/components/evidence-mapping/RequirementMappingPanel.tsx
// Status: UPDATE
// Description: Client-side interactive panel for mapping evidence documents
//              to standard requirements. Status per requirement is now
//              Covered (full coverage + approved document) / In progress
//              (a mapping exists but isn't full+approved yet, including
//              AI-drafted-but-unreviewed documents) / Gap (no mapping).
//              Gaps get an "AI Draft" button that generates a draft
//              procedure via /api/requirements/[id]/draft and refreshes.

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Requirement = {
  id: string
  requirement_code: string
  title: string
  description: string | null
  parent_requirement_id: string | null
  sort_order: number
}

type DocumentOption = {
  id: string
  title: string
  status: string
  current_version_id: string | null
}

type Mapping = {
  id: string
  requirement_id: string
  document_id: string
  coverage_status: 'full' | 'partial' | 'planned'
  notes: string | null
}

type Props = {
  organizationId: string
  requirements: Requirement[]
  documents: DocumentOption[]
  mappings: Mapping[]
}

type RequirementStatus = 'covered' | 'in_progress' | 'gap'

const STATUS_LABEL: Record<RequirementStatus, string> = {
  covered: 'Covered',
  in_progress: 'In progress',
  gap: 'Gap',
}

const STATUS_COLOR: Record<RequirementStatus, string> = {
  covered: '#2e7d32',
  in_progress: '#f9a825',
  gap: '#c62828',
}

export function RequirementMappingPanel({
  organizationId,
  requirements,
  documents,
  mappings: initialMappings,
}: Props) {
  const router = useRouter()

  const [mappings, setMappings] = useState<Mapping[]>(initialMappings)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mappingByRequirement = useMemo(() => {
    const map = new Map<string, Mapping>()
    for (const m of mappings) {
      map.set(m.requirement_id, m)
    }
    return map
  }, [mappings])

  const documentById = useMemo(() => {
    const map = new Map<string, DocumentOption>()
    for (const d of documents) {
      map.set(d.id, d)
    }
    return map
  }, [documents])

  function statusFor(mapping: Mapping | undefined): RequirementStatus {
    if (!mapping) return 'gap'
    const doc = documentById.get(mapping.document_id)
    if (mapping.coverage_status === 'full' && doc?.status === 'approved') {
      return 'covered'
    }
    return 'in_progress'
  }

  const topLevel = requirements
    .filter((r) => !r.parent_requirement_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const childrenOf = (parentId: string) =>
    requirements
      .filter((r) => r.parent_requirement_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)

  async function saveMapping(
    requirementId: string,
    documentId: string,
    coverageStatus: Mapping['coverage_status']
  ) {
    setBusyId(requirementId)
    setError(null)

    try {
      const res = await fetch('/api/evidence-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, requirementId, documentId, coverageStatus }),
      })

      const responseBody = await res.json()

      if (!res.ok) {
        setError(responseBody.error ?? 'Failed to save mapping')
        return
      }

      setMappings((prev) => {
        const next = prev.filter((m) => m.requirement_id !== requirementId)
        next.push(responseBody.mapping)
        return next
      })
    } finally {
      setBusyId(null)
    }
  }

  async function removeMapping(mappingId: string, requirementId: string) {
    setBusyId(requirementId)
    setError(null)

    try {
      const res = await fetch(`/api/evidence-mappings?id=${mappingId}`, { method: 'DELETE' })

      if (!res.ok) {
        const responseBody = await res.json()
        setError(responseBody.error ?? 'Failed to remove mapping')
        return
      }

      setMappings((prev) => prev.filter((m) => m.id !== mappingId))
    } finally {
      setBusyId(null)
    }
  }

  async function aiDraft(requirementId: string) {
    setBusyId(requirementId)
    setError(null)

    try {
      const res = await fetch(`/api/requirements/${requirementId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      const responseBody = await res.json()

      if (!res.ok) {
        setError(responseBody.error ?? 'Failed to generate draft')
        return
      }

      // A new document was created server-side; refresh so this page's
      // server-fetched documents/mappings pick it up.
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  function renderRequirement(req: Requirement, depth: number) {
    const mapping = mappingByRequirement.get(req.id)
    const status = statusFor(mapping)
    const children = childrenOf(req.id)

    return (
      <div key={req.id} style={{ marginLeft: depth * 20, marginBottom: '0.75rem' }}>
        <div
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderLeft: `4px solid ${STATUS_COLOR[status]}`,
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{req.requirement_code}</strong>
            <span style={{ fontSize: '0.8rem', color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <div>{req.title}</div>

          <MappingForm
            mapping={mapping}
            documents={documents}
            saving={busyId === req.id}
            onSave={(documentId, coverageStatus) => saveMapping(req.id, documentId, coverageStatus)}
            onRemove={mapping ? () => removeMapping(mapping.id, req.id) : undefined}
          />

          {status === 'gap' && (
            <button
              disabled={busyId === req.id}
              onClick={() => aiDraft(req.id)}
              style={{ marginTop: '0.5rem' }}
            >
              {busyId === req.id ? 'Drafting…' : 'AI Draft this gap'}
            </button>
          )}
        </div>

        {children.map((child) => renderRequirement(child, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}
      {topLevel.map((req) => renderRequirement(req, 0))}
    </div>
  )
}

function MappingForm({
  mapping,
  documents,
  saving,
  onSave,
  onRemove,
}: {
  mapping: Mapping | undefined
  documents: DocumentOption[]
  saving: boolean
  onSave: (documentId: string, coverageStatus: Mapping['coverage_status']) => void
  onRemove?: () => void
}) {
  const [documentId, setDocumentId] = useState(mapping?.document_id ?? '')
  const [coverageStatus, setCoverageStatus] = useState<Mapping['coverage_status']>(
    mapping?.coverage_status ?? 'full'
  )

  return (
    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} style={{ flex: 1 }}>
        <option value="">Select a document…</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.title}{doc.status !== 'approved' ? ` (${doc.status})` : ''}
          </option>
        ))}
      </select>

      <select
        value={coverageStatus}
        onChange={(e) => setCoverageStatus(e.target.value as Mapping['coverage_status'])}
      >
        <option value="full">Full</option>
        <option value="partial">Partial</option>
        <option value="planned">Planned</option>
      </select>

      <button disabled={!documentId || saving} onClick={() => onSave(documentId, coverageStatus)}>
        {mapping ? 'Update' : 'Map'}
      </button>

      {onRemove && (
        <button disabled={saving} onClick={onRemove}>
          Remove
        </button>
      )}
    </div>
  )
}
