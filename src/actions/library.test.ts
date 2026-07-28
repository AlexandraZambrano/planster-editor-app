import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getUserShelves,
  createShelf,
  renameShelf,
  toggleShelfVisibility,
  deleteShelf,
  saveToLibrary,
  removeFromLibrary,
  rateBook,
  addBookToShelf,
  removeBookFromShelf,
  getLibraryBooks,
} from "./library"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }))

const mockPrisma = prisma as unknown as {
  shelf: Record<string, ReturnType<typeof vi.fn>>
  library: Record<string, ReturnType<typeof vi.fn>>
  shelfBook: Record<string, ReturnType<typeof vi.fn>>
  book: Record<string, ReturnType<typeof vi.fn>>
}

const SESSION = {
  user: { id: "user-1", email: "a@test.com", username: "user1", avatarUrl: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("getUserShelves", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getUserShelves()
    expect(result.error).toBe("Unauthorized")
  })

  it("maps shelves with book counts", async () => {
    mockPrisma.shelf.findMany.mockResolvedValue([
      { id: "s1", name: "Reading now", isPublic: false, isSystem: true, _count: { shelfBooks: 2 } },
    ])
    const result = await getUserShelves()
    expect(result.shelves).toEqual([
      { id: "s1", name: "Reading now", isPublic: false, isSystem: true, bookCount: 2 },
    ])
  })
})

describe("createShelf", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await createShelf("My shelf")
    expect(result.error).toBe("Unauthorized")
    expect(mockPrisma.shelf.create).not.toHaveBeenCalled()
  })

  it("returns error for empty name", async () => {
    const result = await createShelf("   ")
    expect(result.error).toBe("Shelf name is required")
    expect(mockPrisma.shelf.create).not.toHaveBeenCalled()
  })

  it("returns error for name over 50 characters", async () => {
    const result = await createShelf("a".repeat(51))
    expect(result.error).toContain("50")
    expect(mockPrisma.shelf.create).not.toHaveBeenCalled()
  })

  it("creates a custom shelf", async () => {
    mockPrisma.shelf.create.mockResolvedValue({ id: "shelf-1" })
    const result = await createShelf("Favorites")
    expect(mockPrisma.shelf.create).toHaveBeenCalledWith({
      data: { userId: "user-1", name: "Favorites", isSystem: false },
    })
    expect(result.shelfId).toBe("shelf-1")
  })
})

describe("renameShelf", () => {
  it("returns error when shelf not found", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue(null)
    const result = await renameShelf("shelf-1", "New name")
    expect(result.error).toBe("Not found")
  })

  it("returns error when shelf belongs to another user", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "other-user", isSystem: false })
    const result = await renameShelf("shelf-1", "New name")
    expect(result.error).toBe("Not found")
  })

  it("returns error for system shelves", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1", isSystem: true })
    const result = await renameShelf("shelf-1", "New name")
    expect(result.error).toBe("System shelves cannot be renamed")
    expect(mockPrisma.shelf.update).not.toHaveBeenCalled()
  })

  it("renames a custom shelf", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1", isSystem: false })
    const result = await renameShelf("shelf-1", "New name")
    expect(mockPrisma.shelf.update).toHaveBeenCalledWith({
      where: { id: "shelf-1" },
      data: { name: "New name" },
    })
    expect(result.success).toBe(true)
  })
})

describe("toggleShelfVisibility", () => {
  it("returns error when not owner", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "other-user" })
    const result = await toggleShelfVisibility("shelf-1", true)
    expect(result.error).toBe("Not found")
  })

  it("updates visibility", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1" })
    const result = await toggleShelfVisibility("shelf-1", true)
    expect(mockPrisma.shelf.update).toHaveBeenCalledWith({
      where: { id: "shelf-1" },
      data: { isPublic: true },
    })
    expect(result.success).toBe(true)
  })
})

