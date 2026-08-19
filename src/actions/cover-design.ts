"use server"

import { auth } from "@/lib/auth"

export type StockPhoto = {
  id: string
  thumbnailUrl: string
  fullUrl: string
  photographerName: string
  photographerUrl: string
  sourceUrl: string
  downloadLocation: string
}

interface UnsplashPhoto {
  id: string
  urls: { regular: string; small: string }
  user: { name: string; links: { html: string } }
  links: { html: string; download_location: string }
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[]
}

// Unsplash's API guidelines (a condition of API approval) require every image
// URL served to a user to carry these UTM params, so the referral is
// attributed back to Planster in Unsplash's own analytics.
function withUtm(url: string): string {
  const u = new URL(url)
  u.searchParams.set("utm_source", "planster")
  u.searchParams.set("utm_medium", "referral")
  return u.toString()
}

function mapUnsplashPhoto(p: UnsplashPhoto): StockPhoto {
  return {
    id: p.id,
    thumbnailUrl: p.urls.small,
    fullUrl: p.urls.regular,
    photographerName: p.user.name,
    photographerUrl: withUtm(p.user.links.html),
    sourceUrl: withUtm(p.links.html),
    downloadLocation: p.links.download_location,
  }
}

export async function searchStockPhotos(
  query: string,
  page = 1
): Promise<{ error?: string; photos?: StockPhoto[] }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const q = query.trim()
  if (!q) return { photos: [] }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return { error: "Stock photo search is not configured" }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&page=${page}`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )
    if (!res.ok) return { error: "Stock photo search failed" }

    const data: UnsplashSearchResponse = await res.json()
    return { photos: data.results.map(mapUnsplashPhoto) }
  } catch {
    return { error: "Stock photo search failed" }
  }
}

// A small curated gallery shown before the writer types anything — same idea
// as the preset color grid, but for photos. Backed by Unsplash's general
// "popular" feed rather than a search query.
export async function getFeaturedStockPhotos(): Promise<{
  error?: string
  photos?: StockPhoto[]
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return { error: "Stock photo search is not configured" }

  try {
    const res = await fetch(
      "https://api.unsplash.com/photos?per_page=12&order_by=popular",
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )
    if (!res.ok) return { error: "Stock photo search failed" }

    const data: UnsplashPhoto[] = await res.json()
    return { photos: data.map(mapUnsplashPhoto) }
  } catch {
    return { error: "Stock photo search failed" }
  }
}

// Unsplash requires pinging this endpoint whenever a photo is actually put to
// use (not merely shown in search results) — see
// https://help.unsplash.com/en/articles/2511258. Fire-and-forget: a failure
// here should never block the writer from picking their background.
export async function trackStockPhotoUsage(downloadLocation: string): Promise<void> {
  const session = await auth()
  if (!session) return

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return

  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    })
  } catch {
    // Non-critical — never block cover design on this.
  }
}
