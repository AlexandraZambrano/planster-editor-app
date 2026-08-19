import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { searchStockPhotos, getFeaturedStockPhotos, trackStockPhotoUsage } from "./cover-design"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const SESSION = {
  user: { id: "user-1", email: "a@test.com", username: "author1", avatarUrl: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
  vi.stubEnv("UNSPLASH_ACCESS_KEY", "test-key")
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("searchStockPhotos", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await searchStockPhotos("mountains")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns an empty list for a blank query without calling Unsplash", async () => {
    const result = await searchStockPhotos("   ")
    expect(result.photos).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("returns a friendly error when the access key is not configured", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "")
    const result = await searchStockPhotos("mountains")
    expect(result.error).toBe("Stock photo search is not configured")
  })

  it("returns error when Unsplash responds with a non-OK status", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    const result = await searchStockPhotos("mountains")
    expect(result.error).toBe("Stock photo search failed")
  })

  it("returns error when fetch throws", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"))
    const result = await searchStockPhotos("mountains")
    expect(result.error).toBe("Stock photo search failed")
  })

  it("maps Unsplash photos to the slim shape, tagging profile/source links with UTM params", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "eOvv4N6yNmk",
            urls: {
              regular: "https://images.unsplash.com/photo-eOvv4N6yNmk?w=1080",
              small: "https://images.unsplash.com/photo-eOvv4N6yNmk?w=400",
            },
            user: {
              name: "David Bartus",
              links: { html: "https://unsplash.com/@david-bartus" },
            },
            links: {
              html: "https://unsplash.com/photos/eOvv4N6yNmk",
              download_location: "https://api.unsplash.com/photos/eOvv4N6yNmk/download",
            },
          },
        ],
      }),
    } as Response)

    const result = await searchStockPhotos("mountains")
    expect(result.photos).toEqual([
      {
        id: "eOvv4N6yNmk",
        thumbnailUrl: "https://images.unsplash.com/photo-eOvv4N6yNmk?w=400",
        fullUrl: "https://images.unsplash.com/photo-eOvv4N6yNmk?w=1080",
        photographerName: "David Bartus",
        photographerUrl:
          "https://unsplash.com/@david-bartus?utm_source=planster&utm_medium=referral",
        sourceUrl:
          "https://unsplash.com/photos/eOvv4N6yNmk?utm_source=planster&utm_medium=referral",
        downloadLocation: "https://api.unsplash.com/photos/eOvv4N6yNmk/download",
      },
    ])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.unsplash.com/search/photos?query=mountains"),
      expect.objectContaining({ headers: { Authorization: "Client-ID test-key" } })
    )
  })
})

describe("getFeaturedStockPhotos", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getFeaturedStockPhotos()
    expect(result.error).toBe("Unauthorized")
  })

  it("returns a friendly error when the access key is not configured", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "")
    const result = await getFeaturedStockPhotos()
    expect(result.error).toBe("Stock photo search is not configured")
  })

  it("returns error when Unsplash responds with a non-OK status", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    const result = await getFeaturedStockPhotos()
    expect(result.error).toBe("Stock photo search failed")
  })

  it("maps the flat photos array from Unsplash's general endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "eOvv4N6yNmk",
          urls: {
            regular: "https://images.unsplash.com/photo-eOvv4N6yNmk?w=1080",
            small: "https://images.unsplash.com/photo-eOvv4N6yNmk?w=400",
          },
          user: {
            name: "David Bartus",
            links: { html: "https://unsplash.com/@david-bartus" },
          },
          links: {
            html: "https://unsplash.com/photos/eOvv4N6yNmk",
            download_location: "https://api.unsplash.com/photos/eOvv4N6yNmk/download",
          },
        },
      ],
    } as Response)

    const result = await getFeaturedStockPhotos()
    expect(result.photos).toHaveLength(1)
    expect(result.photos?.[0].photographerName).toBe("David Bartus")
    expect(fetch).toHaveBeenCalledWith(
      "https://api.unsplash.com/photos?per_page=12&order_by=popular",
      expect.objectContaining({ headers: { Authorization: "Client-ID test-key" } })
    )
  })
})

describe("trackStockPhotoUsage", () => {
  it("does nothing when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    await trackStockPhotoUsage("https://api.unsplash.com/photos/x/download")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("does nothing when the access key is not configured", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "")
    await trackStockPhotoUsage("https://api.unsplash.com/photos/x/download")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("pings the download_location URL with the access key", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
    await trackStockPhotoUsage("https://api.unsplash.com/photos/x/download")
    expect(fetch).toHaveBeenCalledWith("https://api.unsplash.com/photos/x/download", {
      headers: { Authorization: "Client-ID test-key" },
    })
  })

  it("never throws even if the ping fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"))
    await expect(trackStockPhotoUsage("https://api.unsplash.com/photos/x/download")).resolves.toBeUndefined()
  })
})
