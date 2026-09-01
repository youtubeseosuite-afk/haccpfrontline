// File Path: /src/app/admin/standards/ImportStandardForm.tsx
// Status: NEW FILE
// Description: Textarea + submit for pasting a standard's JSON and calling
// importStandard(). Uses useFormState/useFormStatus (React 18 / Next 14) to
// show the success/error message the action returns without a page reload.

'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { importStandard } from './actions'

type FormState = { error?: string; success?: boolean; requirementCount?: number }

const initialState: FormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? 'Importing…' : 'Import standard'}
    </button>
  )
}

export function ImportStandardForm() {
  const [state, formAction] = useFormState<FormState, FormData>(async (_prev, formData) => {
    const rawJson = (formData.get('json') as string) ?? ''
    return importStandard(rawJson)
  }, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="json"
        rows={12}
        required
        placeholder='{"code": "ISO9001:2015", "name": "ISO 9001:2015", "requirements": [{"code": "4", "title": "Context of the Organization", "children": [{"code": "4.1", "title": "..."}]}]}'
        className="w-full rounded-md border border-slate-300 p-3 font-mono text-xs"
      />
      <SubmitButton />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-600">
          Imported successfully — {state.requirementCount} requirements added.
        </p>
      )}
    </form>
  )
}
