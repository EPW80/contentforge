import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Post } from '@/payload-types'

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
            {
              type: 'text',
              version: 1,
              text,
              format: 0,
              style: '',
              mode: 'normal',
              detail: 0,
            },
          ],
        },
      ],
    },
  } as Post['content']
}

async function seed() {
  const payload = await getPayload({ config: await config })

  // Dev seed: wipe collections so re-running is idempotent.
  await payload.delete({ collection: 'posts', where: {}, overrideAccess: true })
  await payload.delete({ collection: 'authors', where: {}, overrideAccess: true })
  await payload.delete({ collection: 'users', where: {}, overrideAccess: true })
  await payload.delete({ collection: 'tenants', where: {}, overrideAccess: true })

  const tenantA = await payload.create({
    collection: 'tenants',
    data: { name: 'Acme Press', slug: 'acme' },
    overrideAccess: true,
  })
  const tenantB = await payload.create({
    collection: 'tenants',
    data: { name: 'Globex Media', slug: 'globex' },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'users',
    data: { email: 'admin@contentforge.dev', password: 'admin123', role: 'admin' },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'users',
    data: {
      email: 'editor-a@contentforge.dev',
      password: 'editor123',
      role: 'editor',
      tenant: tenantA.id,
    },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'users',
    data: {
      email: 'editor-b@contentforge.dev',
      password: 'editor123',
      role: 'editor',
      tenant: tenantB.id,
    },
    overrideAccess: true,
  })

  const authorA = await payload.create({
    collection: 'authors',
    data: { name: 'Alice Acme', slug: 'alice-acme', bio: 'Staff writer at Acme Press.', tenant: tenantA.id },
    overrideAccess: true,
  })
  const authorB = await payload.create({
    collection: 'authors',
    data: { name: 'Bob Globex', slug: 'bob-globex', bio: 'Editor at Globex Media.', tenant: tenantB.id },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'posts',
    data: {
      title: 'Hello from Acme',
      slug: 'hello-from-acme',
      content: paragraph('This is a published Acme post, visible to the public.'),
      authors: [authorA.id],
      tenant: tenantA.id,
      _status: 'published',
    },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'posts',
    data: {
      title: 'Acme Draft (not public)',
      slug: 'acme-draft',
      content: paragraph('This Acme draft must never appear on the public route.'),
      tenant: tenantA.id,
      _status: 'draft',
    },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'posts',
    data: {
      title: 'Hello from Globex',
      slug: 'hello-from-globex',
      content: paragraph('A published Globex post — invisible to Acme editors.'),
      authors: [authorB.id],
      tenant: tenantB.id,
      _status: 'published',
    },
    overrideAccess: true,
  })

  payload.logger.info('Seed complete: 2 tenants, 1 admin, 2 editors, 2 authors, 3 posts.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
