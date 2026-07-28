"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { useLocale, useTranslations } from "next-intl"
import type { DeadlineProgress, GoalData } from "@/actions/goals"

interface DeadlineProgressChartProps {
  data: DeadlineProgress[]
  goal: GoalData
  totalWordsBook: number
}

export function DeadlineProgressChart({ data, goal, totalWordsBook }: DeadlineProgressChartProps) {
  const t = useTranslations("Goals")
  const locale = useLocale()

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00Z")
    return d.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" })
  }

  function tickFormatter(value: string, index: number, length: number): string {
    if (length <= 10) return formatDate(value)
    return index % Math.ceil(length / 8) === 0 ? formatDate(value) : ""
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const wordsRemaining = Math.max(0, goal.targetWords - totalWordsBook)
  const daysRemaining = goal.deadlineDate
    ? Math.max(0, Math.ceil((new Date(goal.deadlineDate).getTime() - Date.now()) / 86400000))
    : 0

  const wordsPerDay = daysRemaining > 0 ? Math.ceil(wordsRemaining / daysRemaining) : 0

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm">{t("deadlineProgressTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("goalByDate", {
              target: goal.targetWords.toLocaleString(),
              date: goal.deadlineDate
                ? new Date(goal.deadlineDate).toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })
                : "—",
            })}
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="text-center">
            <p className="font-semibold">{wordsRemaining.toLocaleString()}</p>
            <p className="text-muted-foreground">{t("wordsLeft")}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{daysRemaining}</p>
            <p className="text-muted-foreground">{t("daysLeft")}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{wordsPerDay.toLocaleString()}</p>
            <p className="text-muted-foreground">{t("wordsPerDayNeeded")}</p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(v, i) => tickFormatter(v, i, data.length)}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              t("wordsUnit", { count: value }),
              name === "ideal" ? t("idealPace") : t("actual"),
            ]}
            labelFormatter={(label: string) => formatDate(label)}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              fontSize: 12,
            }}
          />
          <Legend
            formatter={(value) => (value === "ideal" ? t("idealPace") : t("actualProgress"))}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <ReferenceLine x={todayStr} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
