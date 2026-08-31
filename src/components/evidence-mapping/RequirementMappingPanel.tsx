// File Path: /src/components/evidence-mapping/RequirementMappingPanel.tsx
// Status: NEW FILE
// Description: Client-side interactive panel for mapping evidence documents
//              to standard requirements. Renders the requirement hierarchy,
//              flags each requirement Covered or Gap, and lets the user
//              create, update, or remove a mapping inline.

'use client'

import { useMemo, useState } from 'react'

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

export function RequirementMappingPanel({
  organizationId,
  requirements,
  documents,
  mappings: initialMappings,
}: Props) {
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mappingByRequirement = useMemo(() => {
    const map = new Map<string, Mapping>()
    for (const m of mappings) {
      map.set(m.requirement_id, m)
    }
    return map
  }, [mappings])

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
    setSavingId(requirementId)
    setError(null)

    try {
      const res = await fetch('/api/evidence-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          requirementId,
          documentId,
          coverageStatus,
        }),
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
      setSavingId(null)
    }
  }

  async function removeMapping(mappingId: string, requirementId: string) {
    setSavingId(requirementId)
    setError(null)

    try {
      const res = await fetch(`/api/evidence-mappings?id=${mappingId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const responseBody = await res.json()
        setError(responseBody.error ?? 'Failed to remove mapping')
        return
      }

      setMappings((prev) => prev.filter((m) => m.id !== mappingId))
    } finally {
      setSavingId(null)
    }
  }

  function renderRequirement(req: Requirement, depth: number) {
    const mapping = mappingByRequirement.get(req.id)
    const children = childrenOf(req.id)

    return (
      <div key={req.id} style={{ marginLeft: depth * 20, marginBottom: '0.75rem' }}>
        <div
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderLeft: `4px solid ${mapping ? '#2e7d32' : '#c62828'}`,
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{req.requirement_code}</strong>
            <span style={{ fontSize: '0.8rem', color: mapping ? '#2e7d32' : '#c62828' }}>
              {mapping ? 'Covered' : 'Gap'}
            </span>
          </div>
          <div>{req.title}</div>

          <MappingForm
            mapping={mapping}
            documents={documents}
            saving={savingId === req.id}
            onSave={(documentId, coverageStatus) =>
              saveMapping(req.id, documentId, coverageStatus)
            }
            onRemove={mapping ? () => removeMapping(mapping.id, req.id) : undefined}
          />
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
      <select
        value={documentId}
        onChange={(e) => setDocumentId(e.target.value)}
        style={{ flex: 1 }}
      >
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
