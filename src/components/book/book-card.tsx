import Link from "next/link"
import Image from "next/image"
import { BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { PUBLICATION_STATUS_LABELS } from "@/lib/constants"
import type { Book } from "@prisma/client"

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  BETA: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
}

interface BookCardProps {
  book: Pick<Book, "id" | "title" | "coverUrl" | "publicationStatus" | "updatedAt">
  chapterCount: number
}

export function BookCard({ book, chapterCount }: BookCardProps) {
  return (
    <Link href={`/write/${book.id}`} className="group block">
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
      <p className="font-medium text-sm leading-tight line-clamp-2 mb-1">{book.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded font-medium",
            STATUS_STYLES[book.publicationStatus]
          )}
        >
          {PUBLICATION_STATUS_LABELS[book.publicationStatus]}
        </span>
        <span className="text-xs text-muted-foreground">
          {chapterCount} ch.
        </span>
      </div>
    </Link>
  )
}
