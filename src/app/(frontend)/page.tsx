import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'ContentForge',
  description: 'Multi-tenant publication platform.',
}

export default function RootPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">ContentForge</h1>
      <p className="mt-2 text-gray-600">
        Visit a tenant at <code>/[tenant]</code>.
      </p>
    </main>
  )
}
