"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const STREAK_WINDOW_DAYS = 30
const CONTINUE_READING_LIMIT = 2
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]

function todayUTCDateOnly(): Date {
  return new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z")
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0]
}

export async function logReadingActivity(
  bookId: string,
  chapterId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const today = todayUTCDateOnly()

  await Promise.all([
    prisma.readingProgress.upsert({
      where: { userId_bookId: { userId: session.user.id, bookId } },
      create: { userId: session.user.id, bookId, chapterId },
      update: { chapterId },
    }),
    prisma.readingActivity.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      create: { userId: session.user.id, date: today },
      update: {},
    }),
  ])

  revalidatePath("/")
  return { success: true }
}

export type ContinueReadingEntry = {
  bookId: string
  bookTitle: string
  bookSynopsis: string | null
  coverUrl: string | null
  chapterId: string
  chapterTitle: string
}

export async function getContinueReading(): Promise<{
  error?: string
  entries?: ContinueReadingEntry[]
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const progress = await prisma.readingProgress.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: CONTINUE_READING_LIMIT,
    select: {
      chapterId: true,
      chapter: { select: { title: true } },
      book: { select: { id: true, title: true, synopsis: true, coverUrl: true } },
    },
  })

  return {
    entries: progress.map((p) => ({
      bookId: p.book.id,
      bookTitle: p.book.title,
      bookSynopsis: p.book.synopsis,
      coverUrl: p.book.coverUrl,
      chapterId: p.chapterId,
      chapterTitle: p.chapter.title,
    })),
  }
}

export type ReadingStreakData = {
  streak: number
  weekDays: { label: string; read: boolean; isToday: boolean }[]
}

export async function getReadingStreak(): Promise<{ error?: string; data?: ReadingStreakData }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const today = todayUTCDateOnly()
  const windowStart = addDays(today, -(STREAK_WINDOW_DAYS - 1))

  const logs = await prisma.readingActivity.findMany({
    where: { userId: session.user.id, date: { gte: windowStart } },
    select: { date: true },
  })
  const readDates = new Set(logs.map((l) => toDateStr(l.date)))

  // Current streak: consecutive days ending today
  let streak = 0
  for (let i = 0; i < STREAK_WINDOW_DAYS; i++) {
    if (readDates.has(toDateStr(addDays(today, -i)))) streak++
    else break
  }

  // Current calendar week (Mon–Sun, UTC) for the visual tracker
  const dow = today.getUTCDay() // 0 = Sunday
  const mondayOffset = dow === 0 ? 6 : dow - 1
  const monday = addDays(today, -mondayOffset)

  const weekDays = DAY_LABELS.map((label, i) => {
    const dateStr = toDateStr(addDays(monday, i))
    return {
      label,
      read: readDates.has(dateStr),
      isToday: dateStr === toDateStr(today),
    }
  })

  return { data: { streak, weekDays } }
}
