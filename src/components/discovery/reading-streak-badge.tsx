import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { ReadingStreakData } from "@/actions/reading"

export function ReadingStreakBadge({ streak, weekDays }: ReadingStreakData) {
  const t = useTranslations("Home")
  const message =
    streak === 0
      ? t("streakStart")
      : streak === 1
        ? t("streakFirstDay")
        : t("streakOngoing", { streak })

  return (
    <div className="text-center w-28">
      <p className="text-xs font-semibold mb-1.5">{t("keepYourStrike")}</p>
      <div className="flex items-center justify-center gap-1 mb-1.5">
        {weekDays.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                day.read ? "bg-primary" : "bg-muted",
                day.isToday && !day.read && "ring-2 ring-primary/40"
              )}
              aria-hidden
            />
            <span className="text-[10px] text-muted-foreground">{day.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{message}</p>
    </div>
  )
}
