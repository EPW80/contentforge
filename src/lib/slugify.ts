import type { FieldHook } from 'payload'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// beforeValidate hook factory: derives the slug from `sourceField` when the
// slug is empty, otherwise normalizes whatever the editor typed. Uniqueness
// is enforced by the field's `unique: true`, not here.
export function formatSlug(sourceField: string): FieldHook {
  return ({ value, data }) => {
    if (typeof value === 'string' && value.length > 0) {
      return slugify(value)
    }
    const source = data?.[sourceField]
    if (typeof source === 'string' && source.length > 0) {
      return slugify(source)
    }
    return value
  }
}

export { slugify }
