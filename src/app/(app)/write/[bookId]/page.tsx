import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ChapterList } from "@/components/book/chapter-list"
import { BookSettingsPanel } from "@/components/book/book-settings-panel"
import { BetaManagement } from "@/components/beta/beta-management"
import { PUBLICATION_STATUS_LABELS, BOOK_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const PUB_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  BETA: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
}

interface Props {
  params: Promise<{ bookId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookId } = await params
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } })
  return { title: book?.title ?? "Book" }
}

export default async function BookPanelPage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          visibility: true,
          wordCount: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!book || book.authorId !== session.user.id) notFound()

  const totalWords = book.chapters.reduce((sum, c) => sum + c.wordCount, 0)

  return (
    <main className="container mx-auto py-8 px-4 max-w-4xl">
      <Link
        href="/write"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        My books
      </Link>

      {/* Book header */}
      <div className="flex gap-5 items-start mb-8">
        <div className="relative w-16 aspect-[2/3] rounded-md overflow-hidden bg-muted border shrink-0">
          {book.coverUrl ? (
            <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-400 to-violet-700">
              <span className="text-xl font-bold text-white">{book.title[0]?.toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded font-medium mt-1",
                PUB_STATUS_STYLES[book.publicationStatus]
              )}
            >
              {PUBLICATION_STATUS_LABELS[book.publicationStatus]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {BOOK_STATUS_LABELS[book.bookStatus]} · {book.chapters.length} chapter
            {book.chapters.length !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words
          </p>
          {book.genres.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {book.genres.map((g) => (
                <Badge key={g} variant="outline" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chapters">
        <TabsList className="mb-6">
          <TabsTrigger value="chapters">
            Chapters ({book.chapters.length})
          </TabsTrigger>
          <TabsTrigger value="beta">Beta readers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="chapters">
          <ChapterList bookId={book.id} initialChapters={book.chapters} />
        </TabsContent>

        <TabsContent value="beta">
          <BetaManagement bookId={book.id} />
        </TabsContent>

        <TabsContent value="settings">
          <BookSettingsPanel
            book={{
              id: book.id,
              title: book.title,
              synopsis: book.synopsis,
              coverUrl: book.coverUrl,
              genres: book.genres,
              tags: book.tags,
              language: book.language,
              bookStatus: book.bookStatus,
              publicationStatus: book.publicationStatus,
            }}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
