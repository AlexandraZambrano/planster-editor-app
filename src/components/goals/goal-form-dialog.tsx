"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createGoal } from "@/actions/goals"
import type { GoalData } from "@/actions/goals"
import type { GoalType } from "@prisma/client"

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  DEADLINE: "Deadline (total by date)",
}

interface GoalFormDialogProps {
  bookId: string
  trigger: React.ReactNode
  onCreated: (goal: GoalData) => void
}

export function GoalFormDialog({ bookId, trigger, onCreated }: GoalFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<GoalType>("DAILY")
  const [targetWords, setTargetWords] = useState("")
  const [deadlineDate, setDeadlineDate] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function reset() {
    setType("DAILY")
    setTargetWords("")
    setDeadlineDate("")
    setError("")
  }

  function handleSubmit() {
    const words = parseInt(targetWords, 10)
    if (!words || words < 1) {
      setError("Enter a valid word count.")
      return
    }
    if (type === "DEADLINE" && !deadlineDate) {
      setError("Select a deadline date.")
      return
    }

    setError("")
    startTransition(async () => {
      const result = await createGoal({
        bookId,
        type,
        targetWords: words,
        deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
      })
      if ("error" in result) {
        setError(result.error)
      } else {
        onCreated(result.goal)
        setOpen(false)
        reset()
      }
    })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add writing goal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Goal type</Label>
            <Select value={type} onValueChange={(v) => setType(v as GoalType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(GOAL_TYPE_LABELS) as [GoalType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              {type === "DEADLINE" ? "Total words to write" : "Words"}
              {type === "DAILY" && " per day"}
              {type === "WEEKLY" && " per week"}
              {type === "MONTHLY" && " per month"}
            </Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 500"
              value={targetWords}
              onChange={(e) => setTargetWords(e.target.value)}
            />
          </div>

          {type === "DEADLINE" && (
            <div className="space-y-1.5">
              <Label>Deadline date</Label>
              <Input
                type="date"
                min={today}
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Add goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
