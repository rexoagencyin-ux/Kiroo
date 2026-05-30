const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Server-side fetch for public endpoints (used in Server Components for SSR/SEO).
 * Revalidates periodically so the storefront stays fresh without being fully dynamic.
 */
export async function serverFetch<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, {
      next: { revalidate },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
