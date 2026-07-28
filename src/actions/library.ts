"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import type { BookStatus } from "@prisma/client"

const VALID_RATINGS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

// System shelf names that automatically exclude each other when a book is added.
const SHELF_EXCLUSIONS: Record<string, string> = {
  "Reading now": "Want to read",
  "Read": "Reading now",
}

// Canonical display order for system shelves — createMany() gives them identical
// createdAt timestamps at registration, so createdAt alone can't order them reliably.
const SYSTEM_SHELF_ORDER = ["Reading now", "Want to read", "Read"]

// ─── SHELVES ────────────────────────────────────────────────────────────────

export type ShelfWithCount = {
  id: string
  name: string
  isPublic: boolean
  isSystem: boolean
  bookCount: number
}

export async function getUserShelves(): Promise<{ error?: string; shelves?: ShelfWithCount[] }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const shelves = await prisma.shelf.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { shelfBooks: true } } },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  })

  const sorted = [...shelves].sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
    if (a.isSystem) return SYSTEM_SHELF_ORDER.indexOf(a.name) - SYSTEM_SHELF_ORDER.indexOf(b.name)
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  return {
    shelves: sorted.map((s) => ({
      id: s.id,
      name: s.name,
      isPublic: s.isPublic,
      isSystem: s.isSystem,
      bookCount: s._count.shelfBooks,
    })),
  }
}

export async function createShelf(name: string): Promise<{ error?: string; shelfId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const trimmed = name.trim()
  if (!trimmed) return { error: "Shelf name is required" }
  if (trimmed.length > 50) return { error: "Shelf name cannot exceed 50 characters" }

  const shelf = await prisma.shelf.create({
    data: { userId: session.user.id, name: trimmed, isSystem: false },
  })

  revalidatePath("/library")
  revalidatePath("/library/shelves")
  return { shelfId: shelf.id }
}

export async function renameShelf(
  shelfId: string,
  name: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const trimmed = name.trim()
  if (!trimmed) return { error: "Shelf name is required" }
  if (trimmed.length > 50) return { error: "Shelf name cannot exceed 50 characters" }

  const shelf = await prisma.shelf.findUnique({
    where: { id: shelfId },
    select: { userId: true, isSystem: true },
  })
  if (!shelf || shelf.userId !== session.user.id) return { error: "Not found" }
  if (shelf.isSystem) return { error: "System shelves cannot be renamed" }

  await prisma.shelf.update({ where: { id: shelfId }, data: { name: trimmed } })

  revalidatePath("/library")
  revalidatePath("/library/shelves")
  return { success: true }
}

export async function toggleShelfVisibility(
  shelfId: string,
  isPublic: boolean
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const shelf = await prisma.shelf.findUnique({
    where: { id: shelfId },
    select: { userId: true },
  })
  if (!shelf || shelf.userId !== session.user.id) return { error: "Not found" }

  await prisma.shelf.update({ where: { id: shelfId }, data: { isPublic } })

  revalidatePath("/library/shelves")
  return { success: true }
}

export async function deleteShelf(shelfId: string): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const shelf = await prisma.shelf.findUnique({
    where: { id: shelfId },
    select: { userId: true, isSystem: true },
  })
  if (!shelf || shelf.userId !== session.user.id) return { error: "Not found" }
  if (shelf.isSystem) return { error: "System shelves cannot be deleted" }

  await prisma.shelf.delete({ where: { id: shelfId } })

  revalidatePath("/library")
  revalidatePath("/library/shelves")
  return { success: true }
}

// ─── SAVE / RATE ────────────────────────────────────────────────────────────

export async function saveToLibrary(bookId: string): Promise<{ error?: string; libraryId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true, title: true, publicationStatus: true },
  })
  if (!book) return { error: "Book not found" }
  if (book.publicationStatus !== "PUBLISHED") return { error: "This book is not available to save" }

  const existing = await prisma.library.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId } },
  })
  if (existing) return { libraryId: existing.id }

  const library = await prisma.library.create({
    data: { userId: session.user.id, bookId },
  })

  if (book.authorId !== session.user.id) {
    await createNotification(book.authorId, "BOOK_SAVED", {
      bookId,
      bookTitle: book.title,
      actorName: session.user.username,
      actorAvatarUrl: session.user.avatarUrl ?? null,
    })
  }

  revalidatePath("/library")
  return { libraryId: library.id }
}

