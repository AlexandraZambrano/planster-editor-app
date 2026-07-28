"use client"

import { useTransition } from "react"
import { Trash2, Plus } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteGoal, type GoalData } from "@/actions/goals"
import { GoalFormDialog } from "./goal-form-dialog"

interface GoalListProps {
  bookId: string
  goals: GoalData[]
  onCreated: (goal: GoalData) => void
  onDeleted: (goalId: string) => void
}

function GoalRow({ goal, onDeleted }: { goal: GoalData; onDeleted: (id: string) => void }) {
  const t = useTranslations("Goals")
  const locale = useLocale()
  const [, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGoal(goal.id)
      if ("success" in result) onDeleted(goal.id)
    })
  }

  const subtitle =
    goal.type === "DEADLINE" && goal.deadlineDate
      ? t("byDate", {
          date: new Date(goal.deadlineDate).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }),
        })
      : t(`perGoalType.${goal.type}` as "perGoalType.DAILY")

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border bg-card">
      <div>
        <p className="text-sm font-medium">
          {t(`goalType.${goal.type}` as "goalType.DAILY")} — {t("targetWords", { count: goal.targetWords })}
        </p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeGoalTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeGoalDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function GoalList({ bookId, goals, onCreated, onDeleted }: GoalListProps) {
  const t = useTranslations("Goals")

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t("activeGoals")}</h3>
        <GoalFormDialog
          bookId={bookId}
          onCreated={onCreated}
          trigger={
            <Button variant="outline" size="sm" className="h-7 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("addGoal")}
            </Button>
          }
        />
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("noActiveGoals")}
        </p>
      ) : (
        <div className="space-y-2">
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  )
}
