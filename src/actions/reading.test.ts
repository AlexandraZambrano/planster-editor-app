import { describe, it, expect, vi, beforeEach } from "vitest"
import { logReadingActivity, getContinueReading, getReadingStreak } from "./reading"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockPrisma = prisma as unknown as {
  readingProgress: Record<string, ReturnType<typeof vi.fn>>
  readingActivity: Record<string, ReturnType<typeof vi.fn>>
}

const SESSION = { user: { id: "user-1", email: "a@test.com", username: "user1", avatarUrl: null } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("logReadingActivity", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await logReadingActivity("book-1", "chapter-1")
    expect(result.error).toBe("Unauthorized")
  })

  it("upserts reading progress and today's activity", async () => {
    const result = await logReadingActivity("book-1", "chapter-1")

    expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_bookId: { userId: "user-1", bookId: "book-1" } },
        create: { userId: "user-1", bookId: "book-1", chapterId: "chapter-1" },
        update: { chapterId: "chapter-1" },
      })
    )
    expect(mockPrisma.readingActivity.upsert).toHaveBeenCalled()
    expect(result.success).toBe(true)
  })
})

describe("getContinueReading", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getContinueReading()
    expect(result.error).toBe("Unauthorized")
  })

  it("maps the two most recently read books", async () => {
    mockPrisma.readingProgress.findMany.mockResolvedValue([
      {
        chapterId: "chapter-1",
        chapter: { title: "Chapter One" },
        book: { id: "book-1", title: "My Book", synopsis: "A tale", coverUrl: null },
      },
    ])

    const result = await getContinueReading()

    expect(mockPrisma.readingProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 2 })
    )
    expect(result.entries).toEqual([
      {
        bookId: "book-1",
        bookTitle: "My Book",
        bookSynopsis: "A tale",
        coverUrl: null,
        chapterId: "chapter-1",
        chapterTitle: "Chapter One",
      },
    ])
  })
})

describe("getReadingStreak", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getReadingStreak()
    expect(result.error).toBe("Unauthorized")
  })

  it("counts consecutive days ending today", async () => {
    const today = new Date()
    const y = today.getUTCFullYear()
    const m = today.getUTCMonth()
    const d = today.getUTCDate()

    const day = (offset: number) => new Date(Date.UTC(y, m, d - offset))

    mockPrisma.readingActivity.findMany.mockResolvedValue([
      { date: day(0) },
      { date: day(1) },
      { date: day(2) },
    ])

    const result = await getReadingStreak()

    expect(result.data?.streak).toBe(3)
    expect(result.data?.weekDays).toHaveLength(7)
    expect(result.data?.weekDays.some((w) => w.isToday)).toBe(true)
  })

  it("returns a streak of 0 when today has no activity", async () => {
    mockPrisma.readingActivity.findMany.mockResolvedValue([])

    const result = await getReadingStreak()

    expect(result.data?.streak).toBe(0)
  })

  it("stops counting at the first gap", async () => {
    const today = new Date()
    const y = today.getUTCFullYear()
    const m = today.getUTCMonth()
    const d = today.getUTCDate()
    const day = (offset: number) => new Date(Date.UTC(y, m, d - offset))

    // Today and yesterday read, but 2 days ago missing — streak should be 2
    mockPrisma.readingActivity.findMany.mockResolvedValue([
      { date: day(0) },
      { date: day(1) },
      { date: day(3) },
    ])

    const result = await getReadingStreak()

    expect(result.data?.streak).toBe(2)
  })
})