export async function removeFromLibrary(bookId: string): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const existing = await prisma.library.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId } },
  })
  if (!existing) return { error: "Not found" }

  await prisma.library.delete({ where: { id: existing.id } })

  revalidatePath("/library")
  return { success: true }
}

export async function rateBook(
  bookId: string,
  rating: number
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  if (!VALID_RATINGS.includes(rating)) return { error: "Invalid rating" }

  const existing = await prisma.library.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId } },
  })
  if (!existing) return { error: "Save this book to your library before rating it" }

  await prisma.library.update({ where: { id: existing.id }, data: { rating } })

  revalidatePath("/library")
  return { success: true }
}

// ─── SHELF MEMBERSHIP ───────────────────────────────────────────────────────

async function applyShelfExclusion(userId: string, libraryId: string, addedShelfId: string) {
  const addedShelf = await prisma.shelf.findUnique({
    where: { id: addedShelfId },
    select: { name: true, isSystem: true },
  })
  if (!addedShelf?.isSystem) return

  const toRemoveName = SHELF_EXCLUSIONS[addedShelf.name]
  if (!toRemoveName) return

  const toRemoveShelf = await prisma.shelf.findFirst({
    where: { userId, name: toRemoveName, isSystem: true },
    select: { id: true },
  })
  if (!toRemoveShelf) return

  await prisma.shelfBook.deleteMany({
    where: { libraryId, shelfId: toRemoveShelf.id },
  })
}

export async function addBookToShelf(
  libraryId: string,
  shelfId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const [library, shelf] = await Promise.all([
    prisma.library.findUnique({ where: { id: libraryId }, select: { userId: true } }),
    prisma.shelf.findUnique({ where: { id: shelfId }, select: { userId: true } }),
  ])
  if (!library || library.userId !== session.user.id) return { error: "Not found" }
  if (!shelf || shelf.userId !== session.user.id) return { error: "Not found" }

  await prisma.shelfBook.upsert({
    where: { shelfId_libraryId: { shelfId, libraryId } },
    create: { shelfId, libraryId },
    update: {},
  })

  await applyShelfExclusion(session.user.id, libraryId, shelfId)

  revalidatePath("/library")
  return { success: true }
}

export async function removeBookFromShelf(
  libraryId: string,
  shelfId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const library = await prisma.library.findUnique({
    where: { id: libraryId },
    select: { userId: true },
  })
  if (!library || library.userId !== session.user.id) return { error: "Not found" }

  await prisma.shelfBook.deleteMany({ where: { libraryId, shelfId } })

  revalidatePath("/library")
  return { success: true }
}

// ─── LIBRARY LISTING ────────────────────────────────────────────────────────

export type LibraryFilters = {
  shelfId?: string
  genre?: string
  bookStatus?: BookStatus
  sortBy?: "addedAt" | "rating" | "title"
}

export type LibraryBookEntry = {
  libraryId: string
  rating: number | null
  addedAt: Date
  book: {
    id: string
    title: string
    synopsis: string | null
    coverUrl: string | null
    bookStatus: BookStatus
    genres: string[]
    author: { username: string; displayName: string }
  }
  shelfIds: string[]
}

export async function getLibraryBooks(
  filters: LibraryFilters = {}
): Promise<{ error?: string; entries?: LibraryBookEntry[] }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const bookWhere: { genres?: { has: string }; bookStatus?: BookStatus } = {}
  if (filters.genre) bookWhere.genres = { has: filters.genre }
  if (filters.bookStatus) bookWhere.bookStatus = filters.bookStatus

  const entries = await prisma.library.findMany({
    where: {
      userId: session.user.id,
      ...(Object.keys(bookWhere).length > 0 ? { book: bookWhere } : {}),
      ...(filters.shelfId ? { shelfBooks: { some: { shelfId: filters.shelfId } } } : {}),
    },
    select: {
      id: true,
      rating: true,
      addedAt: true,
      book: {
        select: {
          id: true,
          title: true,
          synopsis: true,
          coverUrl: true,
          bookStatus: true,
          genres: true,
          author: { select: { username: true, displayName: true } },
        },
      },
      shelfBooks: { select: { shelfId: true } },
    },
    orderBy:
      filters.sortBy === "rating"
        ? { rating: "desc" }
        : filters.sortBy === "title"
          ? { book: { title: "asc" } }
          : { addedAt: "desc" },
  })

  return {
    entries: entries.map((e) => ({
      libraryId: e.id,
      rating: e.rating,
      addedAt: e.addedAt,
      book: e.book,
      shelfIds: e.shelfBooks.map((sb) => sb.shelfId),
    })),
  }
}
