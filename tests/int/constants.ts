// Docker-compose Postgres (port 5434, see docker-compose.yml). The int suite
// runs against a dedicated database — NEVER the dev `contentforge` DB, which
// would be wiped by fixtures.
export const TEST_DB_NAME = 'contentforge_test'

export const ADMIN_DATABASE_URI =
  process.env.TEST_ADMIN_DATABASE_URI ??
  'postgres://contentforge:contentforge@127.0.0.1:5434/postgres'

export const TEST_DATABASE_URI =
  process.env.TEST_DATABASE_URI ??
  ADMIN_DATABASE_URI.replace(/\/[^/]*$/, `/${TEST_DB_NAME}`)

// The Payload config reads these at import time. S3 values only need to be
// present (the storage plugin never connects unless an upload happens).
export function testEnv(): Record<string, string> {
  return {
    DATABASE_URI: TEST_DATABASE_URI,
    PAYLOAD_SECRET: 'integration-test-secret',
    S3_BUCKET: 'contentforge',
    S3_ENDPOINT: 'http://localhost:9002',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'test',
    S3_SECRET_KEY: 'test',
  }
}
