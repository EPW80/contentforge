import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'

import { getPayloadClient } from '@/lib/payload-client'
import '../styles.css'

type Params = { tenant: string }

async function getTenant(slug: string) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true, // tenant slug→id resolution is not access-gated
  })
  return res.docs[0] ?? null
}

async function getPublishedPosts(tenantId: number | string) {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'posts',
    where: {
      and: [{ tenant: { equals: tenantId } }, { _status: { equals: 'published' } }],
    },
    draft: false,
    depth: 1,
    overrideAccess: false,
    sort: '-updatedAt',
  })
}

const getCachedPublishedPosts = unstable_cache(getPublishedPosts, ['published-posts'], {
  tags: ['posts'],
  revalidate: false,
})

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { tenant } = await params
  const doc = await getTenant(tenant)
  return {
    title: doc ? `${doc.name} — ContentForge` : 'Not found',
    description: doc ? `Published posts from ${doc.name}.` : undefined,
  }
}

export default async function TenantHomePage({ params }: { params: Promise<Params> }) {
  const { tenant } = await params
  const tenantDoc = await getTenant(tenant)
  if (!tenantDoc) notFound()

  const posts = await getCachedPublishedPosts(tenantDoc.id)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">{tenantDoc.name}</h1>
      <ul className="mt-6 space-y-3">
        {posts.docs.length === 0 && <li className="text-gray-500">No published posts yet.</li>}
        {posts.docs.map((post) => (
          <li key={post.id}>
            <Link
              className="text-blue-600 underline"
              href={`/${tenant}/posts/${post.slug}`}
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
