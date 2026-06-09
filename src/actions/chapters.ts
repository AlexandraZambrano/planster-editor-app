"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { PublicationStatus } from "@prisma/client"

async function getChapterWithAuthorCheck(chapterId: string, userId: string) {
  return prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { bookId: true, book: { select: { authorId: true } }, order: true },
  }).then((chapter) => {
    if (!chapter || chapter.book.authorId !== userId) return null
    return chapter
  })
}

export async function createChapter(
  bookId: string,
  title: string
): Promise<{ error?: string; chapterId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true, _count: { select: { chapters: true } } },
  })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  if (!title.trim()) return { error: "Chapter title is required" }

  const chapter = await prisma.chapter.create({
    data: {
      bookId,
      title: title.trim(),
      order: book._count.chapters + 1,
      content: {},
      plotNote: { create: { notes: {} } },
    },
  })

  revalidatePath(`/write/${bookId}`)
  return { chapterId: chapter.id }
}

export async function updateChapterTitle(
  chapterId: string,
  title: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const chapter = await getChapterWithAuthorCheck(chapterId, session.user.id)
  if (!chapter) return { error: "Not found" }

  if (!title.trim()) return { error: "Title cannot be empty" }

  await prisma.chapter.update({ where: { id: chapterId }, data: { title: title.trim() } })

  revalidatePath(`/write/${chapter.bookId}`)
  return { success: true }
}

export async function updateChapterVisibility(
  chapterId: string,
  visibility: PublicationStatus
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const chapter = await getChapterWithAuthorCheck(chapterId, session.user.id)
  if (!chapter) return { error: "Not found" }

  await prisma.chapter.update({ where: { id: chapterId }, data: { visibility } })

  revalidatePath(`/write/${chapter.bookId}`)
  return { success: true }
}

export async function deleteChapter(
  chapterId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const chapter = await getChapterWithAuthorCheck(chapterId, session.user.id)
  if (!chapter) return { error: "Not found" }

  await prisma.$transaction(async (tx) => {
    await tx.chapter.delete({ where: { id: chapterId } })
    // Close the order gap
    await tx.chapter.updateMany({
      where: { bookId: chapter.bookId, order: { gt: chapter.order } },
      data: { order: { decrement: 1 } },
    })
  })

  revalidatePath(`/write/${chapter.bookId}`)
  return { success: true }
}

export async function saveChapterContent(
  chapterId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>,
  wordCount: number
): Promise<{ error?: string; success?: boolean }> {
  try {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        bookId: true,
        wordCount: true,
        book: { select: { authorId: true } },
      },
    })
    if (!chapter || chapter.book.authorId !== session.user.id) return { error: "Not found" }

    const wordsDelta = wordCount - chapter.wordCount
    // Deserialize to a plain object — Next.js 15 server action arguments arrive
    // as restricted proxies and Prisma's serializer fails on Symbol.toStringTag.
    const plainContent = JSON.parse(JSON.stringify(content))

    await prisma.chapter.update({
      where: { id: chapterId },
      data: { content: plainContent, wordCount },
    })

    const totalResult = await prisma.chapter.aggregate({
      where: { bookId: chapter.bookId },
      _sum: { wordCount: true },
    })
    const totalWordsBook = totalResult._sum.wordCount ?? 0

    // Use a plain date string to avoid timezone issues with @db.Date
    const todayDateOnly = new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z")

    const existingLog = await prisma.wordCountLog.findFirst({
      where: { userId: session.user.id, chapterId, date: todayDateOnly },
    })

    if (existingLog) {
      await prisma.wordCountLog.update({
        where: { id: existingLog.id },
        data: { wordsDelta: existingLog.wordsDelta + wordsDelta, totalWordsBook },
      })
    } else {
      await prisma.wordCountLog.create({
        data: {
          userId: session.user.id,
          bookId: chapter.bookId,
          chapterId,
          date: todayDateOnly,
          wordsDelta,
          totalWordsBook,
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error("[saveChapterContent] error:", error)
    return { error: "Failed to save. Check server logs." }
  }
}

export async function reorderChapters(
  bookId: string,
  orderedIds: string[]
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true },
  })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.chapter.update({ where: { id }, data: { order: index + 1 } })
    )
  )

  revalidatePath(`/write/${bookId}`)
  return { success: true }
}
