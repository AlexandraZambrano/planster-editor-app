import { describe, it, expect, vi, beforeEach } from "vitest"
import { followUser, unfollowUser, getFollowState, getFollowing } from "./follow"
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("followUser", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await followUser("user-2")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when following yourself", async () => {
    const result = await followUser("user-1")
    expect(result.error).toContain("yourself")
  })

  it("returns error when target user not found", async () => {
    mp.user.findUnique.mockResolvedValue(null)
    const result = await followUser("user-2")
    expect(result.error).toBe("User not found")
  })

  it("is a no-op success when already following", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2", username: "author1" })
    mp.follow.findUnique.mockResolvedValue({ id: "follow-1" })
    const result = await followUser("user-2")
    expect(result.success).toBe(true)
    expect(mp.follow.create).not.toHaveBeenCalled()
  })

  it("creates a follow and notifies the target", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2", username: "author1" })
    mp.follow.findUnique.mockResolvedValue(null)
    const result = await followUser("user-2")
    expect(result.success).toBe(true)
    expect(mp.follow.create).toHaveBeenCalledWith({
      data: { followerId: "user-1", followingId: "user-2" },
    })
    expect(createNotification).toHaveBeenCalledWith(
      "user-2",
      "NEW_FOLLOWER",
      expect.objectContaining({ actorName: "reader1" })
    )
  })
})

describe("unfollowUser", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await unfollowUser("user-2")
    expect(result.error).toBe("Unauthorized")
  })

  it("deletes the follow relation", async () => {
    mp.user.findUnique.mockResolvedValue({ username: "author1" })
    const result = await unfollowUser("user-2")
    expect(result.success).toBe(true)
    expect(mp.follow.deleteMany).toHaveBeenCalledWith({
      where: { followerId: "user-1", followingId: "user-2" },
    })
  })
})

describe("getFollowState", () => {
  it("returns counts and isFollowing false for an anonymous viewer", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    mp.follow.count.mockResolvedValueOnce(3).mockResolvedValueOnce(5)
    const result = await getFollowState("user-2")
    expect(result.state).toEqual({ isFollowing: false, followerCount: 3, followingCount: 5 })
  })

  it("returns isFollowing true when a Follow row exists", async () => {
    mp.follow.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    mp.follow.findUnique.mockResolvedValue({ id: "follow-1" })
    const result = await getFollowState("user-2")
    expect(result.state?.isFollowing).toBe(true)
  })
})

describe("getFollowing", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getFollowing()
    expect(result.error).toBe("Unauthorized")
  })

  it("returns the list of followed users", async () => {
    mp.follow.findMany.mockResolvedValue([
      { following: { id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null } },
    ])
    const result = await getFollowing()
    expect(result.users).toEqual([{ id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null }])
    expect(mp.follow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { followerId: "user-1" } })
    )
  })
})
