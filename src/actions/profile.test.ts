import { describe, it, expect, vi, beforeEach } from "vitest"
import { getPublicProfile } from "./profile"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const mockPrisma = prisma as unknown as {
  user: Record<string, ReturnType<typeof vi.fn>>
  book: Record<string, ReturnType<typeof vi.fn>>
  shelf: Record<string, ReturnType<typeof vi.fn>>
  library: Record<string, ReturnType<typeof vi.fn>>
  follow: Record<string, ReturnType<typeof vi.fn>>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(null)
  mockPrisma.follow.count.mockResolvedValue(0)
  mockPrisma.follow.findUnique.mockResolvedValue(null)
})

describe("getPublicProfile", () => {
  it("returns error when the user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await getPublicProfile("nobody")
    expect(result.error).toBe("Profile not found")
  })

  it("returns published books and public shelves, hiding the library count by default", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      username: "author1",
      displayName: "Author One",
      bio: "I write fantasy.",
      avatarUrl: null,
      showLibraryCount: false,
    })
    mockPrisma.book.findMany.mockResolvedValue([{ id: "book-1", title: "My Book", coverUrl: null }])
    mockPrisma.shelf.findMany.mockResolvedValue([
      { id: "shelf-1", name: "Favorites", _count: { shelfBooks: 3 } },
    ])

    const result = await getPublicProfile("author1")

    expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { authorId: "user-1", publicationStatus: "PUBLISHED" } })
    )
    expect(mockPrisma.shelf.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", isPublic: true } })
    )
    expect(mockPrisma.library.count).not.toHaveBeenCalled()
    expect(result.profile?.libraryCount).toBeNull()
    expect(result.profile?.publicShelves).toEqual([{ id: "shelf-1", name: "Favorites", bookCount: 3 }])
    expect(mockPrisma.library.findMany).not.toHaveBeenCalled()
    expect(result.profile?.ratings).toBeNull()
  })

  it("includes rated books when the user has made ratings public", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      username: "author1",
      displayName: "Author One",
      bio: null,
      avatarUrl: null,
      showLibraryCount: false,
      showRatingsAndReviews: true,
    })
    mockPrisma.book.findMany.mockResolvedValue([])
    mockPrisma.shelf.findMany.mockResolvedValue([])
    mockPrisma.library.findMany.mockResolvedValue([
      { rating: 4.5, book: { id: "book-1", title: "Great Book" } },
    ])

    const result = await getPublicProfile("author1")

    expect(mockPrisma.library.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", rating: { not: null } } })
    )
    expect(result.profile?.ratings).toEqual([
      { bookId: "book-1", bookTitle: "Great Book", rating: 4.5 },
    ])
  })

  it("includes the library count when the user has made it public", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      username: "author1",
      displayName: "Author One",
      bio: null,
      avatarUrl: null,
      showLibraryCount: true,
    })
    mockPrisma.book.findMany.mockResolvedValue([])
    mockPrisma.shelf.findMany.mockResolvedValue([])
    mockPrisma.library.count.mockResolvedValue(12)

    const result = await getPublicProfile("author1")

    expect(mockPrisma.library.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(result.profile?.libraryCount).toBe(12)
  })
})
