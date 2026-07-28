"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { GoalType } from "@prisma/client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type GoalData = {
  id: string
  userId: string
  bookId: string | null
  type: GoalType
  targetWords: number
  deadlineDate: Date | null
  active: boolean
  createdAt: Date
}

export type DailyWordCount = {
  date: string // "YYYY-MM-DD"
  words: number
  goalMet: boolean
}

export type DeadlineProgress = {
  date: string
  ideal: number
  actual: number
}

export type GoalsDashboard = {
  goals: GoalData[]
  totalWordsBook: number
  dailyData: DailyWordCount[]
  deadlineData: DeadlineProgress[] | null
  streak: number
  longestStreak: number
  wordsThisWeek: number
  wordsThisMonth: number
  weeklyGoalTarget: number | null
  monthlyGoalTarget: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function today(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function subtractDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

// ── Goal CRUD ─────────────────────────────────────────────────────────────────

export async function getGoals(bookId?: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const goals = await prisma.writingGoal.findMany({
    where: {
      userId: session.user.id,
      bookId: bookId ?? null,
      active: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return { goals: goals as GoalData[] }
}

export async function createGoal(data: {
  bookId?: string | null
  type: GoalType
  targetWords: number
  deadlineDate?: Date | null
}) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  if (!data.targetWords || data.targetWords < 1)
    return { error: "Target must be at least 1 word" as const }

  if (data.type === "DEADLINE" && !data.deadlineDate)
    return { error: "Deadline date is required for DEADLINE goals" as const }

  if (data.deadlineDate && data.deadlineDate <= today())
    return { error: "Deadline must be in the future" as const }

  const goal = await prisma.writingGoal.create({
    data: {
      userId: session.user.id,
      bookId: data.bookId ?? null,
      type: data.type,
      targetWords: data.targetWords,
      deadlineDate: data.deadlineDate ?? null,
      active: true,
    },
  })

  if (data.bookId) revalidatePath(`/write/${data.bookId}/goals`)
  else revalidatePath("/write")

  return { goal: goal as GoalData }
}

export async function deleteGoal(goalId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const goal = await prisma.writingGoal.findFirst({
    where: { id: goalId, userId: session.user.id },
    select: { id: true, bookId: true },
  })
  if (!goal) return { error: "Not found" as const }

  await prisma.writingGoal.delete({ where: { id: goalId } })

  if (goal.bookId) revalidatePath(`/write/${goal.bookId}/goals`)
  else revalidatePath("/write")

  return { success: true as const }
}

// ── Dashboard data ─────────────────────────────────────────────────────────────

export async function getGoalsDashboard(bookId: string): Promise<GoalsDashboard | { error: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findFirst({
    where: { id: bookId, authorId: session.user.id },
    select: { id: true },
  })
  if (!book) return { error: "Not found" }

  const todayDate = today()
  const thirtyDaysAgo = subtractDays(todayDate, 29)

  const [goals, logs, chapters] = await Promise.all([
    prisma.writingGoal.findMany({
      where: { userId: session.user.id, bookId, active: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.wordCountLog.findMany({
      where: {
        userId: session.user.id,
        bookId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    }),
    prisma.chapter.findMany({
      where: { bookId },
      select: { wordCount: true },
    }),
  ])

  const totalWordsBook = chapters.reduce((sum, c) => sum + c.wordCount, 0)

  // Aggregate words per day (sum deltas within the 30-day window)
  const wordsByDay = new Map<string, number>()
  for (const log of logs) {
    const key = toDateStr(log.date)
    wordsByDay.set(key, (wordsByDay.get(key) ?? 0) + log.wordsDelta)
  }

  const dailyGoal = goals.find((g) => g.type === "DAILY")
  const weeklyGoal = goals.find((g) => g.type === "WEEKLY")
  const monthlyGoal = goals.find((g) => g.type === "MONTHLY")
  const deadlineGoal = goals.find((g) => g.type === "DEADLINE")

  // Build 30-day array
  const dailyData: DailyWordCount[] = []
  for (let i = 29; i >= 0; i--) {
    const d = subtractDays(todayDate, i)
    const key = toDateStr(d)
    const words = Math.max(0, wordsByDay.get(key) ?? 0)
    const goalMet = dailyGoal
      ? words >= dailyGoal.targetWords
      : words > 0
    dailyData.push({ date: key, words, goalMet })
  }

  // Streak: consecutive days ending today where goalMet
  let streak = 0
  let longestStreak = 0
  let current = 0
  for (const day of dailyData) {
    if (day.goalMet) {
      current++
      if (current > longestStreak) longestStreak = current
    } else {
      current = 0
    }
  }
  // streak is the current tail
  for (let i = dailyData.length - 1; i >= 0; i--) {
    if (dailyData[i].goalMet) streak++
    else break
  }

  // Words this week (Mon–Sun UTC)
  const dow = todayDate.getUTCDay()
  const startOfWeek = subtractDays(todayDate, dow === 0 ? 6 : dow - 1)
  let wordsThisWeek = 0
  for (const [key, words] of wordsByDay) {
    if (key >= toDateStr(startOfWeek)) wordsThisWeek += Math.max(0, words)
  }

  // Words this month
  const startOfMonth = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1))
  let wordsThisMonth = 0
  for (const [key, words] of wordsByDay) {
    if (key >= toDateStr(startOfMonth)) wordsThisMonth += Math.max(0, words)
  }

  // Deadline progress chart
  let deadlineData: DeadlineProgress[] | null = null
  if (deadlineGoal?.deadlineDate) {
    const deadline = new Date(deadlineGoal.deadlineDate)
    deadline.setUTCHours(0, 0, 0, 0)

    // Collect all cumulative logs from beginning of book
    const allLogs = await prisma.wordCountLog.findMany({
      where: { userId: session.user.id, bookId },
      orderBy: { date: "asc" },
    })

    // Group by day
    const cumByDay = new Map<string, number>()
    for (const log of allLogs) {
      const key = toDateStr(log.date)
      cumByDay.set(key, (cumByDay.get(key) ?? 0) + log.wordsDelta)
    }

    // Build running total
    const sortedKeys = [...cumByDay.keys()].sort()
    const startDate = sortedKeys.length > 0 ? new Date(sortedKeys[0]) : todayDate

    const totalDays = Math.max(
      1,
      Math.round((deadline.getTime() - startDate.getTime()) / 86400000)
    )

    deadlineData = []
    let cumActual = 0
    const dayCount = Math.round((deadline.getTime() - startDate.getTime()) / 86400000)

    for (let i = 0; i <= dayCount; i++) {
      const d = new Date(startDate)
      d.setUTCDate(d.getUTCDate() + i)
      const key = toDateStr(d)
      cumActual += Math.max(0, cumByDay.get(key) ?? 0)
      const ideal = Math.round((deadlineGoal.targetWords / totalDays) * i)
      deadlineData.push({ date: key, ideal, actual: cumActual })
    }
  }

  return {
    goals: goals as GoalData[],
    totalWordsBook,
    dailyData,
    deadlineData,
    streak,
    longestStreak,
    wordsThisWeek,
    wordsThisMonth,
    weeklyGoalTarget: weeklyGoal?.targetWords ?? null,
    monthlyGoalTarget: monthlyGoal?.targetWords ?? null,
  } satisfies GoalsDashboard
}
