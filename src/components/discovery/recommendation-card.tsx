import Link from "next/link"
import Image from "next/image"
import { BookOpen } from "lucide-react"
import { StarRating } from "@/components/library/star-rating"
import { cn } from "@/lib/utils"
import type { DiscoveryBookCard } from "@/actions/discovery"

interface RecommendationCardProps {
  book: DiscoveryBookCard
  className?: string
}

export function RecommendationCard({ book, className }: RecommendationCardProps) {
  return (
    <Link
      href={`/books/${book.id}`}
      className={cn(
        "relative flex flex-col items-center text-center bg-white rounded-2xl p-4 w-40 sm:w-48 shrink-0 shadow-sm transition-transform duration-200 hover:z-30 hover:-translate-y-3 hover:scale-105 hover:shadow-xl",
        className
      )}
    >
      <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-muted border mb-2.5">
        {book.coverUrl ? (
          <Image src={book.coverUrl} alt={book.title} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82]">
            <span className="text-2xl font-bold text-white select-none">
              {book.title[0]?.toUpperCase() ?? <BookOpen />}
            </span>
          </div>
        )}
      </div>

      <p className="font-bold text-sm leading-tight mb-1 line-clamp-2">{book.title}</p>

      {book.genres.length > 0 && (
        <p className="text-[11px] text-muted-foreground mb-1.5">
          {book.genres.slice(0, 3).map((g) => `#${g}`).join(", ")}
        </p>
      )}

      {book.ratingCount > 0 && (
        <div className="mb-2">
          <StarRating value={book.averageRating} readOnly size="sm" />
        </div>
      )}

      {book.synopsis && (
        <p className="text-[11px] text-muted-foreground line-clamp-4">{book.synopsis}</p>
      )}
    </Link>
  )
}
