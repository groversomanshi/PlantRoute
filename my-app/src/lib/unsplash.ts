/**
 * Fetch a single image URL from Unsplash for a given search query.
 * Requires UNSPLASH_ACCESS_KEY in env.
 */
export async function getUnsplashImageUrl(
  query: string,
  width = 400
): Promise<string | undefined> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return undefined;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${key}`
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      results?: Array<{ urls?: { regular?: string; small?: string } }>;
    };
    const url = data.results?.[0]?.urls?.regular ?? data.results?.[0]?.urls?.small;
    return url ? `${url}&w=${width}` : undefined;
  } catch {
    return undefined;
  }
}
