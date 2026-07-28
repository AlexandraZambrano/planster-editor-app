"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { BookStatus, PublicationStatus, BetaStatus, BookLicense } from "@prisma/client"

const HOME_SECTION_LIMIT = 8
const EXPLORE_PAGE_SIZE = 20
const MIN_RATINGS_FOR_POPULAR = 3

const bookCardSelect = {
  id: true,
  title: true,
  synopsis: true,
  coverUrl: true,
  genres: true,
  bookStatus: true,
  language: true,
  updatedAt: true,
  featured: true,
  author: { select: { username: true, displayName: true } },
  _count: { select: { chapters: { where: { visibility: "PUBLISHED" as const } } } },
} as const

type RawBook = {
  id: string
  title: string
  synopsis: string | null
  coverUrl: string | null
  genres: string[]
  bookStatus: BookStatus
  language: string
  updatedAt: Date
  featured: boolean
  author: { username: string; displayName: string }
  _count: { chapters: number }
}

export type DiscoveryBookCard = {
  id: string
  title: string
  synopsis: string | null
  coverUrl: string | null
  genres: string[]
  bookStatus: BookStatus
  language: string
  updatedAt: Date
  author: { username: string; displayName: string }
  chapterCount: number
  averageRating: number | null
  ratingCount: number
}

async function getRatingsMap(bookIds: string[]): Promise<Map<string, { avg: number; count: number }>> {
  if (bookIds.length === 0) return new Map()

  const rows = await prisma.$queryRaw<{ bookId: string; avg: number; count: bigint }[]>`
    SELECT "bookId", AVG(rating) as avg, COUNT(rating) as count
    FROM "Library"
    WHERE rating IS NOT NULL AND "bookId" = ANY(${bookIds})
    GROUP BY "bookId"
  `

  const map = new Map<string, { avg: number; count: number }>()
  for (const row of rows) {
    map.set(row.bookId, { avg: Number(row.avg), count: Number(row.count) })
  }
  return map
}

function buildCards(
  books: RawBook[],
  ratings: Map<string, { avg: number; count: number }>
): DiscoveryBookCard[] {
  return books.map((b) => {
    const r = ratings.get(b.id)
    return {
      id: b.id,
      title: b.title,
      synopsis: b.synopsis,
      coverUrl: b.coverUrl,
      genres: b.genres,
      bookStatus: b.bookStatus,
      language: b.language,
      updatedAt: b.updatedAt,
      author: b.author,
      chapterCount: b._count.chapters,
      averageRating: r ? Math.round(r.avg * 10) / 10 : null,
      ratingCount: r?.count ?? 0,
    }
  })
}

// ─── HOME ───────────────────────────────────────────────────────────────────

export async function getHomeData(): Promise<{
  featured: DiscoveryBookCard[]
  recent: DiscoveryBookCard[]
  popular: DiscoveryBookCard[]
}> {
  const books = (await prisma.book.findMany({
    where: { publicationStatus: "PUBLISHED" },
    select: bookCardSelect,
  })) as RawBook[]

  const ratings = await getRatingsMap(books.map((b) => b.id))
  const cards = buildCards(books, ratings)
  const cardById = new Map(cards.map((c) => [c.id, c]))

  const byUpdatedDesc = [...books].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const featured = byUpdatedDesc
    .filter((b) => b.featured)
    .slice(0, HOME_SECTION_LIMIT)
    .map((b) => cardById.get(b.id)!)

  const recent = byUpdatedDesc.slice(0, HOME_SECTION_LIMIT).map((b) => cardById.get(b.id)!)

  const popular = cards
    .filter((c) => c.ratingCount >= MIN_RATINGS_FOR_POPULAR)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, HOME_SECTION_LIMIT)

  return { featured, recent, popular }
}

// ─── RECOMMENDATIONS ────────────────────────────────────────────────────────

export async function getRecommendedBooks(): Promise<{ books: DiscoveryBookCard[] }> {
  const session = await auth()
  if (!session) return { books: [] }

  const saved = await prisma.library.findMany({
    where: { userId: session.user.id },
    select: { bookId: true },
  })
  const excludeIds = saved.map((s) => s.bookId)

  const books = (await prisma.book.findMany({
    where: {
      publicationStatus: "PUBLISHED",
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: bookCardSelect,
  })) as RawBook[]

  const ratings = await getRatingsMap(books.map((b) => b.id))
  const cards = buildCards(books, ratings)

  const recommended = cards
    .filter((c) => c.ratingCount >= MIN_RATINGS_FOR_POPULAR)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, HOME_SECTION_LIMIT)

  return { books: recommended }
}

// ─── EXPLORE ────────────────────────────────────────────────────────────────

export type ExploreFilters = {
  genres?: string[]
  language?: string
  bookStatus?: BookStatus
  minRating?: number
  search?: string
  page?: number
}

