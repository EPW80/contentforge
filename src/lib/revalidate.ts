export async function revalidateTag(tag: string): Promise<void> {
  const url = process.env.NEXT_REVALIDATE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!url || !secret) return
  try {
    await fetch(`${url}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tag }),
    })
  } catch {
    // Server unreachable (e.g. seeding without a running Next.js process).
    // Revalidation is best-effort; never crash the calling hook.
  }
}
