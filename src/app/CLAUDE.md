# Next.js App Module

App Router pages and layouts. Payload is the data source; this layer handles routing and rendering.

## Fetch Pattern

Use the Payload **local API** through the singleton, with `overrideAccess: false` so the access functions in `src/lib/access.ts` are enforced exactly as they are over REST:

```ts
import { getPayloadClient } from '@/lib/payload-client'

const payload = await getPayloadClient()
const posts = await payload.find({
  collection: 'posts',
  where: {
    and: [{ tenant: { equals: tenantId } }, { _status: { equals: 'published' } }],
  },
  draft: false, // IMPORTANT: always explicit on public routes
  depth: 1,
  overrideAccess: false, // enforce access functions
})
```

The one sanctioned exception: resolving a tenant **slug → id** uses `overrideAccess: true`, because `Tenants.read` is admin-only but the slug lookup itself is not sensitive (see `[tenant]/page.tsx`). Don't add further `overrideAccess: true` reads without a comment justifying it.

Don't construct `fetch()` calls to `/api/posts` manually — use the client singleton.

## Draft Mode (Preview)

**Not implemented.** The frontend always fetches with `draft: false` and filters on `_status: 'published'`. If preview is added later: enable `draftMode()` only inside a secret-verified route handler, and gate `draft:` on `draftMode().isEnabled` — never hardcode `draft: true` on a public route.

## ISR / Revalidation

On-demand revalidation via tags, not time-based `revalidate: N`.

```ts
// In page components — cache reads with tags
unstable_cache(fetchPost, ['post'], { tags: ['posts'] })

// In Payload afterChange hooks — use the helper, never raw fetch
import { revalidateTag } from '@/lib/revalidate'
await revalidateTag(`post-${doc.slug}`)
```

The helper POSTs to `/api/revalidate` (handler: `(frontend)/api/revalidate/route.ts`), which verifies `REVALIDATE_SECRET` and calls Next's `revalidateTag`.

IMPORTANT: `NEXT_REVALIDATE_URL` and `REVALIDATE_SECRET` must be set in the deployment env — missing them causes silent stale content (the helper is deliberately best-effort).

## Route Conventions

```text
app/
  (frontend)/               # Public-facing routes (layout = site chrome)
    [tenant]/
      page.tsx              # Tenant homepage
      posts/[slug]/
        page.tsx            # Post detail
    api/
      revalidate/route.ts   # On-demand revalidation webhook
  (payload)/                # Payload admin panel + REST/GraphQL (generated)
    admin/[[...segments]]/
    api/[...slug]/
```

Don't add business logic to `layout.tsx` — layouts are for chrome only. Put data fetching in `page.tsx`.

## Metadata

Every `page.tsx` must export a `generateMetadata` function. Don't hardcode titles.
