import { describe, it, expect, vi, beforeEach } from "vitest"
import { getHomeData, getExploreBooks, getBookPageData } from "./discovery"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const mockPrisma = prisma as unknown as {
  book: Record<string, ReturnType<typeof vi.fn>>
  library: Record<string, ReturnType<typeof vi.fn>>
  betaReader: Record<string, ReturnType<typeof vi.fn>>
  $queryRaw: ReturnType<typeof vi.fn>
}

const AUTHOR = { username: "author1", displayName: "Author One" }

function book(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "book-1",
    title: "My Book",
    coverUrl: null,
    genres: ["Fantasy"],
    bookStatus: "IN_PROGRESS",
    language: "en",
    updatedAt: new Date("2026-01-01"),
    featured: false,
    author: AUTHOR,
    _count: { chapters: 3 },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(null)
  mockPrisma.$queryRaw.mockResolvedValue([])
})

describe("getHomeData", () => {
  it("splits books into featured, recent, and popular", async () => {
    const featuredBook = book({ id: "b-featured", featured: true, updatedAt: new Date("2026-01-01") })
    const recentBook = book({ id: "b-recent", updatedAt: new Date("2026-02-01") })
    const popularBook = book({ id: "b-popular", updatedAt: new Date("2025-12-01") })

    mockPrisma.book.findMany.mockResolvedValue([featuredBook, recentBook, popularBook])
    mockPrisma.$queryRaw.mockResolvedValue([
      { bookId: "b-popular", avg: 4.7, count: BigInt(5) },
      { bookId: "b-recent", avg: 4.9, count: BigInt(1) },
    ])

    const result = await getHomeData()

    expect(result.featured.map((b) => b.id)).toEqual(["b-featured"])
    expect(result.recent.map((b) => b.id)).toEqual(["b-recent", "b-featured", "b-popular"])
    expect(result.popular.map((b) => b.id)).toEqual(["b-popular"])
    expect(result.popular[0].averageRating).toBe(4.7)
    expect(result.popular[0].ratingCount).toBe(5)
  })

  it("excludes books with fewer than 3 ratings from popular", async () => {
    mockPrisma.book.findMany.mockResolvedValue([book({ id: "b-1" })])
    mockPrisma.$queryRaw.mockResolvedValue([{ bookId: "b-1", avg: 5, count: BigInt(2) }])

    const result = await getHomeData()

    expect(result.popular).toEqual([])
  })
})

describe("getExploreBooks", () => {
  it("returns empty result when search matches nothing", async () => {
    mockPrisma.book.findMany.mockResolvedValueOnce([])
    mockPrisma.$queryRaw.mockResolvedValueOnce([])

    const result = await getExploreBooks({ search: "nonexistent" })

    expect(result.books).toEqual([])
    expect(result.totalCount).toBe(0)
    expect(mockPrisma.book.count).not.toHaveBeenCalled()
  })

  it("returns empty result when minRating excludes all books", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([])

    const result = await getExploreBooks({ minRating: 4 })

    expect(result.books).toEqual([])
    expect(mockPrisma.book.count).not.toHaveBeenCalled()
  })

  it("intersects search and rating id filters", async () => {
    mockPrisma.book.findMany.mockResolvedValueOnce([{ id: "b-1" }, { id: "b-2" }]) // title/author match
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([]) // tags match (none)
      .mockResolvedValueOnce([{ bookId: "b-2" }]) // min-rating candidates
      .mockResolvedValueOnce([]) // ratings map for final page

    mockPrisma.book.count.mockResolvedValue(1)
    mockPrisma.book.findMany.mockResolvedValueOnce([book({ id: "b-2" })])

    const result = await getExploreBooks({ search: "fantasy", minRating: 3 })

    expect(mockPrisma.book.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["b-2"] } }),
      })
    )
    expect(result.books.map((b) => b.id)).toEqual(["b-2"])
  })

  it("applies genre, language, and status filters with pagination", async () => {
    mockPrisma.book.count.mockResolvedValue(45)
    mockPrisma.book.findMany.mockResolvedValue([book()])

    await getExploreBooks({
      genres: ["Fantasy", "Horror"],
      language: "es",
      bookStatus: "COMPLETE",
      page: 2,
    })

    expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicationStatus: "PUBLISHED",
          genres: { hasSome: ["Fantasy", "Horror"] },
          language: "es",
          bookStatus: "COMPLETE",
        },
        skip: 20,
        take: 20,
      })
    )
  })
})

