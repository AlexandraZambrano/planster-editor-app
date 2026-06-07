import { describe, it, expect, vi, beforeEach } from "vitest"
import { createChapter, updateChapterVisibility, deleteChapter, reorderChapters, saveChapterContent } from "./chapters"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockPrisma = prisma as unknown as {
  book: { findUnique: ReturnType<typeof vi.fn> }
  chapter: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
  }
  wordCountLog: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const SESSION = { user: { id: "user-1", email: "a@test.com", username: "user1", avatarUrl: null } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("createChapter", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await createChapter("book-1", "Chapter 1")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when user is not the author", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "other-user", _count: { chapters: 0 } })
    const result = await createChapter("book-1", "Chapter 1")
    expect(result.error).toBe("Not found")
    expect(mockPrisma.chapter.create).not.toHaveBeenCalled()
  })

  it("returns error for empty title", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "user-1", _count: { chapters: 0 } })
    const result = await createChapter("book-1", "   ")
    expect(result.error).toBe("Chapter title is required")
  })

  it("creates chapter with plotNote and correct order", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "user-1", _count: { chapters: 3 } })
    mockPrisma.chapter.create.mockResolvedValue({ id: "chap-4" })

    const result = await createChapter("book-1", "Chapter 4")
    expect(result.chapterId).toBe("chap-4")
    expect(mockPrisma.chapter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookId: "book-1",
          title: "Chapter 4",
          order: 4,
          plotNote: { create: { notes: {} } },
        }),
      })
    )
  })
})

describe("updateChapterVisibility", () => {
  it("returns error when chapter not found or wrong author", async () => {
    mockPrisma.chapter.findUnique.mockResolvedValue(null)
    const result = await updateChapterVisibility("chap-1", "PUBLISHED")
    expect(result.error).toBe("Not found")
  })

  it("updates visibility on success", async () => {
    mockPrisma.chapter.findUnique.mockResolvedValue({
      bookId: "book-1",
      order: 1,
      book: { authorId: "user-1" },
    })
    mockPrisma.chapter.update.mockResolvedValue({})
    const result = await updateChapterVisibility("chap-1", "PUBLISHED")
    expect(result.success).toBe(true)
    expect(mockPrisma.chapter.update).toHaveBeenCalledWith({
      where: { id: "chap-1" },
      data: { visibility: "PUBLISHED" },
    })
  })
})

describe("deleteChapter", () => {
  it("deletes chapter and closes order gap via transaction", async () => {
    mockPrisma.chapter.findUnique.mockResolvedValue({
      bookId: "book-1",
      order: 2,
      book: { authorId: "user-1" },
    })
    mockPrisma.$transaction.mockResolvedValue([{}, {}])

    const result = await deleteChapter("chap-2")
    expect(result.success).toBe(true)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

describe("reorderChapters", () => {
  it("returns error when user is not the author", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "other-user" })
    const result = await reorderChapters("book-1", ["c1", "c2"])
    expect(result.error).toBe("Not found")
  })

  it("updates order for each chapter", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({ authorId: "user-1" })
    mockPrisma.$transaction.mockResolvedValue([{}, {}])
    mockPrisma.chapter.update.mockResolvedValue({})

    const result = await reorderChapters("book-1", ["c2", "c1"])
    expect(result.success).toBe(true)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

describe("saveChapterContent", () => {
  const CHAPTER = {
    bookId: "book-1",
    wordCount: 100,
    book: { authorId: "user-1" },
  }

  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await saveChapterContent("chap-1", {}, 0)
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when chapter not found or user is not author", async () => {
    mockPrisma.chapter.findUnique.mockResolvedValue(null)
    const result = await saveChapterContent("chap-1", {}, 50)
    expect(result.error).toBe("Not found")
  })

  it("updates chapter content and word count, creates new log when none exists", async () => {
    mockPrisma.chapter.findUnique.mockResolvedValue(CHAPTER)
    mockPrisma.chapter.update.mockResolvedValue({})
    mockPrisma.chapter.aggregate = vi.fn().mockResolvedValue({ _sum: { wordCount: 150 } })
    mockPrisma.wordCountLog.findFirst.mockResolvedValue(null)
    mockPrisma.wordCountLog.create.mockResolvedValue({})

    const result = await saveChapterContent("chap-1", { type: "doc" }, 150)

    expect(result.success).toBe(true)
    expect(mockPrisma.chapter.update).toHaveBeenCalledWith({
      where: { id: "chap-1" },
      data: { content: { type: "doc" }, wordCount: 150 },
    })
    expect(mockPrisma.wordCountLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          chapterId: "chap-1",
          wordsDelta: 50,
          totalWordsBook: 150,
        }),
      })
    )
  })

  it("accumulates delta in existing log when one exists for today", async () => {
    mockPrisma.chapter.findUnique.mockResolvedValue(CHAPTER)
    mockPrisma.chapter.update.mockResolvedValue({})
    mockPrisma.chapter.aggregate = vi.fn().mockResolvedValue({ _sum: { wordCount: 200 } })
    mockPrisma.wordCountLog.findFirst.mockResolvedValue({
      id: "log-1",
      wordsDelta: 30,
    })
    mockPrisma.wordCountLog.update.mockResolvedValue({})

    const result = await saveChapterContent("chap-1", { type: "doc" }, 200)

    expect(result.success).toBe(true)
    expect(mockPrisma.wordCountLog.update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { wordsDelta: 130, totalWordsBook: 200 },
    })
  })
})
