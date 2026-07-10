# Lib Module

Shared utilities. Three files in here do heavy lifting — understand them before adding new helpers.

## Key Files

| File | Purpose |
|------|---------|
| `access.ts` | All RBAC functions (isAdmin, isEditor, isPublishedOrAdmin, tenantFromUser) |
| `payload-client.ts` | Payload client singleton — use this everywhere |
| `revalidate.ts` | Sends revalidation requests to Next.js |
| `slugify.ts` | `formatSlug(field)` hook factory |
| `editor.ts` | Shared Lexical editor config |

## access.ts

Don't add new role checks anywhere else. All access logic lives here.

```ts
// Pattern — always return a Where clause for data-layer filtering, not just boolean
export const tenantFromUser: Access = ({ req }) => {
  const tenantId = req.user?.tenant?.id
  if (!tenantId) return false
  return { tenant: { equals: tenantId } }
}
```

Boolean returns (`true` / `false`) are only correct for admin-level blanket grants/denials. For data-scoped rules, always return a `Where` clause.

## payload-client.ts

Returns the initialized Payload instance. Caches via module-level singleton — don't re-initialize per request.

IMPORTANT: Don't import `payload` directly from `payload` package in frontend components. Always go through this module so the singleton is guaranteed.

## revalidate.ts

```ts
export async function revalidateTag(tag: string) {
  // Already handles the fetch + secret header
}
```

Don't call `fetch('/api/revalidate')` directly in hooks — use this helper so the URL/secret config is in one place.
