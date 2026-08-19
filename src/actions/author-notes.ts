"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type AuthorNoteEntry = {
  id: string
  selectedText: string
  fromPos: number
  toPos: number
  content: string
  createdAt: Date
}

async function assertChapterAuthor(chapterId: string, userId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { book: { select: { authorId: true } } },
  })
  if (!chapter || chapter.book.authorId !== userId) return null
  return chapter
}

export async function createAuthorNote(
  chapterId: string,
  selectedText: string,
  fromPos: number,
  toPos: number,
  content: string
): Promise<{ error?: string; success?: boolean; noteId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const text = content.trim()
  if (!text) return { error: "Note cannot be empty" }

  const chapter = await assertChapterAuthor(chapterId, session.user.id)
  if (!chapter) return { error: "Not found" }

  const note = await prisma.authorNote.create({
    data: { chapterId, selectedText, fromPos, toPos, content: text },
  })

  return { success: true, noteId: note.id }
}

export async function getAuthorNotes(chapterId: string): Promise<{
  error?: string
  notes?: AuthorNoteEntry[]
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const chapter = await assertChapterAuthor(chapterId, session.user.id)
  if (!chapter) return { error: "Not found" }

  const notes = await prisma.authorNote.findMany({
    where: { chapterId },
    select: {
      id: true,
      selectedText: true,
      fromPos: true,
      toPos: true,
      content: true,
      createdAt: true,
    },
    orderBy: { fromPos: "asc" },
  })

  return { notes }
}

export async function deleteAuthorNote(
  noteId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const note = await prisma.authorNote.findUnique({
    where: { id: noteId },
    select: { chapter: { select: { book: { select: { authorId: true } } } } },
  })
  if (!note || note.chapter.book.authorId !== session.user.id) return { error: "Not found" }

  await prisma.authorNote.delete({ where: { id: noteId } })
  return { success: true }
}
