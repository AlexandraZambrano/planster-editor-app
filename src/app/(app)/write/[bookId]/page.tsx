import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Sparkles } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChapterList } from "@/components/book/chapter-list"
import { BookSettingsPanel } from "@/components/book/book-settings-panel"
import { BetaManagement } from "@/components/beta/beta-management"
import { SiteNav } from "@/components/shared/site-nav"
import { cn } from "@/lib/utils"
import type { CoverTextLayer } from "@/lib/cover-text-layers"

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

  const [book, t, tCommon] = await Promise.all([
    prisma.book.findUnique({
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
        coverDesign: {
          select: {
            backgroundType: true,
            backgroundValue: true,
            textLayers: true,
            stockPhotographerName: true,
            stockPhotographerUrl: true,
            stockSourceUrl: true,
          },
        },
      },
    }),
    getTranslations("Write"),
    getTranslations("Common"),
  ])

  if (!book || book.authorId !== session.user.id) notFound()

  const totalWords = book.chapters.reduce((sum, c) => sum + c.wordCount, 0)

  return (
    <>
      <SiteNav active="write" />
      <main className="bg-white min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/write"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("myBooks")}
            </Link>
            <Button asChild variant="secondary" size="sm" className="rounded-full">
              <Link href={`/write/${book.id}/studio`}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("writersStudio")}
              </Link>
            </Button>
          </div>

          {/* Book header */}
          <div className="flex gap-5 items-start mb-6 bg-muted rounded-xl p-5">
            <div className="relative w-24 sm:w-32 aspect-[2/3] rounded-md overflow-hidden bg-muted border shrink-0">
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="128px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82]">
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
                  {tCommon(`publicationStatus.${book.publicationStatus}` as "publicationStatus.DRAFT")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {tCommon(`bookStatus.${book.bookStatus}` as "bookStatus.IN_PROGRESS")} ·{" "}
                {t("chapterCount", { count: book.chapters.length })} ·{" "}
                {t("wordCount", { count: totalWords })}
              </p>
              {book.synopsis && (
                <p className="text-sm text-foreground/80 mt-2 line-clamp-3">{book.synopsis}</p>
              )}
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
            <TabsList className="mb-6 bg-muted">
              <TabsTrigger value="chapters">
                {t("chaptersTab", { count: book.chapters.length })}
              </TabsTrigger>
              <TabsTrigger value="beta">{t("betaReadersTab")}</TabsTrigger>
              <TabsTrigger value="settings">{t("settingsTab")}</TabsTrigger>
            </TabsList>

            <TabsContent value="chapters">
              <ChapterList bookId={book.id} initialChapters={book.chapters} />
            </TabsContent>

            <TabsContent value="beta">
              <div className="bg-muted rounded-xl p-5">
                <BetaManagement bookId={book.id} />
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="bg-muted rounded-xl p-5">
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
                    license: book.license,
                    coverDesign: book.coverDesign
                      ? { ...book.coverDesign, textLayers: book.coverDesign.textLayers as unknown as CoverTextLayer[] }
                      : null,
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}
