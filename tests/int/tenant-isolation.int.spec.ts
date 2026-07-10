import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

import { getTestPayload } from './helpers'
import type { Post, Tenant, User } from '@/payload-types'

// End-to-end proof of the tenant-isolation invariant, exercised through the
// Payload local API with overrideAccess: false — which evaluates access
// functions and hooks exactly as the REST API does. Fixtures are created with
// overrideAccess: true (the default) so setup bypasses the rules under test.

function paragraph(text: string): Post['content'] {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          version: 1,
          format: '',
          indent: 0,
          direction: 'ltr',
          children: [
            { type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 },
          ],
        },
      ],
    },
  } as Post['content']
}

const tenantIdOf = (doc: { tenant: number | Tenant }): number =>
  typeof doc.tenant === 'object' ? doc.tenant.id : doc.tenant

let payload: Payload
let tenantA: Tenant
let tenantB: Tenant
let editorA: User
let editorNoTenant: User
let counter = 0
const slug = (prefix: string) => `${prefix}-${++counter}`

beforeAll(async () => {
  payload = await getTestPayload()

  tenantA = await payload.create({
    collection: 'tenants',
    data: { name: 'Tenant A', slug: 'tenant-a' },
  })
  tenantB = await payload.create({
    collection: 'tenants',
    data: { name: 'Tenant B', slug: 'tenant-b' },
  })
  editorA = await payload.create({
    collection: 'users',
    data: {
      email: 'editor-a@test.local',
      password: 'test-password',
      role: 'editor',
      tenant: tenantA.id,
    },
  })
  editorNoTenant = await payload.create({
    collection: 'users',
    data: { email: 'editor-none@test.local', password: 'test-password', role: 'editor' },
  })
})

afterAll(async () => {
  await payload.destroy()
})

describe('write isolation (enforceTenantOnWrite)', () => {
  it('forces the editor tenant when creating a post under another tenant', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Cross-tenant attempt',
        slug: slug('cross-tenant-post'),
        content: paragraph('body'),
        tenant: tenantB.id,
      },
      user: editorA,
      overrideAccess: false,
    })
    expect(tenantIdOf(post)).toBe(tenantA.id)
  })

  it('forces the editor tenant when creating an author under another tenant', async () => {
    const author = await payload.create({
      collection: 'authors',
      data: { name: 'Mallory', slug: slug('mallory'), tenant: tenantB.id },
      user: editorA,
      overrideAccess: false,
    })
    expect(tenantIdOf(author)).toBe(tenantA.id)
  })

  it('prevents moving a post to another tenant via update', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Stays home',
        slug: slug('stays-home'),
        content: paragraph('body'),
        tenant: tenantA.id,
      },
    })
    const updated = await payload.update({
      collection: 'posts',
      id: post.id,
      data: { tenant: tenantB.id },
      user: editorA,
      overrideAccess: false,
    })
    expect(tenantIdOf(updated)).toBe(tenantA.id)
  })

  it('rejects writes from an editor with no tenant (403)', async () => {
    await expect(
      payload.create({
        collection: 'posts',
        data: {
          title: 'No tenant',
          slug: slug('no-tenant'),
          content: paragraph('body'),
          tenant: tenantB.id,
        },
        user: editorNoTenant,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('denies delete to editors (admin only)', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Undeletable',
        slug: slug('undeletable'),
        content: paragraph('body'),
        tenant: tenantA.id,
      },
    })
    await expect(
      payload.delete({
        collection: 'posts',
        id: post.id,
        user: editorA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('read isolation', () => {
  beforeAll(async () => {
    await payload.create({
      collection: 'posts',
      data: {
        title: 'B published',
        slug: slug('b-published'),
        content: paragraph('body'),
        tenant: tenantB.id,
        _status: 'published',
      },
    })
    await payload.create({
      collection: 'posts',
      data: {
        title: 'A draft',
        slug: slug('a-draft'),
        content: paragraph('body'),
        tenant: tenantA.id,
        _status: 'draft',
      },
    })
  })

  it('editors never see other tenants’ posts', async () => {
    const result = await payload.find({
      collection: 'posts',
      user: editorA,
      overrideAccess: false,
      limit: 100,
    })
    expect(result.docs.length).toBeGreaterThan(0)
    for (const doc of result.docs) {
      expect(tenantIdOf(doc)).toBe(tenantA.id)
    }
  })

  it('anonymous readers only see published posts', async () => {
    const result = await payload.find({
      collection: 'posts',
      overrideAccess: false,
      limit: 100,
    })
    expect(result.docs.length).toBeGreaterThan(0)
    for (const doc of result.docs) {
      expect(doc._status).toBe('published')
    }
  })
})
