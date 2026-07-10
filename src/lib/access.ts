import type { Access, CollectionBeforeValidateHook, Where } from 'payload'
import { APIError } from 'payload'

type Role = 'admin' | 'editor'
type AccessArgs = Parameters<Access>[0]

function roleOf(user: unknown): Role | undefined {
  return (user as { role?: Role } | null | undefined)?.role
}

// Returns `boolean` (not the broader AccessResult) so these can also be used
// in the collection-level `admin` access slot, which forbids Where clauses.
export const isAdmin = ({ req }: AccessArgs): boolean => roleOf(req.user) === 'admin'

export const isAdminOrEditor = ({ req }: AccessArgs): boolean => {
  const role = roleOf(req.user)
  return role === 'admin' || role === 'editor'
}

// Authenticated staff (admin or editor) can read any status — editors need
// their own drafts. Anonymous callers are constrained to published docs.
export const isPublishedOrAdmin: Access = ({ req }) => {
  const role = roleOf(req.user)
  if (role === 'admin' || role === 'editor') return true
  return { _status: { equals: 'published' } }
}

// Data-scoped tenant isolation for authenticated staff.
//   - admin            -> all tenants
//   - editor (+tenant) -> only their own tenant's rows (Where clause)
//   - anonymous        -> unconstrained here; status is gated by
//                          isPublishedOrAdmin and the route filters by the
//                          URL tenant slug. Published content is public.
//   - authed, no tenant, not admin -> deny (misconfigured account)
export const tenantFromUser: Access = ({ req }) => {
  const user = req.user as
    | { tenant?: { id?: string | number } | string | number }
    | null
    | undefined
  if (!user) return true
  if (roleOf(user) === 'admin') return true
  const tenant = user.tenant
  const id = typeof tenant === 'object' && tenant !== null ? tenant.id : tenant
  if (id === undefined || id === null) return false
  return { tenant: { equals: id } }
}

// Write-side tenant isolation. Access functions CANNOT enforce this on
// `create`: Payload evaluates create access before any document exists, so a
// returned Where clause has nothing to filter and is treated as "allowed".
// That means `create: combineAccess(..., tenantFromUser)` does NOT stop an
// editor from submitting another tenant's id. This hook closes the hole by
// FORCING the tenant for non-admins on both create and update (it runs in
// beforeValidate, before the required-field check), so an editor can never
// create OR move a row into a tenant that isn't their own.
//   - admin            -> may set any tenant (cross-tenant by design)
//   - editor (+tenant) -> tenant is overwritten with their own, ignoring input
//   - editor, no tenant -> 403 (misconfigured account must not write)
export const enforceTenantOnWrite: CollectionBeforeValidateHook = ({
  req,
  data,
  operation,
}) => {
  if (!data) return data
  if (operation !== 'create' && operation !== 'update') return data
  const user = req.user as
    | { role?: Role; tenant?: { id?: string | number } | string | number }
    | null
    | undefined
  if (!user) return data // unauthenticated writes are rejected by access fns
  if (user.role === 'admin') return data // admins are cross-tenant
  const tenant = user.tenant
  const id = typeof tenant === 'object' && tenant !== null ? tenant.id : tenant
  if (id === undefined || id === null) {
    throw new APIError('Editors must belong to a tenant to write content.', 403)
  }
  return { ...data, tenant: id }
}

// Payload does NOT compose access functions automatically. combineAccess ANDs
// the results of several access fns into a single decision:
//   - any `false`            -> deny (false)
//   - mix of `true` + Where  -> AND of the Where clauses
//   - all `true`             -> allow (true)
export function combineAccess(...fns: Access[]): Access {
  return async (args) => {
    const results = await Promise.all(fns.map((fn) => fn(args)))
    const wheres: Where[] = []
    for (const result of results) {
      if (result === false) return false
      if (result === true) continue
      wheres.push(result)
    }
    if (wheres.length === 0) return true
    if (wheres.length === 1) return wheres[0]
    return { and: wheres }
  }
}