async function searchMatchingBookIds(search: string): Promise<string[]> {
  const [byTitleOrAuthor, byTags] = await Promise.all([
    prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { author: { username: { contains: search, mode: "insensitive" } } },
        ],
      },
      select: { id: true },
    }),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Book" WHERE EXISTS (
        SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE ${`%${search}%`}
      )
    `,
  ])

  const ids = new Set<string>()
  byTitleOrAuthor.forEach((b) => ids.add(b.id))
  byTags.forEach((b) => ids.add(b.id))
  return Array.from(ids)
}

async function getBookIdsWithMinRating(minRating: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ bookId: string }[]>`
    SELECT "bookId" FROM "Library"
    WHERE rating IS NOT NULL
    GROUP BY "bookId"
    HAVING AVG(rating) >= ${minRating}
  `
  return rows.map((r) => r.bookId)
}

export async function getExploreBooks(filters: ExploreFilters = {}): Promise<{
  books: DiscoveryBookCard[]
  totalCount: number
  page: number
  pageSize: number
}> {
  const page = Math.max(1, filters.page ?? 1)
  const empty = { books: [], totalCount: 0, page, pageSize: EXPLORE_PAGE_SIZE }

  const idFilters: string[][] = []

  const search = filters.search?.trim()
  if (search) {
    const ids = await searchMatchingBookIds(search)
    if (ids.length === 0) return empty
    idFilters.push(ids)
  }

  if (filters.minRating && filters.minRating > 0) {
    const ids = await getBookIdsWithMinRating(filters.minRating)
    if (ids.length === 0) return empty
    idFilters.push(ids)
  }

  let idFilter: string[] | undefined
  if (idFilters.length > 0) {
    idFilter = idFilters.reduce((acc, ids) => acc.filter((id) => ids.includes(id)))
    if (idFilter.length === 0) return empty
  }

  const where = {
    publicationStatus: "PUBLISHED" as const,
    ...(filters.genres && filters.genres.length > 0 ? { genres: { hasSome: filters.genres } } : {}),
    ...(filters.language ? { language: filters.language } : {}),
    ...(filters.bookStatus ? { bookStatus: filters.bookStatus } : {}),
    ...(idFilter ? { id: { in: idFilter } } : {}),
  }

  const [totalCount, books] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      select: bookCardSelect,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * EXPLORE_PAGE_SIZE,
      take: EXPLORE_PAGE_SIZE,
    }),
  ])

  const ratings = await getRatingsMap(books.map((b) => b.id))
  return { books: buildCards(books as RawBook[], ratings), totalCount, page, pageSize: EXPLORE_PAGE_SIZE }
}

// ─── BOOK PAGE ──────────────────────────────────────────────────────────────

export type BookPageData = {
  id: string
  title: string
  synopsis: string | null
  coverUrl: string | null
  genres: string[]
  language: string
  bookStatus: BookStatus
  publicationStatus: PublicationStatus
  license: BookLicense
  author: { id: string; username: string; displayName: string; avatarUrl: string | null }
  chapters: { id: string; title: string; wordCount: number }[]
  averageRating: number | null
  ratingCount: number
  isAuthenticated: boolean
  isViewerAuthor: boolean
  isSavedByViewer: boolean
  viewerBetaStatus: BetaStatus | null
}

export async function getBookPageData(bookId: string): Promise<{ error?: string; book?: BookPageData }> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      synopsis: true,
      coverUrl: true,
      genres: true,
      language: true,
      bookStatus: true,
      publicationStatus: true,
      license: true,
      authorId: true,
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      chapters: {
        where: { visibility: "PUBLISHED" },
        select: { id: true, title: true, wordCount: true },
        orderBy: { order: "asc" },
      },
    },
  })
  if (!book || book.publicationStatus === "DRAFT") return { error: "Book not found" }

  const ratings = await getRatingsMap([book.id])
  const r = ratings.get(book.id)

  const session = await auth()
  let isViewerAuthor = false
  let isSavedByViewer = false
  let viewerBetaStatus: BetaStatus | null = null

  if (session) {
    isViewerAuthor = book.authorId === session.user.id
    const [libraryEntry, betaEntry] = await Promise.all([
      prisma.library.findUnique({
        where: { userId_bookId: { userId: session.user.id, bookId } },
        select: { id: true },
      }),
      prisma.betaReader.findUnique({
        where: { bookId_userId: { bookId, userId: session.user.id } },
        select: { status: true },
      }),
    ])
    isSavedByViewer = !!libraryEntry
    viewerBetaStatus = betaEntry?.status ?? null
  }

  return {
    book: {
      id: book.id,
      title: book.title,
      synopsis: book.synopsis,
      coverUrl: book.coverUrl,
      genres: book.genres,
      language: book.language,
      bookStatus: book.bookStatus,
      publicationStatus: book.publicationStatus,
      license: book.license,
      author: book.author,
      chapters: book.chapters,
      averageRating: r ? Math.round(r.avg * 10) / 10 : null,
      ratingCount: r?.count ?? 0,
      isAuthenticated: !!session,
      isViewerAuthor,
      isSavedByViewer,
      viewerBetaStatus,
    },
  }
}
