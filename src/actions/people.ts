"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const PEOPLE_PAGE_SIZE = 20
const SUGGESTIONS_LIMIT = 12

export type PersonCard = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  isFollowing: boolean
}

async function withFollowState(
  users: { id: string; username: string; displayName: string; avatarUrl: string | null; bio: string | null }[],
  viewerId: string | null
): Promise<PersonCard[]> {
  if (!viewerId || users.length === 0) {
    return users.map((u) => ({ ...u, isFollowing: false }))
  }

  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: users.map((u) => u.id) } },
    select: { followingId: true },
  })
  const followingSet = new Set(follows.map((f) => f.followingId))

  return users.map((u) => ({ ...u, isFollowing: followingSet.has(u.id) }))
}

export async function searchUsers(
  query: string,
  page = 1
): Promise<{ people: PersonCard[]; totalCount: number; page: number; pageSize: number }> {
  const session = await auth()
  const trimmed = query.trim()

  if (!trimmed) {
    return { people: [], totalCount: 0, page, pageSize: PEOPLE_PAGE_SIZE }
  }

  const where = {
    AND: [
      session ? { id: { not: session.user.id } } : {},
      { OR: [{ username: { contains: trimmed, mode: "insensitive" as const } }, { displayName: { contains: trimmed, mode: "insensitive" as const } }] },
    ],
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      orderBy: { username: "asc" },
      skip: (page - 1) * PEOPLE_PAGE_SIZE,
      take: PEOPLE_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ])

  return {
    people: await withFollowState(users, session?.user.id ?? null),
    totalCount,
    page,
    pageSize: PEOPLE_PAGE_SIZE,
  }
}

export type FollowSuggestion = PersonCard & { connectorName: string | null }

export async function getFollowSuggestions(): Promise<{ suggestions: FollowSuggestion[] }> {
  const session = await auth()
  if (!session) return { suggestions: [] }

  const myFollows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  })
  const followingIds = myFollows.map((f) => f.followingId)
  if (followingIds.length === 0) return { suggestions: [] }

  const ranked = await prisma.follow.groupBy({
    by: ["followingId"],
    where: {
      followerId: { in: followingIds },
      followingId: { notIn: [...followingIds, session.user.id] },
    },
    _count: { followingId: true },
    orderBy: { _count: { followingId: "desc" } },
    take: SUGGESTIONS_LIMIT,
  })
  if (ranked.length === 0) return { suggestions: [] }

  const candidateIds = ranked.map((r) => r.followingId)

  const [users, connectors] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
    }),
    prisma.follow.findMany({
      where: { followerId: { in: followingIds }, followingId: { in: candidateIds } },
      select: { followingId: true, follower: { select: { displayName: true } } },
    }),
  ])

  const connectorByCandidate = new Map<string, string>()
  for (const c of connectors) {
    if (!connectorByCandidate.has(c.followingId)) connectorByCandidate.set(c.followingId, c.follower.displayName)
  }

  const usersById = new Map(users.map((u) => [u.id, u]))
  const suggestions = candidateIds
    .map((id) => usersById.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ ...u, isFollowing: false, connectorName: connectorByCandidate.get(u.id) ?? null }))

  return { suggestions }
}
