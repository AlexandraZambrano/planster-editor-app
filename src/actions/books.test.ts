import { describe, it, expect, vi, beforeEach } from "vitest"
import { createBook, updateBook, updateBookPublicationStatus, deleteBook } from "./books"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockPrisma = prisma as unknown as {
  book: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

const SESSION = { user: { id: "user-1", email: "a@test.com", username: "user1", avatarUrl: null } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

const VALID_BOOK = {
  title: "My Novel",
  synopsis: "A story",
  coverUrl: "",
  genres: ["Fantasy"],
  tags: ["magic"],
  language: "en",
  bookStatus: "IN_PROGRESS" as const,
}

describe("createBook", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await createBook(VALID_BOOK)
    expect(result.error).toBe("Unauthorized")
    expect(mockPrisma.book.create).not.toHaveBeenCalled()
  })

  it("returns error for empty title", async () => {
    const result = await createBook({ ...VALID_BOOK, title: "" })
    expect(result.error).toBeDefined()
    expect(mockPrisma.book.create).not.toHaveBeenCalled()
  })

  it("returns error for title over 200 characters", async () => {
    const result = await createBook({ ...VALID_BOOK, title: "a".repeat(201) })
    expect(result.error).toContain("200")
    expect(mockPrisma.book.create).not.toHaveBeenCalled()
  })

  it("returns error for more than 10 tags", async () => {
    const result = await createBook({ ...VALID_BOOK, tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) })
    expect(result.error).toContain("10")
    expect(mockPrisma.book.create).not.toHaveBeenCalled()
  })

  it("creates book and returns bookId on success", async () => {
    mockPrisma.book.create.mockResolvedValue({ id: "book-123" })
    const result = await createBook(VALID_BOOK)
    expect(result.error).toBeUndefined()
    expect(result.bookId).toBe("book-123")
    expect(mockPrisma.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "My Novel", authorId: "user-1" }),
      })
    )
  })
})

describe("updateBook", () => {
  it("returns error when user is not the author", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "other-user" })
    const result = await updateBook("book-1", VALID_BOOK)
    expect(result.error).toBe("Not found")
    expect(mockPrisma.book.update).not.toHaveBeenCalled()
  })

  it("updates book on success", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "user-1" })
    mockPrisma.book.update.mockResolvedValue({})
    const result = await updateBook("book-1", { ...VALID_BOOK, title: "Updated Title" })
    expect(result.success).toBe(true)
    expect(mockPrisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "book-1" } })
    )
  })
})

describe("updateBookPublicationStatus", () => {
  it("rejects publish when no genres", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "user-1", genres: [] })
    const result = await updateBookPublicationStatus("book-1", "PUBLISHED")
    expect(result.error).toContain("genre")
    expect(mockPrisma.book.update).not.toHaveBeenCalled()
  })

  it("allows DRAFT without genres", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "user-1", genres: [] })
    mockPrisma.book.update.mockResolvedValue({})
    const result = await updateBookPublicationStatus("book-1", "DRAFT")
    expect(result.success).toBe(true)
  })

  it("allows PUBLISHED when genres exist", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "user-1", genres: ["Fantasy"] })
    mockPrisma.book.update.mockResolvedValue({})
    const result = await updateBookPublicationStatus("book-1", "PUBLISHED")
    expect(result.success).toBe(true)
  })
})

describe("deleteBook", () => {
  it("returns requiresConfirmation when book has approved betas", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      authorId: "user-1",
      _count: { betaReaders: 2 },
    })
    const result = await deleteBook("book-1")
    expect(result.requiresConfirmation).toBe(true)
    expect(result.betaCount).toBe(2)
    expect(mockPrisma.book.delete).not.toHaveBeenCalled()
  })

  it("deletes book when force=true even with betas", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      authorId: "user-1",
      _count: { betaReaders: 2 },
    })
    mockPrisma.book.delete.mockResolvedValue({})
    const result = await deleteBook("book-1", true)
    expect(result.success).toBe(true)
    expect(mockPrisma.book.delete).toHaveBeenCalledWith({ where: { id: "book-1" } })
  })

  it("deletes book directly when no betas", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      authorId: "user-1",
      _count: { betaReaders: 0 },
    })
    mockPrisma.book.delete.mockResolvedValue({})
    const result = await deleteBook("book-1")
    expect(result.success).toBe(true)
  })
})
