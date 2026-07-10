import { describe, expect, it } from 'vitest'

import { enforceTenantOnWrite } from '@/lib/access'
import { Authors } from '@/collections/Authors'
import { Media } from '@/collections/Media'
import { Posts } from '@/collections/Posts'

// Access `Where` clauses are inert on `create` (see src/lib/access.ts), so
// every tenant-scoped collection MUST wire enforceTenantOnWrite in
// hooks.beforeValidate. This guards against the hook existing but not being
// attached — a hole access-function unit tests cannot catch.
describe.each([
  ['posts', Posts],
  ['authors', Authors],
  ['media', Media],
])('%s collection', (_slug, collection) => {
  it('wires enforceTenantOnWrite in beforeValidate', () => {
    expect(collection.hooks?.beforeValidate).toContain(enforceTenantOnWrite)
  })

  it('has a required tenant relationship field', () => {
    const tenantField = collection.fields.find(
      (field) => 'name' in field && field.name === 'tenant',
    )
    expect(tenantField).toMatchObject({
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    })
  })
})
