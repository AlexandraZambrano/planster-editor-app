import { describe, it, expect, vi, beforeEach } from "vitest"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "./notifications"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockPrisma = prisma as unknown as {
  notification: Record<string, ReturnType<typeof vi.fn>>
}

const SESSION = { user: { id: "user-1", email: "a@test.com", username: "user1", avatarUrl: null } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("getNotifications", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getNotifications()
    expect(result.error).toBe("Unauthorized")
  })

  it("returns notifications ordered by createdAt desc and the unread count", async () => {
    const rows = [
      { id: "n1", type: "BOOK_SAVED", payload: { bookTitle: "A" }, read: false, createdAt: new Date("2026-01-02") },
      { id: "n2", type: "BETA_REQUEST_RECEIVED", payload: { bookTitle: "B" }, read: true, createdAt: new Date("2026-01-01") },
    ]
    mockPrisma.notification.findMany.mockResolvedValue(rows)
    mockPrisma.notification.count.mockResolvedValue(1)

    const result = await getNotifications()

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, orderBy: { createdAt: "desc" } })
    )
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
    })
    expect(result.notifications).toHaveLength(2)
    expect(result.unreadCount).toBe(1)
  })
})

describe("markNotificationAsRead", () => {
  it("returns error when notification belongs to another user", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({ userId: "other-user" })
    const result = await markNotificationAsRead("n1")
    expect(result.error).toBe("Not found")
    expect(mockPrisma.notification.update).not.toHaveBeenCalled()
  })

  it("returns error when notification does not exist", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null)
    const result = await markNotificationAsRead("n1")
    expect(result.error).toBe("Not found")
  })

  it("marks the notification as read", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({ userId: "user-1" })
    const result = await markNotificationAsRead("n1")
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { read: true },
    })
    expect(result.success).toBe(true)
  })
})

describe("markAllNotificationsAsRead", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await markAllNotificationsAsRead()
    expect(result.error).toBe("Unauthorized")
  })

  it("marks all unread notifications as read for the current user", async () => {
    const result = await markAllNotificationsAsRead()
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
      data: { read: true },
    })
    expect(result.success).toBe(true)
  })
})
