"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { StarRating } from "./star-rating"
import { ShelfBadge } from "./shelf-badge"
import { AddToShelfDialog } from "./add-to-shelf-dialog"
import { rateBook, removeFromLibrary, type LibraryBookEntry, type ShelfWithCount } from "@/actions/library"

interface LibraryBookCardProps {
  entry: LibraryBookEntry
  shelves: ShelfWithCount[]
  onRemove: (libraryId: string) => void
}

export function LibraryBookCard({ entry, shelves, onRemove }: LibraryBookCardProps) {
  const t = useTranslations("Library")
  const tCommon = useTranslations("Common")
  const [rating, setRating] = useState(entry.rating)
  const [shelfIds, setShelfIds] = useState(entry.shelfIds)
  const [isPending, startTransition] = useTransition()

  function handleRate(value: number) {
    setRating(value)
    startTransition(async () => {
      await rateBook(entry.book.id, value)
    })
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromLibrary(entry.book.id)
      onRemove(entry.libraryId)
    })
  }

  const memberShelves = shelves.filter((s) => shelfIds.includes(s.id))

  return (
    <div className="flex gap-4 p-4 rounded-xl bg-[#F3E9EC] border border-white/60">
      <Link
        href={`/books/${entry.book.id}`}
        className="relative w-20 sm:w-24 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-muted border"
      >
        {entry.book.coverUrl ? (
          <Image
            src={entry.book.coverUrl}
            alt={entry.book.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-400 to-violet-700">
            <span className="text-2xl font-bold text-white select-none">
              {entry.book.title[0]?.toUpperCase() ?? <BookOpen />}
            </span>
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/books/${entry.book.id}`} className="hover:underline">
          <p className="font-bold leading-tight">{entry.book.title}</p>
        </Link>
        <Link
          href={`/@${entry.book.author.username}`}
          className="text-xs text-muted-foreground hover:text-foreground inline-block mb-1"
        >
          {tCommon("byAuthor", { name: entry.book.author.displayName })}
        </Link>
        {entry.book.synopsis && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{entry.book.synopsis}</p>
        )}

        <StarRating value={rating} onChange={handleRate} size="sm" />

        <div className="flex items-center gap-1 flex-wrap mt-1.5">
          {memberShelves.map((s) => (
            <ShelfBadge key={s.id} name={s.name} isSystem={s.isSystem} />
          ))}
          <AddToShelfDialog
            libraryId={entry.libraryId}
            shelves={shelves}
            shelfIds={shelfIds}
            onChange={setShelfIds}
          />
        </div>
      </div>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        disabled={isPending}
        aria-label={t("removeFromLibrary")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
