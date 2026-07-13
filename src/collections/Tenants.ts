import type { CollectionConfig } from 'payload'

import { formatSlug } from '@/lib/slugify'
import { revalidateTag } from '@/lib/revalidate'
import { isAdmin } from '@/lib/access'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
  },
  hooks: {
    afterChange: [
      async () => {
        await revalidateTag('tenants')
      },
    ],
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    admin: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 80,
      label: 'Name',
      admin: { description: 'Display name of the publication.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        position: 'sidebar',
        description: 'URL segment for this tenant. Auto-derived from name.',
      },
      hooks: {
        beforeValidate: [formatSlug('name')],
      },
    },
  ],
}
