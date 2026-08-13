import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  requestBeta,
  approveBeta,
  rejectBeta,
  revokeBeta,
  inviteBeta,
  getBetaReaders,
  createInlineComment,
  resolveInlineComment,
  replyToComment,
  createChapterReview,
  getChapterComments,
  getChapterReviews,
} from "./beta"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }))

const mp = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

const SESSION = {
  user: { id: "user-1", email: "a@test.com", username: "author1", avatarUrl: null },
}
const OTHER_SESSION = {
  user: { id: "user-2", email: "b@test.com", username: "reader1", avatarUrl: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

// ─── requestBeta ─────────────────────────────────────────────────────────────

describe("requestBeta", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await requestBeta("book-1", "I love this book")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when motivation is empty", async () => {
    const result = await requestBeta("book-1", "   ")
    expect(result.error).toBe("Motivation message is required")
    expect(mp.betaReader.create).not.toHaveBeenCalled()
  })

  it("returns error when motivation exceeds 500 characters", async () => {
    const result = await requestBeta("book-1", "x".repeat(501))
    expect(result.error).toContain("500")
  })

  it("returns error when book not found", async () => {
    mp.book.findUnique.mockResolvedValue(null)
    const result = await requestBeta("book-1", "I want to read this")
    expect(result.error).toBe("Book not found")
  })

  it("returns error when user is the author", async () => {
    mp.book.findUnique.mockResolvedValue({
      authorId: "user-1",
      publicationStatus: "BETA",
      title: "My Book",
    })
    const result = await requestBeta("book-1", "I want to read this")
    expect(result.error).toContain("own book")
  })

  it("returns error when book is DRAFT", async () => {
    mp.book.findUnique.mockResolvedValue({
      authorId: "other",
      publicationStatus: "DRAFT",
      title: "Draft Book",
    })
    const result = await requestBeta("book-1", "I want to read this")
    expect(result.error).toContain("not accepting")
  })

  it("returns error when user already has a request", async () => {
    mp.book.findUnique.mockResolvedValue({
      authorId: "other",
      publicationStatus: "BETA",
      title: "Good Book",
    })
    mp.betaReader.findUnique.mockResolvedValue({ id: "br-1" })
    const result = await requestBeta("book-1", "I want to read this")
    expect(result.error).toContain("already")
  })

  it("creates beta request and returns success", async () => {
    mp.book.findUnique.mockResolvedValue({
      authorId: "other",
      publicationStatus: "BETA",
      title: "Good Book",
    })
    mp.betaReader.findUnique.mockResolvedValue(null)
    mp.betaReader.create.mockResolvedValue({ id: "br-new" })
    mp.notification.create.mockResolvedValue({})

    const result = await requestBeta("book-1", "I love this genre")
    expect(result.success).toBe(true)
    expect(mp.betaReader.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookId: "book-1",
          userId: "user-1",
          motivationMessage: "I love this genre",
        }),
      })
    )
  })
})

// ─── approveBeta ─────────────────────────────────────────────────────────────

describe("approveBeta", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await approveBeta("br-1")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when betaReader not found or user is not the author", async () => {
    mp.betaReader.findUnique.mockResolvedValue({
      userId: "user-2",
      book: { id: "book-1", authorId: "other-user", title: "Book" },
    })
    const result = await approveBeta("br-1")
    expect(result.error).toBe("Not found")
    expect(mp.betaReader.update).not.toHaveBeenCalled()
  })

  it("approves beta reader and sends notification", async () => {
    mp.betaReader.findUnique.mockResolvedValue({
      userId: "user-2",
      book: { id: "book-1", authorId: "user-1", title: "Book" },
    })
    mp.betaReader.update.mockResolvedValue({})
    mp.notification.create.mockResolvedValue({})

    const result = await approveBeta("br-1")
    expect(result.success).toBe(true)
    expect(mp.betaReader.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "APPROVED" } })
    )
  })
})

// ─── rejectBeta ──────────────────────────────────────────────────────────────

