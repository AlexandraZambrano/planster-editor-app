"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createTimelineEntry, updateTimelineEntry } from "@/actions/studio"
import type { TimelineEntryData, ChapterOption } from "./timeline-view"

const PRESET_COLORS = [
  "#6b3fa0",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
]

interface TimelineEntryDialogProps {
  bookId: string
  chapters: ChapterOption[]
  entry?: TimelineEntryData
  onCreated?: (entry: TimelineEntryData) => void
  onUpdated?: (entry: TimelineEntryData) => void
}

export function TimelineEntryDialog({
  bookId,
  chapters,
  entry,
  onCreated,
  onUpdated,
}: TimelineEntryDialogProps) {
  const isEditing = !!entry

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(entry?.title ?? "")
  const [moment, setMoment] = useState(entry?.moment ?? "")
  const [description, setDescription] = useState(entry?.description ?? "")
  const [color, setColor] = useState(entry?.color ?? "#6b3fa0")
  const [chapterId, setChapterId] = useState(entry?.chapterId ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    if (isEditing) {
      setTitle(entry.title)
      setMoment(entry.moment)
      setDescription(entry.description ?? "")
      setColor(entry.color)
      setChapterId(entry.chapterId ?? "")
    } else {
      setTitle("")
      setMoment("")
      setDescription("")
      setColor("#6b3fa0")
      setChapterId("")
    }
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      if (isEditing) {
        const res = await updateTimelineEntry(entry.id, {
          title,
          moment,
          description: description || null,
          color,
          chapterId: chapterId || null,
        })
        if ("error" in res) { setError(res.error); return }
        onUpdated?.({
          ...entry,
          title,
          moment,
          description: description || null,
          color,
          chapterId: chapterId || null,
          chapter: chapters.find((c) => c.id === chapterId) ?? null,
        })
      } else {
        const res = await createTimelineEntry(bookId, {
          title,
          moment,
          description: description || null,
          color,
          chapterId: chapterId || null,
        })
        if ("error" in res) { setError(res.error); return }
        onCreated?.(res.entry)
      }
      setOpen(false)
    })
  }

  const canSubmit = title.trim().length > 0 && moment.trim().length > 0 && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <button
            type="button"
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Edit entry"
          >
            <Pencil className="h-3 w-3" />
          </button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add entry
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit entry" : "Add timeline entry"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tl-title">Title *</Label>
            <Input
              id="tl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The great battle"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tl-moment">Moment *</Label>
            <Input
              id="tl-moment"
              value={moment}
              onChange={(e) => setMoment(e.target.value)}
              placeholder="e.g. Day 1, Year 203 AD, Chapter 5"
              required
            />
            <p className="text-xs text-muted-foreground">
              Free text — use whatever format fits your story.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tl-description">Description</Label>
            <Textarea
              id="tl-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happens at this moment?"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Select colour ${c}`}
                />
              ))}
            </div>
          </div>

          {chapters.length > 0 && (
            <div className="space-y-1.5">
              <Label>Linked chapter</Label>
              <Select
                value={chapterId || "__none__"}
                onValueChange={(v) => setChapterId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {chapters.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending
                ? isEditing ? "Saving…" : "Adding…"
                : isEditing ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
