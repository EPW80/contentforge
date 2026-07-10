import { execSync } from 'node:child_process'
import { Client } from 'pg'

import { ADMIN_DATABASE_URI, TEST_DB_NAME, testEnv } from './constants'

// Runs once (in its own process) before the int project. Recreates the test
// database and applies the checked-in migrations, so every run starts from a
// clean, schema-correct state.
export default async function globalSetup(): Promise<void> {
  const client = new Client({ connectionString: ADMIN_DATABASE_URI })
  try {
    await client.connect()
  } catch (error) {
    throw new Error(
      `Cannot reach Postgres at ${ADMIN_DATABASE_URI} — is docker compose up? (${String(error)})`,
    )
  }
  try {
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`)
    await client.query(`CREATE DATABASE ${TEST_DB_NAME}`)
  } finally {
    await client.end()
  }

  // `payload migrate` loads the Payload config, which reads env at import —
  // the overrides below beat .env because dotenv never overrides existing vars.
  execSync('pnpm db:migrate', {
    cwd: new URL('../..', import.meta.url).pathname,
    env: { ...process.env, ...testEnv() },
    stdio: 'inherit',
  })
}
