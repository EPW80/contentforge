# Next.js App Module

App Router pages and layouts. Payload is the data source; this layer handles routing, rendering, and draft preview.

## Fetch Pattern

Always use the Payload REST API (not the local API) from frontend routes so access control is enforced.

```ts
// src/lib/payload-client.ts — use this, don't fetch() inline
import { getPayloadClient } from '@/lib/payload-client'

const payload = await getPayloadClient()
const posts = await payload.find({
  collection: 'posts',
  where: { _status: { equals: 'published' } },
  draft: false,   // IMPORTANT: always explicit
  depth: 1,
})
```

Don't construct fetch() calls to `/api/posts` manually — use the Payload client singleton.

## Draft Mode (Preview)

Draft mode is triggered via `/api/preview` route handler.

- Don't enable draft mode without verifying the `previewSecret` in the query param.
- Do call `draftMode().enable()` only inside the route handler, not in page components.
- Preview renders at `/preview/[collection]/[slug]` — these routes must pass `draft: true` to the client.

```ts
// Wrong — leaks drafts to production
const post = await payload.findByID({ collection: 'posts', id, draft: true })

// Correct — gate on draftMode()
const { isEnabled } = draftMode()
const post = await payload.findByID({ collection: 'posts', id, draft: isEnabled })
```

## ISR / Revalidation

Use on-demand revalidation via tags, not time-based `revalidate: N`.

```ts
// In page component
unstable_cache(fetchPost, ['post', slug], { tags: [`post-${slug}`] })

// In Payload afterChange hook (server)
await fetch(`${process.env.NEXT_REVALIDATE_URL}/api/revalidate`, {
  method: 'POST',
  body: JSON.stringify({ tag: `post-${doc.slug}` }),
  headers: { Authorization: `Bearer ${process.env.REVALIDATE_SECRET}` },
})
```

IMPORTANT: `NEXT_REVALIDATE_URL` and `REVALIDATE_SECRET` must be set in `.env.local` and Vercel env — missing these causes silent stale content.

## Route Conventions

```
app/
  (frontend)/           # Public-facing routes (layout = site chrome)
    [tenant]/
      page.tsx          # Tenant homepage
      posts/[slug]/
        page.tsx        # Post detail
  (admin)/              # Payload admin panel (proxied, not reimplemented)
  api/
    preview/route.ts    # Draft mode toggle
    revalidate/route.ts # On-demand revalidation webhook
```

Don't add business logic to `layout.tsx` — layouts are for chrome only. Put data fetching in `page.tsx`.

## Metadata

Every `page.tsx` must export a `generateMetadata` function. Don't hardcode titles.
