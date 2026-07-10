import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'

import { POST } from '@/app/(frontend)/api/revalidate/route'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

const SECRET = 'test-revalidate-secret'

function request(options: { auth?: string; body?: string } = {}): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.auth !== undefined) headers.Authorization = options.auth
  return new NextRequest('http://localhost:3000/api/revalidate', {
    method: 'POST',
    headers,
    body: options.body ?? JSON.stringify({ tag: 'posts' }),
  })
}

beforeEach(() => {
  vi.mocked(revalidateTag).mockClear()
  vi.stubEnv('REVALIDATE_SECRET', SECRET)
})

describe('POST /api/revalidate', () => {
  it('401 when no secret is configured, even with a matching header', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '')
    const res = await POST(request({ auth: 'Bearer ' }))
    expect(res.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('401 without an Authorization header', async () => {
    const res = await POST(request())
    expect(res.status).toBe(401)
  })

  it('401 with a wrong bearer token', async () => {
    const res = await POST(request({ auth: 'Bearer wrong' }))
    expect(res.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('400 on invalid JSON', async () => {
    const res = await POST(request({ auth: `Bearer ${SECRET}`, body: 'not json' }))
    expect(res.status).toBe(400)
  })

  it('400 when tag is missing', async () => {
    const res = await POST(request({ auth: `Bearer ${SECRET}`, body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it('400 when tag is not a string', async () => {
    const res = await POST(request({ auth: `Bearer ${SECRET}`, body: JSON.stringify({ tag: 7 }) }))
    expect(res.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('200 and revalidates on a valid request', async () => {
    const res = await POST(
      request({ auth: `Bearer ${SECRET}`, body: JSON.stringify({ tag: 'post-hello' }) }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ revalidated: true, tag: 'post-hello' })
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('post-hello')
  })
})