describe("deleteShelf", () => {
  it("returns error for system shelves", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1", isSystem: true })
    const result = await deleteShelf("shelf-1")
    expect(result.error).toBe("System shelves cannot be deleted")
    expect(mockPrisma.shelf.delete).not.toHaveBeenCalled()
  })

  it("deletes a custom shelf", async () => {
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1", isSystem: false })
    const result = await deleteShelf("shelf-1")
    expect(mockPrisma.shelf.delete).toHaveBeenCalledWith({ where: { id: "shelf-1" } })
    expect(result.success).toBe(true)
  })
})

describe("saveToLibrary", () => {
  it("returns error when book not found", async () => {
    mockPrisma.book.findUnique.mockResolvedValue(null)
    const result = await saveToLibrary("book-1")
    expect(result.error).toBe("Book not found")
  })

  it("returns error when book is not published", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      authorId: "author-1",
      title: "Book",
      publicationStatus: "DRAFT",
    })
    const result = await saveToLibrary("book-1")
    expect(result.error).toContain("not available")
  })

  it("returns existing library id without creating a duplicate", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      authorId: "author-1",
      title: "Book",
      publicationStatus: "PUBLISHED",
    })
    mockPrisma.library.findUnique.mockResolvedValue({ id: "lib-1" })
    const result = await saveToLibrary("book-1")
    expect(mockPrisma.library.create).not.toHaveBeenCalled()
    expect(result.libraryId).toBe("lib-1")
  })

  it("creates a library entry and notifies the author", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      authorId: "author-1",
      title: "Book",
      publicationStatus: "PUBLISHED",
    })
    mockPrisma.library.findUnique.mockResolvedValue(null)
    mockPrisma.library.create.mockResolvedValue({ id: "lib-1" })

    const result = await saveToLibrary("book-1")

    expect(mockPrisma.library.create).toHaveBeenCalledWith({
      data: { userId: "user-1", bookId: "book-1" },
    })
    expect(createNotification).toHaveBeenCalledWith("author-1", "BOOK_SAVED", {
      bookId: "book-1",
      bookTitle: "Book",
      actorName: "user1",
      actorAvatarUrl: null,
    })
    expect(result.libraryId).toBe("lib-1")
  })

  it("does not notify when the author saves their own book", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      authorId: "user-1",
      title: "Book",
      publicationStatus: "PUBLISHED",
    })
    mockPrisma.library.findUnique.mockResolvedValue(null)
    mockPrisma.library.create.mockResolvedValue({ id: "lib-1" })

    await saveToLibrary("book-1")

    expect(createNotification).not.toHaveBeenCalled()
  })
})

describe("removeFromLibrary", () => {
  it("returns error when not saved", async () => {
    mockPrisma.library.findUnique.mockResolvedValue(null)
    const result = await removeFromLibrary("book-1")
    expect(result.error).toBe("Not found")
  })

  it("removes the library entry", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ id: "lib-1" })
    const result = await removeFromLibrary("book-1")
    expect(mockPrisma.library.delete).toHaveBeenCalledWith({ where: { id: "lib-1" } })
    expect(result.success).toBe(true)
  })
})

describe("rateBook", () => {
  it("returns error for invalid rating", async () => {
    const result = await rateBook("book-1", 3.3)
    expect(result.error).toBe("Invalid rating")
    expect(mockPrisma.library.update).not.toHaveBeenCalled()
  })

  it("returns error when book is not in the library", async () => {
    mockPrisma.library.findUnique.mockResolvedValue(null)
    const result = await rateBook("book-1", 4)
    expect(result.error).toContain("Save this book")
  })

  it("accepts half-star ratings", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ id: "lib-1" })
    const result = await rateBook("book-1", 3.5)
    expect(mockPrisma.library.update).toHaveBeenCalledWith({
      where: { id: "lib-1" },
      data: { rating: 3.5 },
    })
    expect(result.success).toBe(true)
  })
})

