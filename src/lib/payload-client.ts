import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

let cached: Payload | null = null

// Module-level singleton. Never call getPayload() per request elsewhere —
// always import this so the instance is initialized exactly once.
export async function getPayloadClient(): Promise<Payload> {
  if (cached) return cached
  cached = await getPayload({ config: await config })
  return cached
}
