# ContentForge

Multi-tenant publication platform. Editors manage posts/authors per tenant. Readers hit the Next.js frontend with tag-based on-demand revalidation.

## Stack

- **CMS**: Payload 3 (TypeScript-native, self-hosted, Lexical rich text)
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS v4
- **DB**: PostgreSQL via Payload's Drizzle adapter (docker-compose, port 5434)
- **Storage**: S3-compatible (local MinIO in dev, ports 9002/9003)
- **Auth**: Payload built-in (JWT); no separate frontend session layer

## Commands

```bash
docker compose up -d  # Postgres + MinIO — prerequisite for dev and test:int
pnpm dev              # Payload admin + Next.js on :3000
pnpm build            # Production build (runs generate:types first)
pnpm generate:types   # Regenerate payload-types.ts after schema change
pnpm db:migrate       # Run Drizzle migrations
pnpm db:seed          # Seed demo tenants, users, posts (dev only)
pnpm test             # All tests (unit + integration)
pnpm test:unit        # Fast, no DB
pnpm test:int         # Real Payload against a dedicated contentforge_test DB
pnpm test:coverage    # V8 coverage report
```

IMPORTANT: Run `pnpm generate:types` after every collection schema change — stale types cause silent runtime errors. CI fails if the committed types drift from the collection configs.

## Project Structure

```text
src/
  collections/        # Payload collection configs (Users, Tenants, Authors, Media, Posts)
  payload.config.ts   # Root Payload config — collections, plugins, db adapter
  app/                # Next.js App Router pages & route handlers
  lib/                # Access control, Payload client, revalidation, env helpers
  migrations/         # Drizzle migrations (generated)
tests/
  unit/               # Pure-function tests, no DB
  int/                # Payload local-API tests against contentforge_test
```

## Key Conventions

### Collections

- Don't add fields without a `label` and `admin.description` — editors read these.
- Do put validation logic in the `validate` function on the field, not in hooks.
- Don't use `beforeChange` hooks for data transforms that belong in field `defaultValue`.

### RBAC / Multi-tenancy

- Don't use `access: () => true` as a placeholder — define real role checks from day one.
- Do import role checks from `src/lib/access.ts`; never inline them per-collection.
- Every tenant-scoped collection MUST wire `enforceTenantOnWrite` in `hooks.beforeValidate` — access `Where` clauses cannot enforce tenant on `create`. See `src/lib/CLAUDE.md`.

### Draft / Revalidation

- Don't query published docs on the frontend with `draft: true` accidentally — always pass `draft: false` in production fetch calls.
- Do trigger on-demand revalidation from the `afterChange` hook via the `revalidateTag` helper in `src/lib/revalidate.ts`, not client-side and not raw `fetch`.

### Types

- Don't import types from `@payloadcms/*` directly — use the generated `payload-types.ts`.
- CI regenerates types and fails on drift (`.github/workflows/ci.yml`).

## Module Specs (read when working in that directory)

| Directory | Spec | Covers |
| --------- | ---- | ------ |
| `src/collections/` | `src/collections/CLAUDE.md` | Field patterns, relation rules, hook conventions |
| `src/app/` | `src/app/CLAUDE.md` | Fetch patterns, ISR, route conventions |
| `src/lib/` | `src/lib/CLAUDE.md` | Access helpers, tenant enforcement, Payload client, revalidation |
