import { describe, expect, it } from 'vitest'
import type { FieldHook } from 'payload'

import { formatSlug, slugify } from '@/lib/slugify'

const run = (hook: FieldHook, value: unknown, data: Record<string, unknown>) =>
  hook({ value, data } as unknown as Parameters<FieldHook>[0])

describe('slugify', () => {
  it('lowercases, trims, and dashes', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world')
  })
  it('strips punctuation and collapses separators', () => {
    expect(slugify('Foo: Bar!! __ Baz')).toBe('foo-bar-baz')
  })
})

describe('formatSlug', () => {
  const hook = formatSlug('title')

  it('derives from source field when slug empty', () => {
    expect(run(hook, '', { title: 'My First Post' })).toBe('my-first-post')
  })
  it('normalizes a hand-typed slug', () => {
    expect(run(hook, 'Custom Slug', { title: 'Ignored' })).toBe('custom-slug')
  })
  it('passes value through when no slug and no source', () => {
    expect(run(hook, undefined, {})).toBe(undefined)
  })
})
