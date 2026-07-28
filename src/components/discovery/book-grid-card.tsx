import Link from "next/link"
import Image from "next/image"
import { BookOpen } from "lucide-react"
import { useTranslations } from "next-intl"
import { StarRating } from "@/components/library/star-rating"
import { Badge } from "@/components/ui/badge"
import type { DiscoveryBookCard } from "@/actions/discovery"

interface BookGridCardProps {
  book: DiscoveryBookCard
}

export function BookGridCard({ book }: BookGridCardProps) {
  const t = useTranslations("Common")

  return (
    <div className="group">
      <Link href={`/books/${book.id}`} className="block">
        <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-muted mb-2 border">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-400 to-violet-700">
              <span className="text-5xl font-bold text-white select-none">
                {book.title[0]?.toUpperCase() ?? <BookOpen />}
              </span>
            </div>
          )}
        </div>

        <p className="font-medium text-sm leading-tight line-clamp-2 mb-0.5">{book.title}</p>
      </Link>

      <Link
        href={`/@${book.author.username}`}
        className="text-xs text-muted-foreground hover:text-foreground mb-1 inline-block"
      >
        {t("byAuthor", { name: book.author.displayName })}
      </Link>

      {book.ratingCount > 0 && (
        <div className="mb-1">
          <StarRating value={book.averageRating} readOnly size="sm" />
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <span className="text-xs text-muted-foreground">{t(`bookStatus.${book.bookStatus}`)}</span>
        <span className="text-xs text-muted-foreground">{t("chapterCountShort", { count: book.chapterCount })}</span>
      </div>

      {book.genres.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {book.genres.slice(0, 2).map((g) => (
            <Badge key={g} variant="outline" className="text-xs">
              {g}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
