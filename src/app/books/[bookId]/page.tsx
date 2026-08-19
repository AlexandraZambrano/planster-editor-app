import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Copyright } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getBookPageData } from "@/actions/discovery"
import { SiteNav } from "@/components/shared/site-nav"
import { SaveToLibraryButton } from "@/components/discovery/save-to-library-button"
import { BetaApplySection } from "@/components/discovery/beta-apply-section"
import { StarRating } from "@/components/library/star-rating"
import { Badge } from "@/components/ui/badge"
import { LANGUAGES, BOOK_LICENSES } from "@/lib/constants"

interface Props {
  params: Promise<{ bookId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookId } = await params
  const { book } = await getBookPageData(bookId)
  return { title: book?.title ?? "Book" }
}

export default async function BookPage({ params }: Props) {
  const { bookId } = await params
  const [{ error, book }, t, tCommon] = await Promise.all([
    getBookPageData(bookId),
    getTranslations("Book"),
    getTranslations("Common"),
  ])

  if (error || !book) notFound()

  const languageLabel = LANGUAGES.find((l) => l.code === book.language)?.label ?? book.language
  const canApplyBeta = book.publicationStatus === "BETA" || book.publicationStatus === "PUBLISHED"
  const licenseUrl = BOOK_LICENSES.find((l) => l.code === book.license)?.url ?? null
  const licenseLabel = tCommon(`bookLicense.${book.license}` as "bookLicense.ALL_RIGHTS_RESERVED")

  return (
    <>
      <SiteNav />
      <main className="container mx-auto py-10 px-4 max-w-4xl">
        <div className="flex gap-8 flex-col sm:flex-row">
          <div className="w-full sm:w-56 shrink-0">
            <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-muted border">
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt={book.title} fill sizes="224px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82]">
                  <span className="text-6xl font-bold text-white select-none">
                    {book.title[0]?.toUpperCase() ?? <BookOpen />}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-1">{book.title}</h1>
            <Link
              href={`/@${book.author.username}`}
              className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-block"
            >
              {tCommon("byAuthor", { name: book.author.displayName })}
            </Link>

            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {book.ratingCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <StarRating value={book.averageRating} readOnly />
                  <span className="text-sm text-muted-foreground">
                    {t("ratingCount", { count: book.ratingCount })}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">{t("noRatingsYet")}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              {book.genres.map((g) => (
                <Badge key={g} variant="outline">
                  {g}
                </Badge>
              ))}
              <Badge variant="secondary">{languageLabel}</Badge>
              <Badge variant="secondary">{tCommon(`bookStatus.${book.bookStatus}` as "bookStatus.IN_PROGRESS")}</Badge>
            </div>

            {book.coverPhotoCredit && (
              <p className="text-xs text-muted-foreground mb-2">
                {t("coverPhotoCredit", { name: book.coverPhotoCredit.name })}
                {book.coverPhotoCredit.url && (
                  <>
                    {" · "}
                    <a
                      href={book.coverPhotoCredit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground hover:underline"
                    >
                      Unsplash
                    </a>
                  </>
                )}
              </p>
            )}

            {book.synopsis && (
              <p className="text-sm leading-relaxed text-foreground/90 mb-4 whitespace-pre-line">
                {book.synopsis}
              </p>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
              <Copyright className="h-3.5 w-3.5 shrink-0" />
              {licenseUrl ? (
                <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
                  {licenseLabel}
                </a>
              ) : (
                <span>{licenseLabel}</span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {book.isAuthenticated && !book.isViewerAuthor && (
                <SaveToLibraryButton bookId={book.id} initialSaved={book.isSavedByViewer} />
              )}
              {book.isAuthenticated && !book.isViewerAuthor && canApplyBeta && (
                <BetaApplySection bookId={book.id} initialStatus={book.viewerBetaStatus} />
              )}
            </div>
          </div>
        </div>

        {book.chapters.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">{t("chapters")}</h2>
            <div className="space-y-1.5">
              {book.chapters.map((chapter, i) => (
                <Link
                  key={chapter.id}
                  href={`/read/${book.id}/${chapter.id}`}
                  className="flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
                >
                  <span>
                    {i + 1}. {chapter.title}
                  </span>
                  <span className="text-muted-foreground">{t("wordCount", { count: chapter.wordCount })}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
