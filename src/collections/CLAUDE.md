# Collections Module

Payload 3 collection configs live here. Each file exports a `CollectionConfig`.

## Field Patterns

**Text / Textarea**

- Always set `required: true` explicitly — don't rely on Payload's default false.
- Use `maxLength` on short text fields so the admin UI shows a character counter.

**Rich Text (Lexical)**

- Don't create a new `lexicalEditor()` config per collection — import the shared one from `src/lib/editor.ts`.
- Do limit features per collection if editors don't need them (e.g., Posts get full toolbar; Excerpts get inline-only).

**Relationship fields**

- Don't use `hasMany: true` with `filterOptions` that queries large collections — it loads all matches into memory in the admin.
- Do use `depth: 1` on REST queries; go deeper only when the frontend explicitly needs it.

**Upload fields (Media)**

- Always add `mimeTypes` to restrict what editors can upload — no accidental PDF embeds in image slots.

## Slug Pattern

```ts
{
  name: 'slug',
  type: 'text',
  unique: true,
  admin: { position: 'sidebar' },
  hooks: {
    beforeValidate: [formatSlug('title')],
  },
}
```

Import `formatSlug` from `src/lib/slugify.ts`. Never hand-write slug logic per collection.

## Hook Conventions

- `beforeChange` — normalize data (trim whitespace, derive slug)
- `afterChange` — side effects only (revalidation, notifications)
- `afterRead` — never mutate returned data here; use virtual fields instead

IMPORTANT: Hooks run server-side only. Don't import browser APIs.

## Access Control

Every collection must define all five access functions: `create`, `read`, `update`, `delete`, `admin`.

```ts
// Correct — explicit
access: {
  create: isAdminOrEditor,
  read:   isPublishedOrAdmin,
  update: isAdminOrEditor,
  delete: isAdmin,
  admin:  isAdmin,
}

// Wrong — implicit fallthrough
access: {
  read: isPublishedOrAdmin,
}
```

## Multi-Tenancy

Tenant isolation lives on the `tenant` relationship field. Every tenant-scoped collection MUST:

1. Have a `tenant` relationship field with `required: true`.
2. Filter `read` access with `tenantFromUser` from `src/lib/access.ts`.
3. Wire `enforceTenantOnWrite` in `hooks.beforeValidate` — access `Where` clauses are inert on `create`, so read-side filtering alone does NOT stop cross-tenant writes (see `src/lib/CLAUDE.md`). `tests/unit/collections-wiring.spec.ts` asserts this; add new tenant-scoped collections to it.

Don't add tenant filtering inline — it drifts. Keep it in `src/lib/access.ts`.
