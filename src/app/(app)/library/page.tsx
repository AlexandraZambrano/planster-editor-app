import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Settings2 } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/auth"
import { getLibraryBooks, getUserShelves, type LibraryFilters } from "@/actions/library"
import { getRecommendedBooks } from "@/actions/discovery"
import { LibraryFilterBar } from "@/components/library/library-filter-bar"
import { LibraryGrid } from "@/components/library/library-grid"
import { RecommendationCard } from "@/components/discovery/recommendation-card"
import { Button } from "@/components/ui/button"
import { SiteNav } from "@/components/shared/site-nav"
import type { BookStatus } from "@prisma/client"

export const metadata: Metadata = { title: "Library" }

interface Props {
  searchParams: Promise<{ shelf?: string; genre?: string; status?: string; sort?: string }>
}

export default async function LibraryPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/auth/login")

  const params = await searchParams

  const filters: LibraryFilters = {
    shelfId: params.shelf,
    genre: params.genre,
    bookStatus: params.status as BookStatus | undefined,
    sortBy: (params.sort as LibraryFilters["sortBy"]) ?? "addedAt",
  }

  const [{ entries = [] }, { shelves = [] }, { books: recommended = [] }, t] = await Promise.all([
    getLibraryBooks(filters),
    getUserShelves(),
    getRecommendedBooks(),
    getTranslations("Library"),
  ])

  return (
    <>
      <SiteNav active="library" />
      <main className="bg-[#B6A7C4] pb-14">
        <div className="container mx-auto py-10 px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t("title")}</h1>
            <Button asChild variant="secondary" size="sm" className="rounded-full">
              <Link href="/library/shelves">
                <Settings2 className="h-4 w-4 mr-2" />
                {t("manageShelves")}
              </Link>
            </Button>
          </div>

          <div className="bg-white/70 backdrop-blur rounded-xl inline-flex p-2.5 mb-6 [&>div]:mb-0">
            <LibraryFilterBar shelves={shelves} />
          </div>

          <LibraryGrid key={JSON.stringify(filters)} initialEntries={entries} shelves={shelves} />

          <div className="border-t border-white/30 my-10" />

          {recommended.length > 0 && (
            <section id="recommendations" className="scroll-mt-20">
              <h2 className="text-2xl font-extrabold text-white mb-6">{t("recommendationsForYou")}</h2>
              <div className="flex justify-center items-center py-4">
                {recommended.slice(0, 3).map((book, i, arr) => {
                  const isCenter = arr.length > 1 && i === Math.floor((arr.length - 1) / 2)
                  return (
                    <RecommendationCard
                      key={book.id}
                      book={book}
                      className={cn(
                        i > 0 && "-ml-8 sm:-ml-10",
                        isCenter ? "z-10 shadow-xl -translate-y-3 scale-105" : "z-0"
                      )}
                    />
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
