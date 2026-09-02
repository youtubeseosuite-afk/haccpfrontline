// File Path: /src/lib/ai/standardParsingTypes.ts
// Status: NEW FILE
// Description: Shape of the JSON the standard-parsing AI must return.
// Deliberately identical to StandardImportInput/RequirementInput in
// /src/app/admin/standards/actions.ts, so the eventual "Commit" step in the
// review UI can call the existing importStandard() action unchanged instead
// of duplicating the commit logic for AI-parsed standards.

export type ParsedRequirement = {
  code: string
  title: string
  description?: string | null
  children?: ParsedRequirement[]
}

export type ParsedStandard = {
  code: string
  name: string
  version?: string | null
  description?: string | null
  requirements: ParsedRequirement[]
}
