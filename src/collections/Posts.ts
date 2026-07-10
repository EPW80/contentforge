import type { CollectionConfig } from 'payload'

import { editor } from '@/lib/editor'
import { revalidateTag } from '@/lib/revalidate'
import { formatSlug } from '@/lib/slugify'
import {
  combineAccess,
  isAdmin,
  isAdminOrEditor,
  isPublishedOrAdmin,
  tenantFromUser,
} from '@/lib/access'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tenant', '_status', 'updatedAt'],
  },
  // Required for `_status` to exist on the document. Without this, draft
  // verification fails with a confusing "field doesn't exist" error.
  versions: {
    drafts: true,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc }) => {
        const isPublished = doc._status === 'published'
        const wasPublished = previousDoc?._status === 'published'
        if (isPublished || wasPublished) {
          await revalidateTag('posts')
          if (typeof doc.slug === 'string') {
            await revalidateTag(`post-${doc.slug}`)
          }
        }
      },
    ],
  },
  access: {
    create: isAdminOrEditor,
    read: combineAccess(isPublishedOrAdmin, tenantFromUser),
    update: combineAccess(isAdminOrEditor, tenantFromUser),
    delete: isAdmin,
    admin: isAdminOrEditor,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 160,
      label: 'Title',
      admin: { description: 'Headline shown to readers and in the post list.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        position: 'sidebar',
        description: 'URL segment. Auto-derived from the title if left blank.',
      },
      hooks: {
        beforeValidate: [formatSlug('title')],
      },
    },
    {
      name: 'content',
      type: 'richText',
      editor,
      required: true,
      label: 'Content',
      admin: { description: 'Body of the post. Full rich-text toolbar.' },
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'authors',
      hasMany: true,
      label: 'Authors',
      admin: { description: 'People who wrote this post.' },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Featured Image',
      admin: {
        position: 'sidebar',
        description: 'Image shown at the top of the post and in social previews.',
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Tenant',
      admin: {
        position: 'sidebar',
        description: 'Publication this post belongs to. Enforces isolation.',
      },
    },
  ],
}
