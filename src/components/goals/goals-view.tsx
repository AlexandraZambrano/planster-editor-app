"use client"

import { useState } from "react"
import { SummaryCards } from "./summary-cards"
import { WordsPerDayChart } from "./words-per-day-chart"
import { DeadlineProgressChart } from "./deadline-progress-chart"
import { GoalList } from "./goal-list"
import type { GoalsDashboard, GoalData } from "@/actions/goals"

interface GoalsViewProps {
  bookId: string
  dashboard: GoalsDashboard
}

export function GoalsView({ bookId, dashboard: initial }: GoalsViewProps) {
  const [goals, setGoals] = useState<GoalData[]>(initial.goals)

  const dailyGoal = goals.find((g) => g.type === "DAILY") ?? null
  const deadlineGoal = goals.find((g) => g.type === "DEADLINE") ?? null

  function handleGoalCreated(goal: GoalData) {
    setGoals((prev) => [...prev, goal])
  }

  function handleGoalDeleted(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId))
  }

  return (
    <div className="space-y-6">
      <SummaryCards
        totalWordsBook={initial.totalWordsBook}
        wordsThisWeek={initial.wordsThisWeek}
        weeklyGoalTarget={initial.weeklyGoalTarget}
        wordsThisMonth={initial.wordsThisMonth}
        monthlyGoalTarget={initial.monthlyGoalTarget}
        streak={initial.streak}
        longestStreak={initial.longestStreak}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WordsPerDayChart
            data={initial.dailyData}
            dailyGoalTarget={dailyGoal?.targetWords ?? null}
          />

          {deadlineGoal && initial.deadlineData && (
            <DeadlineProgressChart
              data={initial.deadlineData}
              goal={deadlineGoal}
              totalWordsBook={initial.totalWordsBook}
            />
          )}
        </div>

        <div>
          <GoalList
            bookId={bookId}
            goals={goals}
            onCreated={handleGoalCreated}
            onDeleted={handleGoalDeleted}
          />
        </div>
      </div>
    </div>
  )
}
