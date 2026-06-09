import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ReadingView } from "./reading-view"

interface Props {
  params: Promise<{ bookId: string; chapterId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapterId } = await params
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { title: true, book: { select: { title: true } } },
  })
  if (!chapter) return {}
  return { title: `${chapter.title} — ${chapter.book.title}` }
}

export default async function ReadPage({ params }: Props) {
  const { bookId, chapterId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      content: true,
      order: true,
      visibility: true,
      bookId: true,
      book: { select: { id: true, title: true, authorId: true } },
    },
  })

  if (!chapter || chapter.bookId !== bookId) notFound()

  const isAuthor = chapter.book.authorId === session.user.id

  // Resolve beta reader status for non-authors
  let betaReaderId: string | null = null
  let isBeta = false
  if (!isAuthor) {
    const betaReader = await prisma.betaReader.findUnique({
      where: { bookId_userId: { bookId, userId: session.user.id } },
      select: { id: true, status: true },
    })
    if (betaReader?.status === "APPROVED") {
      betaReaderId = betaReader.id
      isBeta = true
    }
  }

  // Enforce visibility rules
  if (!isAuthor) {
    if (chapter.visibility === "DRAFT") notFound()
    if (chapter.visibility === "BETA" && !isBeta) notFound()
  }

  // Determine which chapters are accessible for prev/next navigation
  const accessibleChapters = await prisma.chapter.findMany({
    where: {
      bookId,
      ...(isAuthor
        ? {}
        : isBeta
        ? { visibility: { in: ["BETA", "PUBLISHED"] } }
        : { visibility: "PUBLISHED" }),
    },
    orderBy: { order: "asc" },
    select: { id: true },
  })

  const idx = accessibleChapters.findIndex((c) => c.id === chapterId)
  const prevChapterId = idx > 0 ? (accessibleChapters[idx - 1]?.id ?? null) : null
  const nextChapterId =
    idx < accessibleChapters.length - 1 ? (accessibleChapters[idx + 1]?.id ?? null) : null

  // Check if beta reader already submitted a review
  let existingReview: string | null = null
  if (isBeta && betaReaderId) {
    const review = await prisma.chapterReview.findUnique({
      where: { chapterId_betaReaderId: { chapterId, betaReaderId } },
      select: { content: true },
    })
    existingReview = review?.content ?? null
  }

  return (
    <ReadingView
      bookId={bookId}
      chapterId={chapterId}
      bookTitle={chapter.book.title}
      chapterTitle={chapter.title}
      content={chapter.content as object}
      isAuthor={isAuthor}
      isBeta={isBeta}
      betaReaderId={betaReaderId}
      prevChapterId={prevChapterId}
      nextChapterId={nextChapterId}
      existingReview={existingReview}
    />
  )
}