describe("rejectBeta", () => {
  it("rejects beta reader and sends notification", async () => {
    mp.betaReader.findUnique.mockResolvedValue({
      userId: "user-2",
      book: { id: "book-1", authorId: "user-1", title: "Book" },
    })
    mp.betaReader.update.mockResolvedValue({})
    mp.notification.create.mockResolvedValue({})

    const result = await rejectBeta("br-1")
    expect(result.success).toBe(true)
    expect(mp.betaReader.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "REJECTED" } })
    )
  })
})

// ─── revokeBeta ──────────────────────────────────────────────────────────────

describe("revokeBeta", () => {
  it("sets status to REJECTED on revoke", async () => {
    mp.betaReader.findUnique.mockResolvedValue({
      book: { id: "book-1", authorId: "user-1" },
    })
    mp.betaReader.update.mockResolvedValue({})

    const result = await revokeBeta("br-1")
    expect(result.success).toBe(true)
    expect(mp.betaReader.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "REJECTED" } })
    )
  })
})

// ─── inviteBeta ──────────────────────────────────────────────────────────────

describe("inviteBeta", () => {
  it("returns error when book not found or user is not the author", async () => {
    mp.book.findUnique.mockResolvedValue(null)
    const result = await inviteBeta("book-1", "reader@test.com")
    expect(result.error).toBe("Not found")
  })

  it("returns error when invited user not found", async () => {
    mp.book.findUnique.mockResolvedValue({ authorId: "user-1", title: "Book" })
    mp.user.findFirst.mockResolvedValue(null)
    const result = await inviteBeta("book-1", "nobody@test.com")
    expect(result.error).toBe("User not found")
  })

  it("returns error when inviting self", async () => {
    mp.book.findUnique.mockResolvedValue({ authorId: "user-1", title: "Book" })
    mp.user.findFirst.mockResolvedValue({ id: "user-1" })
    const result = await inviteBeta("book-1", "author1")
    expect(result.error).toContain("yourself")
  })

  it("returns error when user is already approved", async () => {
    mp.book.findUnique.mockResolvedValue({ authorId: "user-1", title: "Book" })
    mp.user.findFirst.mockResolvedValue({ id: "user-2" })
    mp.betaReader.findUnique.mockResolvedValue({ id: "br-1", status: "APPROVED" })
    const result = await inviteBeta("book-1", "reader1")
    expect(result.error).toContain("already")
  })

  it("creates new APPROVED beta reader on successful invite", async () => {
    mp.book.findUnique.mockResolvedValue({ authorId: "user-1", title: "Book" })
    mp.user.findFirst.mockResolvedValue({ id: "user-2" })
    mp.betaReader.findUnique.mockResolvedValue(null)
    mp.betaReader.create.mockResolvedValue({ id: "br-new" })
    mp.notification.create.mockResolvedValue({})

    const result = await inviteBeta("book-1", "reader1")
    expect(result.success).toBe(true)
    expect(mp.betaReader.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED" }) })
    )
  })

  it("re-approves a previously rejected user", async () => {
    mp.book.findUnique.mockResolvedValue({ authorId: "user-1", title: "Book" })
    mp.user.findFirst.mockResolvedValue({ id: "user-2" })
    mp.betaReader.findUnique.mockResolvedValue({ id: "br-1", status: "REJECTED" })
    mp.betaReader.update.mockResolvedValue({})
    mp.notification.create.mockResolvedValue({})

    const result = await inviteBeta("book-1", "reader1")
    expect(result.success).toBe(true)
    expect(mp.betaReader.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "APPROVED" } })
    )
  })
})

// ─── getBetaReaders ──────────────────────────────────────────────────────────

describe("getBetaReaders", () => {
  it("returns error when user is not the author", async () => {
    mp.book.findUnique.mockResolvedValue({ authorId: "other-user" })
    const result = await getBetaReaders("book-1")
    expect(result.error).toBe("Not found")
  })

  it("groups readers by status", async () => {
    mp.book.findUnique.mockResolvedValue({ authorId: "user-1" })
    mp.betaReader.findMany.mockResolvedValue([
      { id: "br-1", status: "PENDING", motivationMessage: "Hi", createdAt: new Date(), user: { id: "u2", username: "a", displayName: "A", avatarUrl: null } },
      { id: "br-2", status: "APPROVED", motivationMessage: "Yes", createdAt: new Date(), user: { id: "u3", username: "b", displayName: "B", avatarUrl: null } },
      { id: "br-3", status: "REJECTED", motivationMessage: "No", createdAt: new Date(), user: { id: "u4", username: "c", displayName: "C", avatarUrl: null } },
    ])

    const result = await getBetaReaders("book-1")
    expect(result.pending).toHaveLength(1)
    expect(result.approved).toHaveLength(1)
    expect(result.rejected).toHaveLength(1)
  })
})

