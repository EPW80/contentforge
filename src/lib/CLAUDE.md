# Lib Module

Shared utilities. The files in here do heavy lifting — understand them before adding new helpers.

## Key Files

| File | Purpose |
| ------ | --------- |
| `access.ts` | All RBAC: `isAdmin`, `isAdminOrEditor`, `isPublishedOrAdmin`, `tenantFromUser`, `enforceTenantOnWrite`, `combineAccess` |
| `env.ts` | `requiredEnv(name)` — fail-fast accessor for mandatory env vars |
| `payload-client.ts` | Payload client singleton — use this everywhere |
| `revalidate.ts` | Sends revalidation requests to Next.js |
| `slugify.ts` | `formatSlug(field)` hook factory |
| `editor.ts` | Shared Lexical editor config |

## access.ts

Don't add new role checks anywhere else. All access logic lives here.

`tenantFromUser` (read-side scoping) has four branches — see the implementation for the canonical source:

- anonymous → `true` (published content is public; status is gated separately by `isPublishedOrAdmin`, and routes filter by the URL tenant slug)
- admin → `true` (all tenants)
- editor with a tenant → `Where` clause scoping to that tenant
- authenticated, no tenant, not admin → `false` (misconfigured account)

Payload does NOT compose access functions automatically — use `combineAccess(...)` to AND several of them (e.g. `read: combineAccess(isPublishedOrAdmin, tenantFromUser)`).

### Write-side enforcement (IMPORTANT)

`Where` clauses are **inert on `create`**: Payload evaluates create access before any document exists, so a returned filter matches nothing and is treated as "allowed". A boolean check (`create: isAdminOrEditor`) plus the `enforceTenantOnWrite` hook is the correct pattern.

Every tenant-scoped collection MUST wire the hook:

```ts
hooks: {
  beforeValidate: [enforceTenantOnWrite],
},
```

The hook forces the editor's own tenant on create AND update (admins pass through; tenant-less editors get a 403). `tests/unit/collections-wiring.spec.ts` asserts this wiring for every tenant-scoped collection — add new ones to that test.

Boolean returns are correct for blanket grants/denials and for `create:` slots; for data-scoped **read/update** rules, return a `Where` clause.

## env.ts

`requiredEnv('PAYLOAD_SECRET')` throws at config-import time when the var is missing — misconfiguration fails the build/boot instead of producing silently broken behavior. Use it for any env var the app cannot run without.

## payload-client.ts

Returns the initialized Payload instance. Caches via module-level singleton — don't re-initialize per request.

IMPORTANT: Don't import `payload` directly from the `payload` package in frontend components. Always go through this module so the singleton is guaranteed.

## revalidate.ts

```ts
export async function revalidateTag(tag: string) {
  // Already handles the fetch + secret header; best-effort (never throws)
}
```

Don't call `fetch('/api/revalidate')` directly in hooks — use this helper so the URL/secret config is in one place.
