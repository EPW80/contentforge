# ContentForge

Multi-tenant publication platform. Editors manage posts/authors/series per tenant. Readers hit the Next.js frontend with draft preview and sub-second revalidation.

## Stack

- **CMS**: Payload 3 (TypeScript-native, self-hosted, Lexical rich text)
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS v4
- **DB**: PostgreSQL via Payload's Drizzle adapter
- **Storage**: S3-compatible (local MinIO in dev)
- **Auth**: Payload built-in (JWT) + NextAuth for frontend sessions

## Commands

```bash
pnpm dev              # Payload admin + Next.js on :3000
pnpm build            # Production build (runs generate:types first)
pnpm generate:types   # Regenerate payload-types.ts after schema change
pnpm db:migrate       # Run Drizzle migrations
pnpm db:seed          # Seed demo tenant, users, posts
pnpm test             # Vitest unit tests
```

IMPORTANT: Run `pnpm generate:types` after every collection schema change — stale types cause silent runtime errors.

## Project Structure

```
src/
  collections/        # Payload collection configs (Users, Posts, Media…)
  payload.config.ts   # Root Payload config — globals, plugins, db adapter
  app/                # Next.js App Router pages & layouts
  components/         # Shared React components
  lib/                # Utilities, Payload client, revalidation helpers
```

## Key Conventions

**Collections**
- Don't add fields without a `label` and `admin.description` — editors read these.
- Do put validation logic in the `validate` function on the field, not in hooks.
- Don't use `beforeChange` hooks for data transforms that belong in field `defaultValue`.

**RBAC**
- Don't use `access: () => true` as a placeholder — define real role checks from day one.
- Do import role checks from `src/lib/access.ts`; never inline them per-collection.

**Draft / Preview**
- Don't query published docs on the frontend with `draft: true` accidentally — always pass `draft: false` in production fetch calls.
- Do trigger on-demand revalidation from the `afterChange` hook, not client-side.

**Types**
- Don't import types from `@payloadcms/*` directly — use the generated `payload-types.ts`.
- Do regenerate types in CI before the build step.

## Module Specs (read when working in that directory)

| Directory | Spec | Covers |
|-----------|------|--------|
| `src/collections/` | `src/collections/CLAUDE.md` | Field patterns, relation rules, hook conventions |
| `src/app/` | `src/app/CLAUDE.md` | Fetch patterns, draft mode, ISR, route conventions |
| `src/lib/` | `src/lib/CLAUDE.md` | Access helpers, Payload client singleton, revalidation |
