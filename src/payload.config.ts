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
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: { media: true },
      bucket: process.env.S3_BUCKET || 'contentforge',
      config: {
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || '',
          secretAccessKey: process.env.S3_SECRET_KEY || '',
        },
        forcePathStyle: true, // required for MinIO path-style URLs
      },
    }),
  ],
})
