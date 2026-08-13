import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchUsers, getFollowSuggestions } from "./people"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const mp = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

const SESSION = {
  user: { id: "user-1", email: "a@test.com", username: "alice", avatarUrl: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("searchUsers", () => {
  it("returns an empty result for a blank query without hitting the DB", async () => {
    const result = await searchUsers("   ")
    expect(result.people).toEqual([])
    expect(mp.user.findMany).not.toHaveBeenCalled()
  })

  it("excludes the viewer from results and marks who they already follow", async () => {
    mp.user.findMany.mockResolvedValue([
      { id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null, bio: null },
    ])
    mp.user.count.mockResolvedValue(1)
    mp.follow.findMany.mockResolvedValueOnce([{ followingId: "user-2" }])

    const result = await searchUsers("bob")

    expect(mp.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ id: { not: "user-1" } }]),
        }),
      })
    )
    expect(result.people).toEqual([
      { id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null, bio: null, isFollowing: true },
    ])
  })

  it("works for an anonymous viewer (no follow state, no self-exclusion)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    mp.user.findMany.mockResolvedValue([
      { id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null, bio: null },
    ])
    mp.user.count.mockResolvedValue(1)

    const result = await searchUsers("bob")
    expect(result.people[0]?.isFollowing).toBe(false)
    expect(mp.follow.findMany).not.toHaveBeenCalled()
  })
})

describe("getFollowSuggestions", () => {
  it("returns no suggestions for an anonymous viewer", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getFollowSuggestions()
    expect(result.suggestions).toEqual([])
  })

  it("returns no suggestions when the viewer follows nobody", async () => {
    mp.follow.findMany.mockResolvedValueOnce([])
    const result = await getFollowSuggestions()
    expect(result.suggestions).toEqual([])
    expect(mp.follow.groupBy).not.toHaveBeenCalled()
  })

  it("ranks second-degree connections and attaches a connector name", async () => {
    mp.follow.findMany
      .mockResolvedValueOnce([{ followingId: "user-2" }]) // my follows
      .mockResolvedValueOnce([{ followingId: "user-3", follower: { displayName: "Bob" } }]) // connectors
    mp.follow.groupBy.mockResolvedValue([{ followingId: "user-3", _count: { followingId: 1 } }])
    mp.user.findMany.mockResolvedValue([
      { id: "user-3", username: "carol", displayName: "Carol", avatarUrl: null, bio: null },
    ])

    const result = await getFollowSuggestions()

    expect(mp.follow.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          followerId: { in: ["user-2"] },
          followingId: { notIn: ["user-2", "user-1"] },
        },
      })
    )
    expect(result.suggestions).toEqual([
      {
        id: "user-3",
        username: "carol",
        displayName: "Carol",
        avatarUrl: null,
        bio: null,
        isFollowing: false,
        connectorName: "Bob",
      },
    ])
  })
})
