import type { CollectionConfig } from 'payload'

import { formatSlug } from '@/lib/slugify'
import { combineAccess, isAdmin, isAdminOrEditor, tenantFromUser } from '@/lib/access'

export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tenant', 'updatedAt'],
  },
  access: {
    create: combineAccess(isAdminOrEditor, tenantFromUser),
    // anon → true (author profiles are public); editor → scoped to their tenant
    read: tenantFromUser,
    update: combineAccess(isAdminOrEditor, tenantFromUser),
    delete: isAdmin,
    admin: isAdminOrEditor,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 120,
      label: 'Name',
      admin: { description: "Author's display name shown on posts." },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        position: 'sidebar',
        description: 'URL segment. Auto-derived from name if left blank.',
      },
      hooks: {
        beforeValidate: [formatSlug('name')],
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Bio',
      admin: { description: 'Short biography shown alongside posts.' },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Photo',
      admin: { description: "Author's profile photo." },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Tenant',
      admin: {
        position: 'sidebar',
        description: 'Publication this author belongs to. Enforces isolation.',
      },
    },
  ],
}
