import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getExploreBooks, type ExploreFilters as ExploreFiltersType } from "@/actions/discovery"
import { SiteNav } from "@/components/shared/site-nav"
import { ExploreTabs } from "@/components/discovery/explore-tabs"
import { ExploreFilters } from "@/components/discovery/explore-filters"
import { BookGridCard } from "@/components/discovery/book-grid-card"
import { PaginationControls } from "@/components/discovery/pagination-controls"
import { BookOpen } from "lucide-react"
import type { BookStatus } from "@prisma/client"

export const metadata: Metadata = { title: "Explore" }

interface Props {
  searchParams: Promise<{
    genre?: string | string[]
    language?: string
    status?: string
    minRating?: string
    q?: string
    page?: string
  }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams

  const genres = params.genre ? (Array.isArray(params.genre) ? params.genre : [params.genre]) : undefined

  const filters: ExploreFiltersType = {
    genres,
    language: params.language,
    bookStatus: params.status as BookStatus | undefined,
    minRating: params.minRating ? Number(params.minRating) : undefined,
    search: params.q,
    page: params.page ? Number(params.page) : 1,
  }

  const [{ books, totalCount, page, pageSize }, t, tPeople] = await Promise.all([
    getExploreBooks(filters),
    getTranslations("Explore"),
    getTranslations("People"),
  ])
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <>
      <SiteNav active="explore" />
      <main className="container mx-auto py-10 px-4 max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
        <ExploreTabs active="books" booksLabel={tPeople("tabBooks")} peopleLabel={tPeople("tabPeople")} />

        <ExploreFilters />

        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">{t("noBooksFound")}</p>
            <p className="text-sm">{t("adjustFilters")}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{t("bookCount", { count: totalCount })}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {books.map((book) => (
                <BookGridCard key={book.id} book={book} />
              ))}
            </div>
            <PaginationControls page={page} totalPages={totalPages} />
          </>
        )}
      </main>
    </>
  )
}
