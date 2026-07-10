import { getPayload, type Payload } from 'payload'

import { testEnv } from './constants'

let cached: Payload | null = null

// The Payload config reads env at module-import time, so the test env MUST be
// applied before the dynamic import below. Never import '@/payload.config'
// (or anything that transitively imports it) statically from an int spec.
export async function getTestPayload(): Promise<Payload> {
  if (cached) return cached
  Object.assign(process.env, testEnv())
  const { default: config } = await import('@/payload.config')
  cached = await getPayload({ config: await config })
  return cached
}
