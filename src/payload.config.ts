import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { editor } from '@/lib/editor'
import { requiredEnv } from '@/lib/env'
import { Authors } from '@/collections/Authors'
import { Media } from '@/collections/Media'
import { Posts } from '@/collections/Posts'
import { Tenants } from '@/collections/Tenants'
import { Users } from '@/collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Non-fatal: media may be unused in some contexts (seed, type generation),
// but empty credentials silently break every upload, so say something.
if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
  console.warn(
    'S3_ACCESS_KEY / S3_SECRET_KEY are not set — media uploads will fail until they are configured.',
  )
}

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || undefined,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Tenants, Users, Authors, Media, Posts],
  editor,
  secret: requiredEnv('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: requiredEnv('DATABASE_URI'),
      // Serverless: every function instance gets its own pool, so keep the
      // per-instance cap small and let the platform pooler absorb fan-out.
      max: Number(process.env.PG_POOL_MAX) || 5,
      connectionTimeoutMillis: 10_000,
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: { media: true },
      bucket: process.env.S3_BUCKET || 'contentforge',
      config: {
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || '',
          secretAccessKey: process.env.S3_SECRET_KEY || '',
        },
        // Custom endpoint + path-style URLs are MinIO-only; real AWS S3 must
        // leave S3_ENDPOINT unset.
        ...(process.env.S3_ENDPOINT
          ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true as const }
          : {}),
      },
    }),
  ],
})
