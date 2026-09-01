// File Path: /src/components/evidence-mapping/RequirementMappingPanel.tsx
// Status: UPDATE
// Description: Client-side interactive panel for mapping evidence documents
// to standard requirements, rendered as a collapsible accordion tree. Status
// per requirement is Compliant (full coverage + approved document) /
// Partial Gap (a mapping exists but isn't full+approved yet, including
// AI-drafted-but-unreviewed documents) / Critical Gap (no mapping). Gaps get
// an "AI Draft" button that generates a draft procedure via
// /api/requirements/[id]/draft and refreshes. Now also links each
// requirement's code to its Analysis View (/requirements/[id]) so the
// split-screen evidence + AI-conclusion panel is reachable from the
// checklist. Top-level requirements open by default; nested children start
// collapsed.

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  covered: 'Compliant',
  in_progress: 'Partial Gap',
  gap: 'Critical Gap',
}

const STATUS_CLASSES: Record<RequirementStatus, { border: string; badge: string }> = {
  covered: { border: 'border-l-green-500', badge: 'bg-green-100 text-green-700' },
  in_progress: { border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700' },
  gap: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700' },
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

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {topLevel.map((req) => (
        <RequirementNode
          key={req.id}
          requirement={req}
          depth={0}
          childrenOf={childrenOf}
          mappingByRequirement={mappingByRequirement}
          status={statusFor(mappingByRequirement.get(req.id))}
          statusFor={statusFor}
          documents={documents}
          busyId={busyId}
          onSave={saveMapping}
          onRemove={removeMapping}
          onAiDraft={aiDraft}
        />
      ))}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RequirementNode({
  requirement,
  depth,
  childrenOf,
  mappingByRequirement,
  status,
  statusFor,
  documents,
  busyId,
  onSave,
  onRemove,
  onAiDraft,
}: {
  requirement: Requirement
  depth: number
  childrenOf: (parentId: string) => Requirement[]
  mappingByRequirement: Map<string, Mapping>
  status: RequirementStatus
  statusFor: (mapping: Mapping | undefined) => RequirementStatus
  documents: DocumentOption[]
  busyId: string | null
  onSave: (
    requirementId: string,
    documentId: string,
    coverageStatus: Mapping['coverage_status']
  ) => void
  onRemove: (mappingId: string, requirementId: string) => void
  onAiDraft: (requirementId: string) => void
}) {
  const children = childrenOf(requirement.id)
  const hasChildren = children.length > 0
  const [expanded, setExpanded] = useState(depth === 0)
  const mapping = mappingByRequirement.get(requirement.id)
  const { border, badge } = STATUS_CLASSES[status]

  return (
    <div className={depth > 0 ? 'ml-5 border-l border-slate-200 pl-4' : ''}>
      <div
        className={`rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm ${border}`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => hasChildren && setExpanded((e) => !e)}
            className={`flex flex-1 items-start gap-2 text-left ${
              hasChildren ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {hasChildren ? (
              <span className="mt-0.5">
                <ChevronIcon open={expanded} />
              </span>
            ) : (
              <span className="mt-0.5 w-4" />
            )}
            <span>
              <span className="font-medium text-slate-900">{requirement.requirement_code}</span>{' '}
              <span className="text-slate-700">{requirement.title}</span>
              {requirement.description && (
                <p className="mt-1 text-sm text-slate-500">{requirement.description}</p>
              )}
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/requirements/${requirement.id}`}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Analyze →
            </Link>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        <MappingForm
          mapping={mapping}
          documents={documents}
          saving={busyId === requirement.id}
          onSave={(documentId, coverageStatus) =>
            onSave(requirement.id, documentId, coverageStatus)
          }
          onRemove={mapping ? () => onRemove(mapping.id, requirement.id) : undefined}
        />

        {status === 'gap' && (
          <button
            disabled={busyId === requirement.id}
            onClick={() => onAiDraft(requirement.id)}
            className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busyId === requirement.id ? 'Drafting…' : 'AI Draft this gap'}
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="mt-3 space-y-3">
          {children.map((child) => (
            <RequirementNode
              key={child.id}
              requirement={child}
              depth={depth + 1}
              childrenOf={childrenOf}
              mappingByRequirement={mappingByRequirement}
              status={statusFor(mappingByRequirement.get(child.id))}
              statusFor={statusFor}
              documents={documents}
              busyId={busyId}
              onSave={onSave}
              onRemove={onRemove}
              onAiDraft={onAiDraft}
            />
          ))}
        </div>
      )}
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
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select
        value={documentId}
        onChange={(e) => setDocumentId(e.target.value)}
        className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        <option value="">Select a document…</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.title}
            {doc.status !== 'approved' ? ` (${doc.status})` : ''}
          </option>
        ))}
      </select>

      <select
        value={coverageStatus}
        onChange={(e) => setCoverageStatus(e.target.value as Mapping['coverage_status'])}
        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        <option value="full">Full</option>
        <option value="partial">Partial</option>
        <option value="planned">Planned</option>
      </select>

      <button
        disabled={!documentId || saving}
        onClick={() => onSave(documentId, coverageStatus)}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {mapping ? 'Update' : 'Map'}
      </button>

      {onRemove && (
        <button
          disabled={saving}
          onClick={onRemove}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Remove
        </button>
      )}
    </div>
  )
}