// ─── createInlineComment ─────────────────────────────────────────────────────

describe("createInlineComment", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await createInlineComment("ch-1", "text", 1, 5, "comment")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when content is empty", async () => {
    const result = await createInlineComment("ch-1", "text", 1, 5, "  ")
    expect(result.error).toBe("Comment cannot be empty")
  })

  it("returns error when chapter not found", async () => {
    mp.chapter.findUnique.mockResolvedValue(null)
    const result = await createInlineComment("ch-1", "text", 1, 5, "Great point!")
    expect(result.error).toBe("Chapter not found")
  })

  it("returns error when user is not an approved beta reader", async () => {
    mp.chapter.findUnique.mockResolvedValue({
      bookId: "book-1",
      title: "Ch 1",
      book: { authorId: "other", title: "Book" },
    })
    mp.betaReader.findUnique.mockResolvedValue({ id: "br-1", status: "PENDING" })
    const result = await createInlineComment("ch-1", "text", 1, 5, "Great point!")
    expect(result.error).toBe("Access denied")
  })

  it("creates comment and returns commentId", async () => {
    mp.chapter.findUnique.mockResolvedValue({
      bookId: "book-1",
      title: "Ch 1",
      book: { authorId: "other", title: "Book" },
    })
    mp.betaReader.findUnique.mockResolvedValue({ id: "br-1", status: "APPROVED" })
    mp.inlineComment.create.mockResolvedValue({ id: "comment-new" })
    mp.notification.create.mockResolvedValue({})

    const result = await createInlineComment("ch-1", "selected text", 10, 22, "Great point!")
    expect(result.success).toBe(true)
    expect(result.commentId).toBe("comment-new")
    expect(mp.inlineComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          chapterId: "ch-1",
          betaReaderId: "br-1",
          selectedText: "selected text",
          fromPos: 10,
          toPos: 22,
          content: "Great point!",
        }),
      })
    )
  })
})

// ─── resolveInlineComment ────────────────────────────────────────────────────

describe("resolveInlineComment", () => {
  it("returns error when user is not the author", async () => {
    mp.inlineComment.findUnique.mockResolvedValue({
      chapter: { id: "ch-1", book: { id: "book-1", authorId: "other" } },
    })
    const result = await resolveInlineComment("comment-1")
    expect(result.error).toBe("Not found")
  })

  it("resolves the comment on success", async () => {
    mp.inlineComment.findUnique.mockResolvedValue({
      chapter: { id: "ch-1", book: { id: "book-1", authorId: "user-1" } },
    })
    mp.inlineComment.update.mockResolvedValue({})

    const result = await resolveInlineComment("comment-1")
    expect(result.success).toBe(true)
    expect(mp.inlineComment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { resolved: true } })
    )
  })
})

// ─── replyToComment ──────────────────────────────────────────────────────────

describe("replyToComment", () => {
  it("returns error for empty reply", async () => {
    const result = await replyToComment("comment-1", "  ")
    expect(result.error).toBe("Reply cannot be empty")
  })

  it("returns error when user is not the author", async () => {
    mp.inlineComment.findUnique.mockResolvedValue({
      betaReader: { userId: "user-2" },
      chapter: {
        id: "ch-1",
        title: "Ch 1",
        book: { id: "book-1", title: "Book", authorId: "other" },
      },
    })
    const result = await replyToComment("comment-1", "Thanks!")
    expect(result.error).toBe("Not found")
  })

  it("creates reply and notifies beta reader", async () => {
    mp.inlineComment.findUnique.mockResolvedValue({
      betaReader: { userId: "user-2" },
      chapter: {
        id: "ch-1",
        title: "Ch 1",
        book: { id: "book-1", title: "Book", authorId: "user-1" },
      },
    })
    mp.commentReply.create.mockResolvedValue({ id: "reply-1" })
    mp.notification.create.mockResolvedValue({})

    const result = await replyToComment("comment-1", "Thanks for the feedback!")
    expect(result.success).toBe(true)
    expect(mp.commentReply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commentId: "comment-1",
          authorId: "user-1",
          content: "Thanks for the feedback!",
        }),
      })
    )
  })
})

