import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'

import { getPayloadClient } from '@/lib/payload-client'
import './styles.css'

async function getTenants() {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'tenants',
    sort: 'name',
    depth: 0,
    pagination: false,
    // Tenants.read is admin-only, but name+slug are already public on every
    // tenant homepage — same sensitivity class as the sanctioned slug→id
    // lookup in [tenant]/page.tsx.
    overrideAccess: true,
  })
}

const getCachedTenants = unstable_cache(getTenants, ['tenants'], {
  tags: ['tenants'],
  revalidate: false,
})

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'ContentForge',
    description: 'Multi-tenant publication platform.',
  }
}

export default async function RootPage() {
  const tenants = await getCachedTenants()

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">ContentForge</h1>
      <p className="mt-2 text-gray-600">Publications on this platform:</p>
      <ul className="mt-6 space-y-3">
        {tenants.docs.length === 0 && <li className="text-gray-500">No publications yet.</li>}
        {tenants.docs.map((tenant) => (
          <li key={tenant.id}>
            <Link className="text-blue-600 underline" href={`/${tenant.slug}`}>
              {tenant.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
