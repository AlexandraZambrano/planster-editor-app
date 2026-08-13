"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export type PublicProfileData = {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  avatarPositionY: number
  books: { id: string; title: string; coverUrl: string | null }[]
  publicShelves: { id: string; name: string; bookCount: number }[]
  libraryCount: number | null
  ratings: { bookId: string; bookTitle: string; rating: number }[] | null
  followerCount: number
  followingCount: number
  isOwnProfile: boolean
  isFollowing: boolean
}

export async function getPublicProfile(
  username: string
): Promise<{ error?: string; profile?: PublicProfileData }> {
  const session = await auth()

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      avatarPositionY: true,
      showLibraryCount: true,
      showRatingsAndReviews: true,
    },
  })
  if (!user) return { error: "Profile not found" }

  const [books, shelves, libraryCount, ratedBooks, followerCount, followingCount, viewerFollow] =
    await Promise.all([
      prisma.book.findMany({
        where: { authorId: user.id, publicationStatus: "PUBLISHED" },
        select: { id: true, title: true, coverUrl: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.shelf.findMany({
        where: { userId: user.id, isPublic: true },
        select: { id: true, name: true, _count: { select: { shelfBooks: true } } },
        orderBy: { createdAt: "asc" },
      }),
      user.showLibraryCount
        ? prisma.library.count({ where: { userId: user.id } })
        : Promise.resolve(null),
      user.showRatingsAndReviews
        ? prisma.library.findMany({
            where: { userId: user.id, rating: { not: null } },
            select: { rating: true, book: { select: { id: true, title: true } } },
            orderBy: { addedAt: "desc" },
          })
        : Promise.resolve(null),
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      session
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
          })
        : Promise.resolve(null),
    ])

  return {
    profile: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      avatarPositionY: user.avatarPositionY ?? 50,
      books,
      publicShelves: shelves.map((s) => ({
        id: s.id,
        name: s.name,
        bookCount: s._count.shelfBooks,
      })),
      libraryCount,
      ratings: ratedBooks
        ? ratedBooks.map((r) => ({
            bookId: r.book.id,
            bookTitle: r.book.title,
            rating: r.rating!,
          }))
        : null,
      followerCount,
      followingCount,
      isOwnProfile: session?.user.id === user.id,
      isFollowing: !!viewerFollow,
    },
  }
}
