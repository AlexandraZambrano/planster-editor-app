"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { GripVertical, Pencil, Trash2, Check, X, ExternalLink } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { updateChapterTitle, updateChapterVisibility, deleteChapter } from "@/actions/chapters"
import { cn } from "@/lib/utils"
import type { PublicationStatus } from "@prisma/client"

const VISIBILITY_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted",
  BETA: "bg-amber-50 text-amber-700 border-amber-200",
  PUBLISHED: "bg-green-50 text-green-700 border-green-200",
}

export interface ChapterData {
  id: string
  title: string
  order: number
  visibility: PublicationStatus
  wordCount: number
  updatedAt: Date | string
}

interface ChapterItemProps {
  chapter: ChapterData
  bookId: string
  onDelete: (id: string) => void
}

export function ChapterItem({ chapter, bookId, onDelete }: ChapterItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [titleInput, setTitleInput] = useState(chapter.title)
  const [visibility, setVisibility] = useState<PublicationStatus>(chapter.visibility)
  const [isPending, startTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleVisibilityChange(newVis: string) {
    const vis = newVis as PublicationStatus
    setVisibility(vis)
    startTransition(async () => { await updateChapterVisibility(chapter.id, vis) })
  }

  async function handleTitleSave() {
    if (!titleInput.trim() || titleInput.trim() === chapter.title) {
      setTitleInput(chapter.title)
      setIsEditing(false)
      return
    }
    startTransition(async () => {
      await updateChapterTitle(chapter.id, titleInput.trim())
      setIsEditing(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteChapter(chapter.id)
      onDelete(chapter.id)
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 bg-background border rounded-lg",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="text-sm text-muted-foreground w-6 shrink-0 text-right">
        {chapter.order}.
      </span>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave()
                if (e.key === "Escape") { setTitleInput(chapter.title); setIsEditing(false) }
              }}
              className="h-7 text-sm"
              autoFocus
            />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={handleTitleSave}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setTitleInput(chapter.title); setIsEditing(false) }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{chapter.title}</span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0"
              aria-label="Rename chapter"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-0.5">
          {chapter.wordCount.toLocaleString()} words ·{" "}
          {formatDistanceToNow(new Date(chapter.updatedAt), { addSuffix: true })}
        </div>
      </div>

      <Select value={visibility} onValueChange={handleVisibilityChange} disabled={isPending}>
        <SelectTrigger className={cn("w-[100px] h-7 text-xs border", VISIBILITY_STYLES[visibility])}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="BETA">Beta</SelectItem>
          <SelectItem value="PUBLISHED">Published</SelectItem>
        </SelectContent>
      </Select>

      <Link
        href={`/write/${bookId}/editor/${chapter.id}`}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Open editor"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="Delete chapter"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
