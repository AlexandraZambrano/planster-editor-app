"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { PublicationStatus } from "@prisma/client"

const textLayerSchema = z.object({
  id: z.string(),
  text: z.string(),
  xPercent: z.number(),
  yPercent: z.number(),
  fontId: z.string(),
  color: z.string(),
  fontSize: z.number(),
})

const coverDesignSchema = z.object({
  backgroundType: z.enum(["PRESET", "UPLOAD", "STOCK"]),
  backgroundValue: z.string().min(1),
  textLayers: z.array(textLayerSchema),
  stockPhotographerName: z.string().optional(),
  stockPhotographerUrl: z.string().optional(),
  stockSourceUrl: z.string().optional(),
})

const bookSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title cannot exceed 200 characters"),
  synopsis: z.string().max(2000, "Synopsis cannot exceed 2000 characters").optional(),
  coverUrl: z.string().optional(),
  coverDesign: coverDesignSchema.optional(),
  genres: z.array(z.string()),
  tags: z.array(z.string().max(30, "Each tag cannot exceed 30 characters")).max(10, "Maximum 10 tags"),
  language: z.string().default("es"),
  bookStatus: z.enum(["IN_PROGRESS", "COMPLETE", "PAUSED"]).default("IN_PROGRESS"),
  license: z
    .enum(["ALL_RIGHTS_RESERVED", "CC_BY", "CC_BY_NC", "CC_BY_NC_ND", "PUBLIC_DOMAIN"])
    .default("ALL_RIGHTS_RESERVED"),
})

type BookInput = z.infer<typeof bookSchema>
type CoverDesignInput = z.infer<typeof coverDesignSchema>

async function persistCoverDesign(bookId: string, coverDesign: CoverDesignInput | undefined) {
  if (coverDesign) {
    const designFields = {
      backgroundType: coverDesign.backgroundType,
      backgroundValue: coverDesign.backgroundValue,
      textLayers: coverDesign.textLayers,
      stockPhotographerName: coverDesign.stockPhotographerName,
      stockPhotographerUrl: coverDesign.stockPhotographerUrl,
      stockSourceUrl: coverDesign.stockSourceUrl,
    }
    await prisma.bookCoverDesign.upsert({
      where: { bookId },
      create: { bookId, ...designFields },
      update: designFields,
    })
  } else {
    // The cover was replaced with a plain manual upload (or removed) — any
    // previously saved design recipe is now stale, so drop it rather than
    // let reopening the designer resurrect pixels that no longer match the
    // visible cover.
    await prisma.bookCoverDesign.deleteMany({ where: { bookId } })
  }
}

export async function createBook(
  data: BookInput
): Promise<{ error?: string; bookId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const parsed = bookSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data" }

  const book = await prisma.book.create({
    data: {
      authorId: session.user.id,
      title: parsed.data.title,
      synopsis: parsed.data.synopsis ?? null,
      coverUrl: parsed.data.coverUrl || null,
      genres: parsed.data.genres,
      tags: parsed.data.tags,
      language: parsed.data.language,
      bookStatus: parsed.data.bookStatus,
      license: parsed.data.license,
    },
  })

  const coverDesign = parsed.data.coverDesign
  if (coverDesign) {
    await prisma.bookCoverDesign.create({
      data: {
        bookId: book.id,
        backgroundType: coverDesign.backgroundType,
        backgroundValue: coverDesign.backgroundValue,
        textLayers: coverDesign.textLayers,
        stockPhotographerName: coverDesign.stockPhotographerName,
        stockPhotographerUrl: coverDesign.stockPhotographerUrl,
        stockSourceUrl: coverDesign.stockSourceUrl,
      },
    })
  }

  revalidatePath("/write")
  return { bookId: book.id }
}

export async function updateBook(
  bookId: string,
  data: BookInput
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true },
  })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  const parsed = bookSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data" }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      title: parsed.data.title,
      synopsis: parsed.data.synopsis ?? null,
      coverUrl: parsed.data.coverUrl || null,
      genres: parsed.data.genres,
      tags: parsed.data.tags,
      language: parsed.data.language,
      bookStatus: parsed.data.bookStatus,
      license: parsed.data.license,
    },
  })

  await persistCoverDesign(bookId, parsed.data.coverDesign)

  revalidatePath(`/write/${bookId}`)
  revalidatePath("/write")
  return { success: true }
}

// Called directly from the cover designer when editing an existing book, so
// "Save cover" actually persists immediately instead of only updating local
// form state until the writer separately clicks the page's "Save changes"
// (confusing — it looked saved but wasn't).
export async function updateBookCover(
  bookId: string,
  coverUrl: string,
  coverDesign?: CoverDesignInput
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true },
  })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  const parsed = coverDesignSchema.optional().safeParse(coverDesign)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data" }

  await prisma.book.update({ where: { id: bookId }, data: { coverUrl: coverUrl || null } })
  await persistCoverDesign(bookId, parsed.data)

  revalidatePath(`/write/${bookId}`)
  revalidatePath("/write")
  return { success: true }
}

export async function updateBookPublicationStatus(
  bookId: string,
  status: PublicationStatus
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { authorId: true, genres: true },
  })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  if (status !== "DRAFT" && book.genres.length === 0) {
    return { error: "Add at least one genre before changing status" }
  }

  await prisma.book.update({
    where: { id: bookId },
    data: { publicationStatus: status },
  })

  revalidatePath(`/write/${bookId}`)
  revalidatePath("/write")
  return { success: true }
}

export async function deleteBook(
  bookId: string,
  force = false
): Promise<{ error?: string; success?: boolean; requiresConfirmation?: boolean; betaCount?: number }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      authorId: true,
      _count: { select: { betaReaders: { where: { status: "APPROVED" } } } },
    },
  })
  if (!book || book.authorId !== session.user.id) return { error: "Not found" }

  if (!force && book._count.betaReaders > 0) {
    return { requiresConfirmation: true, betaCount: book._count.betaReaders }
  }

  await prisma.book.delete({ where: { id: bookId } })

  revalidatePath("/write")
  return { success: true }
}
