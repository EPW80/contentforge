import { describe, expect, it } from 'vitest'
import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

import { enforceTenantOnWrite } from '@/lib/access'

type User = Record<string, unknown> | null
type HookArgs = Parameters<CollectionBeforeValidateHook>[0]

// Minimal args shim — the hook only touches req.user, data, and operation.
const argsFor = (
  user: User,
  data: Record<string, unknown> | undefined,
  operation: 'create' | 'update',
) => ({ req: { user }, data, operation }) as unknown as HookArgs

const admin = { role: 'admin' }
const editorA = { role: 'editor', tenant: { id: 1 } }
const editorAFlat = { role: 'editor', tenant: 1 }
const editorNoTenant = { role: 'editor' }

describe('enforceTenantOnWrite', () => {
  it('forces the editor tenant on create, ignoring submitted tenant', () => {
    const result = enforceTenantOnWrite(argsFor(editorA, { title: 'x', tenant: 2 }, 'create'))
    expect(result).toEqual({ title: 'x', tenant: 1 })
  })

  it('forces the editor tenant on update, ignoring submitted tenant', () => {
    const result = enforceTenantOnWrite(argsFor(editorA, { tenant: 2 }, 'update'))
    expect(result).toEqual({ tenant: 1 })
  })

  it('handles a non-populated (scalar) user tenant', () => {
    const result = enforceTenantOnWrite(argsFor(editorAFlat, { tenant: 2 }, 'create'))
    expect(result).toEqual({ tenant: 1 })
  })

  it('fills the tenant when the editor omits it', () => {
    const result = enforceTenantOnWrite(argsFor(editorA, { title: 'x' }, 'create'))
    expect(result).toEqual({ title: 'x', tenant: 1 })
  })

  it('admin may set any tenant (data passes through)', () => {
    const data = { title: 'x', tenant: 2 }
    expect(enforceTenantOnWrite(argsFor(admin, data, 'create'))).toBe(data)
  })

  it('editor without a tenant → 403 APIError', () => {
    expect(() => enforceTenantOnWrite(argsFor(editorNoTenant, { tenant: 2 }, 'create'))).toThrow(
      APIError,
    )
    try {
      enforceTenantOnWrite(argsFor(editorNoTenant, { tenant: 2 }, 'create'))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect((error as APIError).status).toBe(403)
    }
  })

  it('undefined data passes through', () => {
    expect(enforceTenantOnWrite(argsFor(editorA, undefined, 'create'))).toBeUndefined()
  })

  it('unauthenticated user passes through (access fns reject the write)', () => {
    const data = { tenant: 2 }
    expect(enforceTenantOnWrite(argsFor(null, data, 'create'))).toBe(data)
  })
})
