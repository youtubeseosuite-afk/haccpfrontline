// File Path: /src/app/admin/tenants/actions.ts
// Status: UPDATE
// Description: Server actions for the Tenants page. setTenantStatus
// suspends/activates an org. New: createCustomerUser — creates a Supabase
// Auth user directly (service-role, no email/invite flow needed), creates
// the organization first if this is a new customer, and links the user via
// organization_members. Generates a temporary password and returns it once
// so it can be shown to the admin to pass along — it's never stored.

'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function setTenantStatus(orgId: string, status: 'active' | 'suspended') {
  await requireAdmin()

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('organizations')
    .update({ status })
    .eq('id', orgId)

  if (error) {
    throw new Error(`Failed to update tenant status: ${error.message}`)
  }

  revalidatePath('/admin/tenants')
}

function generateTempPassword(): string {
  return randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
}

type CreateCustomerInput = {
  organizationId: string | null
  newOrganizationName: string | null
  email: string
  role: 'owner' | 'admin' | 'member' | 'auditor_readonly'
}

type CreateCustomerResult = {
  error?: string
  success?: boolean
  email?: string
  password?: string
}

export async function createCustomerUser(
  input: CreateCustomerInput
): Promise<CreateCustomerResult> {
  await requireAdmin()

  if (!input.organizationId && !input.newOrganizationName) {
    return { error: 'Choose an existing organization or enter a name for a new one.' }
  }

  if (!input.email) {
    return { error: 'Email is required.' }
  }

  const supabase = createAdminClient()

  let organizationId = input.organizationId

  if (!organizationId && input.newOrganizationName) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: input.newOrganizationName })
      .select('id')
      .single()

    if (orgError || !org) {
      return { error: orgError?.message ?? 'Failed to create organization.' }
    }

    organizationId = org.id
  }

  const password = generateTempPassword()

  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
  })

  if (userError || !created?.user) {
    return { error: userError?.message ?? 'Failed to create user.' }
  }

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: organizationId,
    user_id: created.user.id,
    role: input.role,
  })

  if (memberError) {
    return { error: memberError.message }
  }

  revalidatePath('/admin/tenants')

  return { success: true, email: input.email, password }
}
