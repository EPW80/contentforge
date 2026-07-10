import type { Metadata } from 'next'
import Image from 'next/image'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import type { Author, Media } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload-client'
import '../../../styles.css'

type Params = { tenant: string; slug: string }

async function getPost(tenantSlug: string, slug: string) {
  const payload = await getPayloadClient()
  // Resolve the tenant by slug first — the adapter can't query across the
  // `tenant` relationship via dot notation, so scope posts by tenant id.
  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: tenantSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const tenantDoc = tenants.docs[0]
  if (!tenantDoc) return null

  const res = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { slug: { equals: slug } },
        { tenant: { equals: tenantDoc.id } },
        { _status: { equals: 'published' } },
      ],
    },
    draft: false, // never leak drafts on the public route
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return res.docs[0] ?? null
}

const getCachedPost = unstable_cache(getPost, ['post'], { tags: ['posts'], revalidate: false })

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { tenant, slug } = await params
  const post = await getCachedPost(tenant, slug)
  return {
    title: post ? post.title : 'Not found',
  }
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { tenant, slug } = await params
  const post = await getCachedPost(tenant, slug)
  if (!post) notFound()

  const authors = (post.authors ?? []).filter((a): a is Author => typeof a === 'object')
  const featuredImage =
    post.featuredImage && typeof post.featuredImage === 'object'
      ? (post.featuredImage as Media)
      : null

  return (
    <main className="mx-auto max-w-2xl p-8">
      {featuredImage?.url && featuredImage.width && featuredImage.height && (
        <Image
          src={featuredImage.url}
          alt={featuredImage.alt ?? post.title}
          className="mb-6 w-full rounded-lg object-cover"
          width={featuredImage.width}
          height={featuredImage.height}
        />
      )}
      <h1 className="text-3xl font-bold">{post.title}</h1>
      {authors.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          By {authors.map((a) => a.name).join(', ')}
        </p>
      )}
      <article className="prose mt-6">
        <RichText data={post.content as SerializedEditorState} />
      </article>
    </main>
  )
}
