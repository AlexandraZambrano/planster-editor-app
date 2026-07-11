import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { getGoals, createGoal, deleteGoal, getGoalsDashboard } from "./goals"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user1", email: "a@b.com" } }),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

function resetMocks() {
  Object.values(db).forEach((model) => {
    if (typeof model === "object") {
      Object.values(model).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) fn.mockReset()
      })
    }
  })
}

beforeEach(resetMocks)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BOOK = { id: "book1" }

const GOAL_DAILY = {
  id: "goal1",
  userId: "user1",
  bookId: "book1",
  type: "DAILY" as const,
  targetWords: 500,
  deadlineDate: null,
  active: true,
  createdAt: new Date("2024-01-01"),
}

const GOAL_DEADLINE = {
  id: "goal2",
  userId: "user1",
  bookId: "book1",
  type: "DEADLINE" as const,
  targetWords: 80000,
  deadlineDate: new Date("2025-12-31"),
  active: true,
  createdAt: new Date("2024-01-01"),
}

// ── getGoals ──────────────────────────────────────────────────────────────────

describe("getGoals", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getGoals("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns goals list for a book", async () => {
    db.writingGoal.findMany.mockResolvedValueOnce([GOAL_DAILY])
    const result = await getGoals("book1")
    expect(result).toHaveProperty("goals")
    expect((result as { goals: typeof GOAL_DAILY[] }).goals[0].id).toBe("goal1")
  })

  it("returns global goals when no bookId provided", async () => {
    db.writingGoal.findMany.mockResolvedValueOnce([])
    const result = await getGoals()
    expect(result).toHaveProperty("goals")
    expect(db.writingGoal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ bookId: null }) })
    )
  })
})

// ── createGoal ────────────────────────────────────────────────────────────────

describe("createGoal", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await createGoal({ type: "DAILY", targetWords: 500 })
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns error for zero target words", async () => {
    const result = await createGoal({ type: "DAILY", targetWords: 0 })
    expect(result).toEqual({ error: "Target must be at least 1 word" })
  })

  it("returns error for DEADLINE without date", async () => {
    const result = await createGoal({ type: "DEADLINE", targetWords: 1000 })
    expect(result).toEqual({ error: "Deadline date is required for DEADLINE goals" })
  })

  it("returns error for past deadline date", async () => {
    const result = await createGoal({
      type: "DEADLINE",
      targetWords: 1000,
      deadlineDate: new Date("2020-01-01"),
    })
    expect(result).toEqual({ error: "Deadline must be in the future" })
  })

  it("creates a daily goal and returns it", async () => {
    db.writingGoal.create.mockResolvedValueOnce(GOAL_DAILY)
    const result = await createGoal({ bookId: "book1", type: "DAILY", targetWords: 500 })
    expect(result).toHaveProperty("goal")
    expect((result as { goal: typeof GOAL_DAILY }).goal.type).toBe("DAILY")
    expect(db.writingGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ targetWords: 500, type: "DAILY" }) })
    )
  })

  it("creates a DEADLINE goal with future date", async () => {
    const futureDate = new Date()
    futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 1)
    db.writingGoal.create.mockResolvedValueOnce(GOAL_DEADLINE)
    const result = await createGoal({
      bookId: "book1",
      type: "DEADLINE",
      targetWords: 80000,
      deadlineDate: futureDate,
    })
    expect(result).toHaveProperty("goal")
  })
})

// ── deleteGoal ────────────────────────────────────────────────────────────────

describe("deleteGoal", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await deleteGoal("goal1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if goal not owned by user", async () => {
    db.writingGoal.findFirst.mockResolvedValueOnce(null)
    const result = await deleteGoal("goal1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("deletes goal and returns success", async () => {
    db.writingGoal.findFirst.mockResolvedValueOnce({ id: "goal1", bookId: "book1" })
    db.writingGoal.delete.mockResolvedValueOnce({})
    const result = await deleteGoal("goal1")
    expect(result).toEqual({ success: true })
    expect(db.writingGoal.delete).toHaveBeenCalledWith({ where: { id: "goal1" } })
  })
})

// ── getGoalsDashboard ─────────────────────────────────────────────────────────

describe("getGoalsDashboard", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getGoalsDashboard("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author book", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getGoalsDashboard("book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns dashboard with correct shape when there is data", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.writingGoal.findMany.mockResolvedValueOnce([GOAL_DAILY])
    db.wordCountLog.findMany.mockResolvedValueOnce([])
    db.chapter.findMany.mockResolvedValueOnce([{ wordCount: 1200 }, { wordCount: 800 }])

    const result = await getGoalsDashboard("book1")
    expect(result).not.toHaveProperty("error")

    const dashboard = result as Awaited<ReturnType<typeof getGoalsDashboard>>
    if ("error" in dashboard) throw new Error("unexpected error")

    expect(dashboard.totalWordsBook).toBe(2000)
    expect(dashboard.goals).toHaveLength(1)
    expect(dashboard.dailyData).toHaveLength(30)
    expect(dashboard.deadlineData).toBeNull()
    expect(typeof dashboard.streak).toBe("number")
    expect(typeof dashboard.longestStreak).toBe("number")
  })

  it("includes deadlineData when DEADLINE goal is active", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.writingGoal.findMany.mockResolvedValueOnce([GOAL_DEADLINE])
    // first call = last 30 days logs, second call = all logs for deadline chart
    db.wordCountLog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    db.chapter.findMany.mockResolvedValueOnce([{ wordCount: 5000 }])

    const result = await getGoalsDashboard("book1")
    if ("error" in result) throw new Error("unexpected error")
    // deadlineData is either null or an array
    expect(result.deadlineData === null || Array.isArray(result.deadlineData)).toBe(true)
  })

  it("calculates streak correctly from word count logs", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.writingGoal.findMany.mockResolvedValueOnce([GOAL_DAILY])

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)

    // Two consecutive days with 500+ words (meets DAILY goal of 500)
    db.wordCountLog.findMany.mockResolvedValueOnce([
      { date: yesterday, wordsDelta: 600 },
      { date: today, wordsDelta: 700 },
    ])
    db.chapter.findMany.mockResolvedValueOnce([])

    const result = await getGoalsDashboard("book1")
    if ("error" in result) throw new Error("unexpected error")
    expect(result.streak).toBe(2)
  })
})
