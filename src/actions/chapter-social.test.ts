import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  postChapterComment,
  deleteChapterComment,
  rateChapter,
  getChapterSocial,
} from "./chapter-social"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }))

const mp = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

const SESSION = {
  user: { id: "user-1", email: "a@test.com", username: "reader1", avatarUrl: null },
}

const PUBLISHED_CHAPTER = {
  id: "chapter-1",
  title: "Chapter One",
  visibility: "PUBLISHED",
  bookId: "book-1",
  book: { authorId: "author-1", title: "My Book" },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("postChapterComment", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await postChapterComment("chapter-1", "great chapter")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when content is empty", async () => {
    const result = await postChapterComment("chapter-1", "   ")
    expect(result.error).toContain("empty")
  })

  it("returns error when content exceeds 1000 characters", async () => {
    const result = await postChapterComment("chapter-1", "x".repeat(1001))
    expect(result.error).toContain("1000")
  })

  it("returns error when chapter is not PUBLISHED", async () => {
    mp.chapter.findUnique.mockResolvedValue({ ...PUBLISHED_CHAPTER, visibility: "DRAFT" })
    const result = await postChapterComment("chapter-1", "hi")
    expect(result.error).toBe("Chapter not found")
  })

  it("creates the comment and notifies the author", async () => {
    mp.chapter.findUnique.mockResolvedValue(PUBLISHED_CHAPTER)
    mp.chapterComment.create.mockResolvedValue({ id: "comment-1" })
    const result = await postChapterComment("chapter-1", "great chapter")
    expect(result.success).toBe(true)
    expect(mp.chapterComment.create).toHaveBeenCalledWith({
      data: { chapterId: "chapter-1", userId: "user-1", content: "great chapter" },
    })
    expect(createNotification).toHaveBeenCalledWith(
      "author-1",
      "NEW_CHAPTER_COMMENT",
      expect.objectContaining({ chapterId: "chapter-1" })
    )
  })

  it("blocks the author from commenting on their own chapter", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "author-1", email: "a@test.com", username: "author1", avatarUrl: null },
    } as any)
    mp.chapter.findUnique.mockResolvedValue(PUBLISHED_CHAPTER)
    const result = await postChapterComment("chapter-1", "hi")
    expect(result.error).toContain("own chapter")
    expect(mp.chapterComment.create).not.toHaveBeenCalled()
  })
})

describe("deleteChapterComment", () => {
  it("returns error when not the comment's author", async () => {
    mp.chapterComment.findUnique.mockResolvedValue({
      userId: "someone-else",
      chapterId: "chapter-1",
      chapter: { bookId: "book-1" },
    })
    const result = await deleteChapterComment("comment-1")
    expect(result.error).toBe("Not found")
    expect(mp.chapterComment.delete).not.toHaveBeenCalled()
  })

  it("deletes when the viewer owns the comment", async () => {
    mp.chapterComment.findUnique.mockResolvedValue({
      userId: "user-1",
      chapterId: "chapter-1",
      chapter: { bookId: "book-1" },
    })
    const result = await deleteChapterComment("comment-1")
    expect(result.success).toBe(true)
    expect(mp.chapterComment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } })
  })
})

describe("rateChapter", () => {
  it("returns error for an invalid rating", async () => {
    const result = await rateChapter("chapter-1", 3.3)
    expect(result.error).toBe("Invalid rating")
  })

  it("upserts a valid half-star rating", async () => {
    mp.chapter.findUnique.mockResolvedValue(PUBLISHED_CHAPTER)
    const result = await rateChapter("chapter-1", 4.5)
    expect(result.success).toBe(true)
    expect(mp.chapterRating.upsert).toHaveBeenCalledWith({
      where: { chapterId_userId: { chapterId: "chapter-1", userId: "user-1" } },
      create: { chapterId: "chapter-1", userId: "user-1", rating: 4.5 },
      update: { rating: 4.5 },
    })
  })

  it("blocks the author from rating their own chapter", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "author-1", email: "a@test.com", username: "author1", avatarUrl: null },
    } as any)
    mp.chapter.findUnique.mockResolvedValue(PUBLISHED_CHAPTER)
    const result = await rateChapter("chapter-1", 5)
    expect(result.error).toContain("own chapter")
  })
})

describe("getChapterSocial", () => {
  it("returns comments, average rating, and the viewer's own rating", async () => {
    mp.chapterComment.findMany.mockResolvedValue([{ id: "comment-1" }])
    mp.chapterRating.aggregate.mockResolvedValue({ _avg: { rating: 4.2 }, _count: { rating: 5 } })
    mp.chapterRating.findUnique.mockResolvedValue({ rating: 4 })
    const result = await getChapterSocial("chapter-1")
    expect(result.comments).toEqual([{ id: "comment-1" }])
    expect(result.averageRating).toBe(4.2)
    expect(result.ratingCount).toBe(5)
    expect(result.viewerRating).toBe(4)
  })
})
