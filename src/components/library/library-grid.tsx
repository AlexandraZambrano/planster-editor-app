"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"
import { useTranslations } from "next-intl"
import { LibraryBookCard } from "./library-book-card"
import type { LibraryBookEntry, ShelfWithCount } from "@/actions/library"

interface LibraryGridProps {
  initialEntries: LibraryBookEntry[]
  shelves: ShelfWithCount[]
}

export function LibraryGrid({ initialEntries, shelves }: LibraryGridProps) {
  const t = useTranslations("Library")
  const [entries, setEntries] = useState(initialEntries)

  function handleRemove(libraryId: string) {
    setEntries((prev) => prev.filter((e) => e.libraryId !== libraryId))
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/80 bg-white/10 rounded-xl">
        <BookOpen className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-1">{t("noBooksYet")}</p>
        <p className="text-sm">{t("noBooksYetHint")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <LibraryBookCard key={entry.libraryId} entry={entry} shelves={shelves} onRemove={handleRemove} />
      ))}
    </div>
  )
}
