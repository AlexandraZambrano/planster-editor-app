import Image from "next/image"
import Link from "next/link"
import { Play, BookOpen } from "lucide-react"
import { useTranslations } from "next-intl"
import { ReadingStreakBadge } from "./reading-streak-badge"
import type { ContinueReadingEntry, ReadingStreakData } from "@/actions/reading"

interface ContinueReadingCardProps {
  entry: ContinueReadingEntry
  streak: ReadingStreakData
}

export function ContinueReadingCard({ entry, streak }: ContinueReadingCardProps) {
  const t = useTranslations("Home")

  return (
    <div className="flex gap-4 p-4 border rounded-xl bg-background">
      <div className="relative w-20 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-muted border">
        {entry.coverUrl ? (
          <Image src={entry.coverUrl} alt={entry.bookTitle} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-400 to-violet-700">
            <span className="text-2xl font-bold text-white select-none">
              {entry.bookTitle[0]?.toUpperCase() ?? <BookOpen />}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{t("continueReading")}</p>
        <p className="font-bold">{entry.bookTitle}</p>
        {entry.bookSynopsis && (
          <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{entry.bookSynopsis}</p>
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 shrink-0">
        <Link
          href={`/read/${entry.bookId}/${entry.chapterId}`}
          className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label={t("continueReadingAria", { bookTitle: entry.bookTitle })}
        >
          <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
        </Link>
        <ReadingStreakBadge streak={streak.streak} weekDays={streak.weekDays} />
      </div>
    </div>
  )
}
