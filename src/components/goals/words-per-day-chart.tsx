"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { DailyWordCount } from "@/actions/goals"

interface WordsPerDayChartProps {
  data: DailyWordCount[]
  dailyGoalTarget: number | null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

// Show every 5th label to avoid crowding
function tickFormatter(value: string, index: number): string {
  return index % 5 === 0 ? formatDate(value) : ""
}

export function WordsPerDayChart({ data, dailyGoalTarget }: WordsPerDayChartProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Words written per day</h3>
        {dailyGoalTarget && (
          <span className="text-xs text-muted-foreground">
            Daily goal: {dailyGoalTarget.toLocaleString()} words
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), "Words"]}
            labelFormatter={(label: string) => formatDate(label)}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              fontSize: 12,
            }}
          />
          <Bar dataKey="words" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.goalMet ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" />
          Goal met
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/40 inline-block" />
          {dailyGoalTarget ? "Below goal" : "Words written"}
        </span>
      </div>
    </div>
  )
}
