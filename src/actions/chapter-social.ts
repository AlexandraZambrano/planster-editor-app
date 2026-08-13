"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

const VALID_RATINGS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

async function getPublishedChapter(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      visibility: true,
      bookId: true,
      book: { select: { authorId: true, title: true } },
    },
  })
  if (!chapter || chapter.visibility !== "PUBLISHED") return null
  return chapter
}

export async function postChapterComment(
  chapterId: string,
  content: string
): Promise<{ error?: string; success?: boolean; commentId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const text = content.trim()
  if (!text) return { error: "Comment cannot be empty" }
  if (text.length > 1000) return { error: "Comment cannot exceed 1000 characters" }

  const chapter = await getPublishedChapter(chapterId)
  if (!chapter) return { error: "Chapter not found" }
  if (chapter.book.authorId === session.user.id) return { error: "You cannot comment on your own chapter" }

  const comment = await prisma.chapterComment.create({
    data: { chapterId, userId: session.user.id, content: text },
  })

  await createNotification(chapter.book.authorId, "NEW_CHAPTER_COMMENT", {
    bookId: chapter.bookId,
    bookTitle: chapter.book.title,
    chapterId,
    chapterTitle: chapter.title,
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  revalidatePath(`/read/${chapter.bookId}/${chapterId}`)
  return { success: true, commentId: comment.id }
}

export async function deleteChapterComment(
  commentId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const comment = await prisma.chapterComment.findUnique({
    where: { id: commentId },
    select: { userId: true, chapterId: true, chapter: { select: { bookId: true } } },
  })
  if (!comment || comment.userId !== session.user.id) return { error: "Not found" }

  await prisma.chapterComment.delete({ where: { id: commentId } })

  revalidatePath(`/read/${comment.chapter.bookId}/${comment.chapterId}`)
  return { success: true }
}

export async function rateChapter(
  chapterId: string,
  rating: number
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  if (!VALID_RATINGS.includes(rating)) return { error: "Invalid rating" }

  const chapter = await getPublishedChapter(chapterId)
  if (!chapter) return { error: "Chapter not found" }
  if (chapter.book.authorId === session.user.id) return { error: "You cannot rate your own chapter" }

  await prisma.chapterRating.upsert({
    where: { chapterId_userId: { chapterId, userId: session.user.id } },
    create: { chapterId, userId: session.user.id, rating },
    update: { rating },
  })

  revalidatePath(`/read/${chapter.bookId}/${chapterId}`)
  return { success: true }
}

export type ChapterSocialComment = {
  id: string
  content: string
  createdAt: Date
  userId: string
  user: { username: string; displayName: string; avatarUrl: string | null }
}

export async function getChapterSocial(chapterId: string): Promise<{
  error?: string
  comments?: ChapterSocialComment[]
  averageRating?: number | null
  ratingCount?: number
  viewerRating?: number | null
}> {
  const session = await auth()

  const [comments, aggregate, viewerRating] = await Promise.all([
    prisma.chapterComment.findMany({
      where: { chapterId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        user: { select: { username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chapterRating.aggregate({
      where: { chapterId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    session
      ? prisma.chapterRating.findUnique({
          where: { chapterId_userId: { chapterId, userId: session.user.id } },
          select: { rating: true },
        })
      : Promise.resolve(null),
  ])

  return {
    comments,
    averageRating: aggregate._avg.rating,
    ratingCount: aggregate._count.rating,
    viewerRating: viewerRating?.rating ?? null,
  }
}
