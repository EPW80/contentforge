import type { CollectionConfig } from 'payload'

import {
  combineAccess,
  enforceTenantOnWrite,
  isAdmin,
  isAdminOrEditor,
  tenantFromUser,
} from '@/lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'tenant', 'updatedAt'],
  },
  access: {
    // Boolean, not combineAccess(..., tenantFromUser): a Where clause is inert
    // on create (no document exists yet to filter). Tenant isolation on write
    // is enforced by the enforceTenantOnWrite hook below, which also covers
    // the editor's convenience case (their tenant is forced, not just filled).
    create: isAdminOrEditor,
    // anon → true (images in published posts are world-visible)
    read: tenantFromUser,
    update: combineAccess(isAdminOrEditor, tenantFromUser),
    delete: isAdmin,
    admin: isAdminOrEditor,
  },
  hooks: {
    beforeValidate: [enforceTenantOnWrite],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt Text',
      admin: { description: 'Describe the image for screen readers and search engines.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Tenant',
      admin: {
        position: 'sidebar',
        description: 'Publication this asset belongs to. Enforces isolation.',
      },
    },
  ],
}
