import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { PlusIcon, BookOpen } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { BookCard } from "@/components/book/book-card"
import { SiteNav } from "@/components/shared/site-nav"

export const metadata: Metadata = { title: "My books" }

export default async function WritePage() {
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [books, t] = await Promise.all([
    prisma.book.findMany({
      where: { authorId: session.user.id },
      select: {
        id: true,
        title: true,
        synopsis: true,
        coverUrl: true,
        publicationStatus: true,
        updatedAt: true,
        _count: { select: { chapters: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getTranslations("Write"),
  ])

  return (
    <>
      <SiteNav active="write" />
      <main className="bg-white min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto py-14 px-4 max-w-6xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground max-w-xl">
            {t("heroTitle")}
          </h1>

          <div className="flex items-center justify-between mt-10 mb-4">
            <h2 className="text-lg font-bold text-foreground tracking-wide">{t("yourStories")}</h2>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/write/new">
                <PlusIcon className="h-4 w-4 mr-1.5" />
                {t("createNewStory")}
              </Link>
            </Button>
          </div>

          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted rounded-xl">
              <BookOpen className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">{t("noBooksYet")}</p>
              <p className="text-sm mb-6">{t("noBooksYetHint")}</p>
              <Button asChild className="rounded-full">
                <Link href="/write/new">{t("createFirstBook")}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} chapterCount={book._count.chapters} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