// ─── createChapterReview ─────────────────────────────────────────────────────

describe("createChapterReview", () => {
  it("returns error when content is empty", async () => {
    const result = await createChapterReview("ch-1", "")
    expect(result.error).toBe("Review cannot be empty")
  })

  it("returns error when content exceeds 1000 characters", async () => {
    const result = await createChapterReview("ch-1", "x".repeat(1001))
    expect(result.error).toContain("1000")
  })

  it("returns error when chapter not found", async () => {
    mp.chapter.findUnique.mockResolvedValue(null)
    const result = await createChapterReview("ch-1", "Great chapter!")
    expect(result.error).toBe("Chapter not found")
  })

  it("returns error when user is not an approved beta reader", async () => {
    mp.chapter.findUnique.mockResolvedValue({
      bookId: "book-1",
      title: "Ch 1",
      book: { authorId: "other", title: "Book" },
    })
    mp.betaReader.findUnique.mockResolvedValue(null)
    const result = await createChapterReview("ch-1", "Great chapter!")
    expect(result.error).toBe("Access denied")
  })

  it("returns error when review already exists", async () => {
    mp.chapter.findUnique.mockResolvedValue({
      bookId: "book-1",
      title: "Ch 1",
      book: { authorId: "other", title: "Book" },
    })
    mp.betaReader.findUnique.mockResolvedValue({ id: "br-1", status: "APPROVED" })
    mp.chapterReview.findUnique.mockResolvedValue({ id: "rev-1", content: "Already reviewed" })
    const result = await createChapterReview("ch-1", "Another review")
    expect(result.error).toContain("already")
  })

  it("creates review on success", async () => {
    mp.chapter.findUnique.mockResolvedValue({
      bookId: "book-1",
      title: "Ch 1",
      book: { authorId: "other", title: "Book" },
    })
    mp.betaReader.findUnique.mockResolvedValue({ id: "br-1", status: "APPROVED" })
    mp.chapterReview.findUnique.mockResolvedValue(null)
    mp.chapterReview.create.mockResolvedValue({ id: "rev-new" })
    mp.notification.create.mockResolvedValue({})

    const result = await createChapterReview("ch-1", "Loved the pacing!")
    expect(result.success).toBe(true)
    expect(mp.chapterReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ chapterId: "ch-1", betaReaderId: "br-1" }),
      })
    )
  })
})

// ─── getChapterComments ──────────────────────────────────────────────────────

describe("getChapterComments", () => {
  it("returns error when user is not the author", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "other" } })
    const result = await getChapterComments("ch-1")
    expect(result.error).toBe("Not found")
  })

  it("returns comments ordered by position", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "user-1" } })
    mp.inlineComment.findMany.mockResolvedValue([
      {
        id: "c-1",
        selectedText: "text",
        fromPos: 5,
        toPos: 9,
        content: "comment",
        resolved: false,
        createdAt: new Date(),
        betaReader: { id: "br-1", user: { username: "reader1", displayName: "Reader", avatarUrl: null } },
        replies: [],
      },
    ])

    const result = await getChapterComments("ch-1")
    expect(result.comments).toHaveLength(1)
    expect(result.comments?.[0].fromPos).toBe(5)
  })
})

describe("getChapterReviews", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getChapterReviews("ch-1")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when the viewer is not the author", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "other" } })
    const result = await getChapterReviews("ch-1")
    expect(result.error).toBe("Not found")
  })

  it("returns the reviews for the author", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "user-1" } })
    mp.chapterReview.findMany.mockResolvedValue([
      {
        id: "r-1",
        content: "Great chapter!",
        createdAt: new Date(),
        betaReader: { id: "br-1", user: { username: "reader1", displayName: "Reader", avatarUrl: null } },
      },
    ])

    const result = await getChapterReviews("ch-1")
    expect(result.reviews).toHaveLength(1)
    expect(result.reviews?.[0].content).toBe("Great chapter!")
  })
})
