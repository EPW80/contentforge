// Fail-fast accessor for env vars the app cannot run without. Throwing at
// config-import time turns a silent misconfiguration (e.g. JWTs signed with
// an empty secret) into an immediate, attributable startup error.
export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    )
  }
  return value
}
