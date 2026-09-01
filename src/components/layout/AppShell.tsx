// File Path: /src/components/layout/AppShell.tsx
// Status: NEW FILE
// Description: Authenticated app chrome — a collapsible left sidebar plus a
// top nav bar, wrapping page content. Client component so the collapse
// state and sign-out button work; the auth check itself stays server-side
// wherever this is used (mirroring requireAdmin() for /admin), wired in via
// the (app) route-group layout added in Step 2 alongside moving the
// Dashboard page over. isAdmin is optional and only shows the Admin nav
// link when true — the caller passes it after checking is_platform_admin()
// server-side.

'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type NavItem = {
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [{ label: 'Dashboard', href: '/dashboard' }]

export function AppShell({
  children,
  userEmail,
  organizationName,
  isAdmin = false,
}: {
  children: ReactNode
  userEmail: string
  organizationName?: string
  isAdmin?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = isAdmin
    ? [...NAV_ITEMS, { label: 'Admin', href: '/admin/tenants' }]
    : NAV_ITEMS

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
            Q
          </div>
          {!collapsed && <span className="text-sm font-semibold text-slate-800">AI QMS</span>}
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="border-t border-slate-200 px-4 py-3 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          {collapsed ? '»' : '« Collapse'}
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            {organizationName && (
              <p className="text-sm font-medium text-slate-800">{organizationName}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{userEmail}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
