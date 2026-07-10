import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tag = (body as Record<string, unknown>)?.tag
  if (!tag || typeof tag !== 'string') {
    return NextResponse.json({ error: 'Missing tag' }, { status: 400 })
  }

  revalidateTag(tag)
  return NextResponse.json({ revalidated: true, tag })
}
