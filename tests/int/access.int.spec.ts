import { describe, expect, it } from 'vitest'
import type { Access } from 'payload'

import {
  combineAccess,
  isAdmin,
  isAdminOrEditor,
  isPublishedOrAdmin,
  tenantFromUser,
} from '@/lib/access'

type User = Record<string, unknown> | null

// Minimal args shim — access fns only touch req.user.
const argsFor = (user: User) => ({ req: { user } }) as unknown as Parameters<Access>[0]

const admin = { role: 'admin' }
const editorA = { role: 'editor', tenant: { id: 1 } }
const editorNoTenant = { role: 'editor' }

describe('isAdmin', () => {
  it('true only for admin role', () => {
    expect(isAdmin(argsFor(admin))).toBe(true)
    expect(isAdmin(argsFor(editorA))).toBe(false)
    expect(isAdmin(argsFor(null))).toBe(false)
  })
})

describe('isAdminOrEditor', () => {
  it('true for admin and editor, false for anon', () => {
    expect(isAdminOrEditor(argsFor(admin))).toBe(true)
    expect(isAdminOrEditor(argsFor(editorA))).toBe(true)
    expect(isAdminOrEditor(argsFor(null))).toBe(false)
  })
})

describe('isPublishedOrAdmin', () => {
  it('staff see all statuses; anon constrained to published', () => {
    expect(isPublishedOrAdmin(argsFor(admin))).toBe(true)
    expect(isPublishedOrAdmin(argsFor(editorA))).toBe(true)
    expect(isPublishedOrAdmin(argsFor(null))).toEqual({ _status: { equals: 'published' } })
  })
})

describe('tenantFromUser', () => {
  it('admin → all tenants', () => {
    expect(tenantFromUser(argsFor(admin))).toBe(true)
  })
  it('anonymous → unconstrained (public published content)', () => {
    expect(tenantFromUser(argsFor(null))).toBe(true)
  })
  it('editor with tenant → Where clause scoped to that tenant', () => {
    expect(tenantFromUser(argsFor(editorA))).toEqual({ tenant: { equals: 1 } })
  })
  it('authenticated editor without a tenant → deny', () => {
    expect(tenantFromUser(argsFor(editorNoTenant))).toBe(false)
  })
})

describe('combineAccess', () => {
  it('any false → false', async () => {
    const fn = combineAccess(
      () => true,
      () => false,
    )
    expect(await fn(argsFor(admin))).toBe(false)
  })

  it('all true → true', async () => {
    const fn = combineAccess(
      () => true,
      () => true,
    )
    expect(await fn(argsFor(admin))).toBe(true)
  })

  it('single Where passes through unwrapped', async () => {
    const fn = combineAccess(
      () => true,
      () => ({ _status: { equals: 'published' } }),
    )
    expect(await fn(argsFor(null))).toEqual({ _status: { equals: 'published' } })
  })

  it('multiple Where clauses AND-merge', async () => {
    const fn = combineAccess(
      () => ({ _status: { equals: 'published' } }),
      () => ({ tenant: { equals: 1 } }),
    )
    expect(await fn(argsFor(null))).toEqual({
      and: [{ _status: { equals: 'published' } }, { tenant: { equals: 1 } }],
    })
  })

  it('Posts.read composition: editor A scoped to own tenant', async () => {
    const fn = combineAccess(isPublishedOrAdmin, tenantFromUser)
    expect(await fn(argsFor(editorA))).toEqual({ tenant: { equals: 1 } })
  })

  it('Posts.read composition: anonymous limited to published', async () => {
    const fn = combineAccess(isPublishedOrAdmin, tenantFromUser)
    expect(await fn(argsFor(null))).toEqual({ _status: { equals: 'published' } })
  })
})
