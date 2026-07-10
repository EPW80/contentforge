import { beforeEach, describe, expect, it, vi } from 'vitest'

import { revalidateTag } from '@/lib/revalidate'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('NEXT_REVALIDATE_URL', 'http://localhost:3000')
  vi.stubEnv('REVALIDATE_SECRET', 'shhh')
})

describe('revalidateTag helper', () => {
  it('POSTs the tag to /api/revalidate with the bearer secret', async () => {
    await revalidateTag('post-hello')
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer shhh',
      },
      body: JSON.stringify({ tag: 'post-hello' }),
    })
  })

  it('no-ops when NEXT_REVALIDATE_URL is unset', async () => {
    vi.stubEnv('NEXT_REVALIDATE_URL', '')
    await revalidateTag('posts')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no-ops when REVALIDATE_SECRET is unset', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '')
    await revalidateTag('posts')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('swallows fetch failures (best-effort contract)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(revalidateTag('posts')).resolves.toBeUndefined()
  })
})
