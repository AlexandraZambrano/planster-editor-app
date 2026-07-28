"use client"

import { BookOpen, Calendar, CalendarDays, Target } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface SummaryCardsProps {
  totalWordsBook: number
  wordsThisWeek: number
  weeklyGoalTarget: number | null
  wordsThisMonth: number
  monthlyGoalTarget: number | null
  streak: number
  longestStreak: number
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 flex flex-col gap-2 bg-card",
        accent && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </div>
      <p className={cn("text-2xl font-bold tracking-tight", accent && "text-primary")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function SummaryCards({
  totalWordsBook,
  wordsThisWeek,
  weeklyGoalTarget,
  wordsThisMonth,
  monthlyGoalTarget,
  streak,
  longestStreak,
}: SummaryCardsProps) {
  const t = useTranslations("Goals")

  function progressLabel(current: number, target: number | null): string | undefined {
    if (!target) return undefined
    const pct = Math.min(100, Math.round((current / target) * 100))
    return t("progressOfGoal", { pct, target: target.toLocaleString() })
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<BookOpen className="h-4 w-4" />}
        label={t("totalWords")}
        value={totalWordsBook.toLocaleString()}
        sub={t("inThisBook")}
      />
      <StatCard
        icon={<Calendar className="h-4 w-4" />}
        label={t("thisWeek")}
        value={wordsThisWeek.toLocaleString()}
        sub={progressLabel(wordsThisWeek, weeklyGoalTarget)}
        accent={!!weeklyGoalTarget && wordsThisWeek >= weeklyGoalTarget}
      />
      <StatCard
        icon={<CalendarDays className="h-4 w-4" />}
        label={t("thisMonth")}
        value={wordsThisMonth.toLocaleString()}
        sub={progressLabel(wordsThisMonth, monthlyGoalTarget)}
        accent={!!monthlyGoalTarget && wordsThisMonth >= monthlyGoalTarget}
      />
      <StatCard
        icon={<Target className="h-4 w-4" />}
        label={t("streak")}
        value={t("streakValue", { streak })}
        sub={t("streakRecord", { longestStreak })}
        accent={streak > 0}
      />
    </div>
  )
}