describe("addBookToShelf", () => {
  it("returns error when library entry belongs to another user", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ userId: "other-user" })
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1" })
    const result = await addBookToShelf("lib-1", "shelf-1")
    expect(result.error).toBe("Not found")
  })

  it("upserts membership and applies system shelf exclusion", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ userId: "user-1" })
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1", name: "Reading now", isSystem: true })
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: "want-to-read-shelf" })

    const result = await addBookToShelf("lib-1", "reading-now-shelf")

    expect(mockPrisma.shelfBook.upsert).toHaveBeenCalledWith({
      where: { shelfId_libraryId: { shelfId: "reading-now-shelf", libraryId: "lib-1" } },
      create: { shelfId: "reading-now-shelf", libraryId: "lib-1" },
      update: {},
    })
    expect(mockPrisma.shelf.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", name: "Want to read", isSystem: true },
      select: { id: true },
    })
    expect(mockPrisma.shelfBook.deleteMany).toHaveBeenCalledWith({
      where: { libraryId: "lib-1", shelfId: "want-to-read-shelf" },
    })
    expect(result.success).toBe(true)
  })

  it("removes 'Reading now' when adding to 'Read'", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ userId: "user-1" })
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1", name: "Read", isSystem: true })
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: "reading-now-shelf" })

    await addBookToShelf("lib-1", "read-shelf")

    expect(mockPrisma.shelf.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", name: "Reading now", isSystem: true },
      select: { id: true },
    })
    expect(mockPrisma.shelfBook.deleteMany).toHaveBeenCalledWith({
      where: { libraryId: "lib-1", shelfId: "reading-now-shelf" },
    })
  })

  it("does not apply exclusion for custom shelves", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ userId: "user-1" })
    mockPrisma.shelf.findUnique.mockResolvedValue({ userId: "user-1", name: "Favorites", isSystem: false })

    await addBookToShelf("lib-1", "favorites-shelf")

    expect(mockPrisma.shelf.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.shelfBook.deleteMany).not.toHaveBeenCalled()
  })
})

describe("removeBookFromShelf", () => {
  it("returns error when library entry belongs to another user", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ userId: "other-user" })
    const result = await removeBookFromShelf("lib-1", "shelf-1")
    expect(result.error).toBe("Not found")
  })

  it("removes the shelf membership", async () => {
    mockPrisma.library.findUnique.mockResolvedValue({ userId: "user-1" })
    const result = await removeBookFromShelf("lib-1", "shelf-1")
    expect(mockPrisma.shelfBook.deleteMany).toHaveBeenCalledWith({
      where: { libraryId: "lib-1", shelfId: "shelf-1" },
    })
    expect(result.success).toBe(true)
  })
})

describe("getLibraryBooks", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getLibraryBooks()
    expect(result.error).toBe("Unauthorized")
  })

  it("maps entries and shelf ids", async () => {
    mockPrisma.library.findMany.mockResolvedValue([
      {
        id: "lib-1",
        rating: 4.5,
        addedAt: new Date("2026-01-01"),
        book: {
          id: "book-1",
          title: "Book",
          coverUrl: null,
          bookStatus: "IN_PROGRESS",
          genres: ["Fantasy"],
          author: { username: "author1", displayName: "Author One" },
        },
        shelfBooks: [{ shelfId: "shelf-1" }, { shelfId: "shelf-2" }],
      },
    ])

    const result = await getLibraryBooks()

    expect(result.entries).toEqual([
      {
        libraryId: "lib-1",
        rating: 4.5,
        addedAt: new Date("2026-01-01"),
        book: {
          id: "book-1",
          title: "Book",
          coverUrl: null,
          bookStatus: "IN_PROGRESS",
          genres: ["Fantasy"],
          author: { username: "author1", displayName: "Author One" },
        },
        shelfIds: ["shelf-1", "shelf-2"],
      },
    ])
  })

  it("applies shelf, genre, and status filters", async () => {
    mockPrisma.library.findMany.mockResolvedValue([])

    await getLibraryBooks({ shelfId: "shelf-1", genre: "Fantasy", bookStatus: "COMPLETE", sortBy: "title" })

    expect(mockPrisma.library.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          book: { genres: { has: "Fantasy" }, bookStatus: "COMPLETE" },
          shelfBooks: { some: { shelfId: "shelf-1" } },
        },
        orderBy: { book: { title: "asc" } },
      })
    )
  })
})
