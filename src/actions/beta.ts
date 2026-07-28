"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

// ─── BETA REQUESTS ──────────────────────────────────────────────────────────

export async function requestBeta(
  bookId: string,
  motivationMessage: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const msg = motivationMessage.trim()
  if (!msg) return { error: "Motivation message is required" }
  if (msg.length > 500) return { error: "Message cannot exceed 500 characters" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      authorId: true,
      publicationStatus: true,
      title: true,
    },
  })
  if (!book) return { error: "Book not found" }
  if (book.authorId === session.user.id) return { error: "You cannot apply as a beta reader to your own book" }
  if (book.publicationStatus === "DRAFT") return { error: "This book is not accepting beta readers" }

  const existing = await prisma.betaReader.findUnique({
    where: { bookId_userId: { bookId, userId: session.user.id } },
  })
  if (existing) return { error: "You already have a beta request for this book" }

  await prisma.betaReader.create({
    data: { bookId, userId: session.user.id, motivationMessage: msg },
  })

  await createNotification(book.authorId, "BETA_REQUEST_RECEIVED", {
    bookId,
    bookTitle: book.title,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  return { success: true }
}

export async function approveBeta(
  betaReaderId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const betaReader = await prisma.betaReader.findUnique({
    where: { id: betaReaderId },
    select: {
      userId: true,
      book: { select: { id: true, authorId: true, title: true } },
    },
  })
  if (!betaReader || betaReader.book.authorId !== session.user.id) return { error: "Not found" }

  await prisma.betaReader.update({ where: { id: betaReaderId }, data: { status: "APPROVED" } })

  await createNotification(betaReader.userId, "BETA_REQUEST_APPROVED", {
    bookId: betaReader.book.id,
    bookTitle: betaReader.book.title,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  revalidatePath(`/write/${betaReader.book.id}`)
  return { success: true }
}

export async function rejectBeta(
  betaReaderId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const betaReader = await prisma.betaReader.findUnique({
    where: { id: betaReaderId },
    select: {
      userId: true,
      book: { select: { id: true, authorId: true, title: true } },
    },
  })
  if (!betaReader || betaReader.book.authorId !== session.user.id) return { error: "Not found" }

  await prisma.betaReader.update({ where: { id: betaReaderId }, data: { status: "REJECTED" } })

  await createNotification(betaReader.userId, "BETA_REQUEST_REJECTED", {
    bookId: betaReader.book.id,
    bookTitle: betaReader.book.title,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  revalidatePath(`/write/${betaReader.book.id}`)
  return { success: true }
}

export async function revokeBeta(
  betaReaderId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const betaReader = await prisma.betaReader.findUnique({
    where: { id: betaReaderId },
    select: { book: { select: { id: true, authorId: true } } },
  })
  if (!betaReader || betaReader.book.authorId !== session.user.id) return { error: "Not found" }

  await prisma.betaReader.update({ where: { id: betaReaderId }, data: { status: "REJECTED" } })

  revalidatePath(`/write/${betaReader.book.id}`)
  return { success: true }
}

export async function inviteBeta(
  bookId: string,
  usernameOrEmail: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const query = usernameOrEmail.trim().toLowerCase()
  if (!query) return { error: "Username or email is required" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true, title: true },
  })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: query }, { email: query }] },
    select: { id: true },
  })
  if (!user) return { error: "User not found" }
  if (user.id === session.user.id) return { error: "You cannot invite yourself" }

  const existing = await prisma.betaReader.findUnique({
    where: { bookId_userId: { bookId, userId: user.id } },
  })

  if (existing) {
    if (existing.status === "APPROVED") return { error: "This user is already an approved beta reader" }
    await prisma.betaReader.update({ where: { id: existing.id }, data: { status: "APPROVED" } })
  } else {
    await prisma.betaReader.create({
      data: {
        bookId,
        userId: user.id,
        motivationMessage: "Invited by the author",
        status: "APPROVED",
      },
    })
  }

  await createNotification(user.id, "BETA_REQUEST_APPROVED", {
    bookId,
    bookTitle: book.title,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  revalidatePath(`/write/${bookId}`)
  return { success: true }
}

// ─── BETA READER LIST ───────────────────────────────────────────────────────

export type BetaReaderEntry = {
  id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  motivationMessage: string
  createdAt: Date
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

export async function getBetaReaders(bookId: string): Promise<{
  error?: string
  pending?: BetaReaderEntry[]
  approved?: BetaReaderEntry[]
  rejected?: BetaReaderEntry[]
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { authorId: true } })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  const readers = await prisma.betaReader.findMany({
    where: { bookId },
    select: {
      id: true,
      status: true,
      motivationMessage: true,
      createdAt: true,
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    pending: readers.filter((r) => r.status === "PENDING"),
    approved: readers.filter((r) => r.status === "APPROVED"),
    rejected: readers.filter((r) => r.status === "REJECTED"),
  }
}

// ─── INLINE COMMENTS ────────────────────────────────────────────────────────

export async function createInlineComment(
  chapterId: string,
  selectedText: string,
  fromPos: number,
  toPos: number,
  content: string
): Promise<{ error?: string; success?: boolean; commentId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const text = content.trim()
  if (!text) return { error: "Comment cannot be empty" }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      bookId: true,
      title: true,
      book: { select: { authorId: true, title: true } },
    },
  })
  if (!chapter) return { error: "Chapter not found" }

  const betaReader = await prisma.betaReader.findUnique({
    where: { bookId_userId: { bookId: chapter.bookId, userId: session.user.id } },
    select: { id: true, status: true },
  })
  if (!betaReader || betaReader.status !== "APPROVED") return { error: "Access denied" }

  const comment = await prisma.inlineComment.create({
    data: {
      chapterId,
      betaReaderId: betaReader.id,
      selectedText,
      fromPos,
      toPos,
      content: text,
    },
  })

  await createNotification(chapter.book.authorId, "NEW_INLINE_COMMENT", {
    bookId: chapter.bookId,
    bookTitle: chapter.book.title,
    chapterId,
    chapterTitle: chapter.title,
    commentId: comment.id,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  return { success: true, commentId: comment.id }
}

export async function resolveInlineComment(
  commentId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const comment = await prisma.inlineComment.findUnique({
    where: { id: commentId },
    select: {
      chapter: { select: { id: true, book: { select: { id: true, authorId: true } } } },
    },
  })
  if (!comment || comment.chapter.book.authorId !== session.user.id) return { error: "Not found" }

  await prisma.inlineComment.update({ where: { id: commentId }, data: { resolved: true } })

  revalidatePath(`/write/${comment.chapter.book.id}/editor/${comment.chapter.id}`)
  return { success: true }
}

export async function replyToComment(
  commentId: string,
  content: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const text = content.trim()
  if (!text) return { error: "Reply cannot be empty" }

  const comment = await prisma.inlineComment.findUnique({
    where: { id: commentId },
    select: {
      betaReader: { select: { userId: true } },
      chapter: {
        select: {
          id: true,
          title: true,
          book: { select: { id: true, title: true, authorId: true } },
        },
      },
    },
  })
  if (!comment || comment.chapter.book.authorId !== session.user.id) return { error: "Not found" }

  await prisma.commentReply.create({
    data: { commentId, authorId: session.user.id, content: text },
  })

  await createNotification(comment.betaReader.userId, "COMMENT_REPLY", {
    bookId: comment.chapter.book.id,
    bookTitle: comment.chapter.book.title,
    chapterId: comment.chapter.id,
    chapterTitle: comment.chapter.title,
    commentId,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  revalidatePath(`/write/${comment.chapter.book.id}/editor/${comment.chapter.id}`)
  return { success: true }
}

// ─── CHAPTER REVIEWS ────────────────────────────────────────────────────────

export async function createChapterReview(
  chapterId: string,
  content: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const text = content.trim()
  if (!text) return { error: "Review cannot be empty" }
  if (text.length > 1000) return { error: "Review cannot exceed 1000 characters" }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      bookId: true,
      title: true,
      book: { select: { authorId: true, title: true } },
    },
  })
  if (!chapter) return { error: "Chapter not found" }

  const betaReader = await prisma.betaReader.findUnique({
    where: { bookId_userId: { bookId: chapter.bookId, userId: session.user.id } },
    select: { id: true, status: true },
  })
  if (!betaReader || betaReader.status !== "APPROVED") return { error: "Access denied" }

  const existing = await prisma.chapterReview.findUnique({
    where: { chapterId_betaReaderId: { chapterId, betaReaderId: betaReader.id } },
  })
  if (existing) return { error: "You have already submitted a review for this chapter" }

  await prisma.chapterReview.create({
    data: { chapterId, betaReaderId: betaReader.id, content: text },
  })

  await createNotification(chapter.book.authorId, "NEW_CHAPTER_REVIEW", {
    bookId: chapter.bookId,
    bookTitle: chapter.book.title,
    chapterId,
    chapterTitle: chapter.title,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  return { success: true }
}

// ─── CHAPTER COMMENTS (AUTHOR VIEW) ─────────────────────────────────────────

export type CommentWithReplies = {
  id: string
  selectedText: string
  fromPos: number
  toPos: number
  content: string
  resolved: boolean
  createdAt: Date
  betaReader: {
    id: string
    user: { username: string; displayName: string; avatarUrl: string | null }
  }
  replies: Array<{
    id: string
    content: string
    createdAt: Date
    author: { username: string }
  }>
}

export async function getChapterComments(chapterId: string): Promise<{
  error?: string
  comments?: CommentWithReplies[]
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { book: { select: { authorId: true } } },
  })
  if (!chapter || chapter.book.authorId !== session.user.id) return { error: "Not found" }

  const comments = await prisma.inlineComment.findMany({
    where: { chapterId },
    select: {
      id: true,
      selectedText: true,
      fromPos: true,
      toPos: true,
      content: true,
      resolved: true,
      createdAt: true,
      betaReader: {
        select: {
          id: true,
          user: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      },
      replies: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { username: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { fromPos: "asc" },
  })

  return { comments }
}