describe("getBookPageData", () => {
  it("returns error when book does not exist", async () => {
    mockPrisma.book.findUnique.mockResolvedValue(null)
    const result = await getBookPageData("book-1")
    expect(result.error).toBe("Book not found")
  })

  it("returns error for draft books", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      publicationStatus: "DRAFT",
      authorId: "author-1",
      chapters: [],
    })
    const result = await getBookPageData("book-1")
    expect(result.error).toBe("Book not found")
  })

  it("returns viewer flags as false/null when not authenticated", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "My Book",
      synopsis: null,
      coverUrl: null,
      genres: [],
      language: "en",
      bookStatus: "IN_PROGRESS",
      publicationStatus: "PUBLISHED",
      authorId: "author-1",
      author: { id: "author-1", username: "author1", displayName: "Author One", avatarUrl: null },
      chapters: [],
    })

    const result = await getBookPageData("book-1")

    expect(result.book?.isViewerAuthor).toBe(false)
    expect(result.book?.isSavedByViewer).toBe(false)
    expect(result.book?.viewerBetaStatus).toBeNull()
    expect(mockPrisma.library.findUnique).not.toHaveBeenCalled()
  })

  it("resolves viewer flags for an authenticated non-author reader", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "reader-1", email: "r@test.com", username: "reader1", avatarUrl: null },
    } as any)

    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "My Book",
      synopsis: null,
      coverUrl: null,
      genres: [],
      language: "en",
      bookStatus: "IN_PROGRESS",
      publicationStatus: "PUBLISHED",
      authorId: "author-1",
      author: { id: "author-1", username: "author1", displayName: "Author One", avatarUrl: null },
      chapters: [],
    })
    mockPrisma.library.findUnique.mockResolvedValue({ id: "lib-1" })
    mockPrisma.betaReader.findUnique.mockResolvedValue({ status: "PENDING" })

    const result = await getBookPageData("book-1")

    expect(result.book?.isViewerAuthor).toBe(false)
    expect(result.book?.isSavedByViewer).toBe(true)
    expect(result.book?.viewerBetaStatus).toBe("PENDING")
  })

  it("marks the author as such without checking library/beta state", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "author-1", email: "a@test.com", username: "author1", avatarUrl: null },
    } as any)

    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "My Book",
      synopsis: null,
      coverUrl: null,
      genres: [],
      language: "en",
      bookStatus: "IN_PROGRESS",
      publicationStatus: "PUBLISHED",
      authorId: "author-1",
      author: { id: "author-1", username: "author1", displayName: "Author One", avatarUrl: null },
      chapters: [],
    })
    mockPrisma.library.findUnique.mockResolvedValue(null)
    mockPrisma.betaReader.findUnique.mockResolvedValue(null)

    const result = await getBookPageData("book-1")

    expect(result.book?.isViewerAuthor).toBe(true)
  })

  it("surfaces the Unsplash photographer credit when the cover used a stock photo", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "My Book",
      synopsis: null,
      coverUrl: null,
      genres: [],
      language: "en",
      bookStatus: "IN_PROGRESS",
      publicationStatus: "PUBLISHED",
      authorId: "author-1",
      author: { id: "author-1", username: "author1", displayName: "Author One", avatarUrl: null },
      chapters: [],
      coverDesign: {
        backgroundType: "STOCK",
        stockPhotographerName: "Jane Doe",
        stockPhotographerUrl: "https://unsplash.com/@jane",
      },
    })

    const result = await getBookPageData("book-1")

    expect(result.book?.coverPhotoCredit).toEqual({
      name: "Jane Doe",
      url: "https://unsplash.com/@jane",
    })
  })

  it("omits the photo credit for a preset or uploaded cover background", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      id: "book-1",
      title: "My Book",
      synopsis: null,
      coverUrl: null,
      genres: [],
      language: "en",
      bookStatus: "IN_PROGRESS",
      publicationStatus: "PUBLISHED",
      authorId: "author-1",
      author: { id: "author-1", username: "author1", displayName: "Author One", avatarUrl: null },
      chapters: [],
      coverDesign: { backgroundType: "PRESET", stockPhotographerName: null, stockPhotographerUrl: null },
    })

    const result = await getBookPageData("book-1")

    expect(result.book?.coverPhotoCredit).toBeNull()
  })
})
