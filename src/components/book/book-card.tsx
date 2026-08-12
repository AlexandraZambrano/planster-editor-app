import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { BookOpen } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { useDateLocale } from "@/lib/date-locale"
import type { Book } from "@prisma/client"

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  BETA: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
}

interface BookCardProps {
  book: Pick<Book, "id" | "title" | "synopsis" | "coverUrl" | "publicationStatus" | "updatedAt">
  chapterCount: number
}

export function BookCard({ book, chapterCount }: BookCardProps) {
  const t = useTranslations("Write")
  const tCommon = useTranslations("Common")
  const dateLocale = useDateLocale()

  return (
    <Link href={`/write/${book.id}`} className="group flex gap-4 p-4 rounded-xl bg-muted border border-white/60">
      <div className="relative w-20 sm:w-24 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-muted border">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82]">
            <span className="text-2xl font-bold text-white select-none">
              {book.title[0]?.toUpperCase() ?? <BookOpen />}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {t("lastEdited", {
            time: formatDistanceToNow(new Date(book.updatedAt), { addSuffix: true, locale: dateLocale }),
          })}
        </p>
        <p className="font-bold leading-tight">{book.title}</p>
        {book.synopsis && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{book.synopsis}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded font-medium",
              STATUS_STYLES[book.publicationStatus]
            )}
          >
            {tCommon(`publicationStatus.${book.publicationStatus}` as "publicationStatus.DRAFT")}
          </span>
          <span className="text-xs text-muted-foreground">
            {tCommon("chapterCountShort", { count: chapterCount })}
          </span>
        </div>
      </div>
    </Link>
  )
}
