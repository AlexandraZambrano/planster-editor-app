import Link from "next/link"
import { BOOK_GENRES } from "@/lib/constants"

export function GenreGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {BOOK_GENRES.map((genre) => (
        <Link
          key={genre}
          href={`/explore?genre=${encodeURIComponent(genre)}`}
          className="flex items-center justify-center rounded-lg border bg-muted/40 px-4 py-6 text-sm font-medium hover:bg-muted transition-colors text-center"
        >
          {genre}
        </Link>
      ))}
    </div>
  )
}
