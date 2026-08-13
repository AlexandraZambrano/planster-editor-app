"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function followUser(userId: string): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }
  if (userId === session.user.id) return { error: "You cannot follow yourself" }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
  if (!target) return { error: "User not found" }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
  })
  if (existing) return { success: true }

  await prisma.follow.create({
    data: { followerId: session.user.id, followingId: userId },
  })

  await createNotification(userId, "NEW_FOLLOWER", {
    bookId: "",
    bookTitle: "",
    actorName: session.user.username,
    actorAvatarUrl: session.user.avatarUrl ?? null,
  })

  revalidatePath(`/profile/${target.username}`)
  return { success: true }
}

export async function unfollowUser(userId: string): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: userId },
  })

  if (target) revalidatePath(`/profile/${target.username}`)
  return { success: true }
}

export type FollowedUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export async function getFollowing(): Promise<{ error?: string; users?: FollowedUser[] }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: {
      following: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return { users: follows.map((f) => f.following) }
}

export type FollowState = {
  isFollowing: boolean
  followerCount: number
  followingCount: number
}

export async function getFollowState(userId: string): Promise<{ error?: string; state?: FollowState }> {
  const session = await auth()

  const [followerCount, followingCount, viewerFollow] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    session
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
        })
      : Promise.resolve(null),
  ])

  return {
    state: {
      isFollowing: !!viewerFollow,
      followerCount,
      followingCount,
    },
  }
}
