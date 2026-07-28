"use client"

import { useTransition } from "react"
import { Trash2, BookOpen } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import { deleteTimelineEntry } from "@/actions/studio"
import { TimelineEntryDialog } from "./timeline-entry-dialog"
import type { TimelineEntryData, ChapterOption } from "./timeline-view"

interface TimelineEntryCardProps {
  entry: TimelineEntryData
  chapters: ChapterOption[]
  bookId: string
  cardWidth: number
  onUpdated: (entry: TimelineEntryData) => void
  onDeleted: (id: string) => void
}

export function TimelineEntryCard({
  entry,
  chapters,
  bookId,
  cardWidth,
  onUpdated,
  onDeleted,
}: TimelineEntryCardProps) {
  const [, startTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id })

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTimelineEntry(entry.id)
      onDeleted(entry.id)
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...dndStyle, width: cardWidth, minWidth: cardWidth }}
      className="flex-shrink-0 flex flex-col items-center group"
      data-testid="timeline-entry-card"
    >
      {/* Dot — drag handle, vertically centred on the background line (h-3 = 12px, top of card = 0, centre = 6px → line is at 38px from container so card top = 32px from pt-8, dot centre = 32+6=38 ✓) */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="h-3 w-3 rounded-full border-2 border-background shadow cursor-grab active:cursor-grabbing flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: entry.color }}
        aria-label="Drag to reorder"
      />

      {/* Moment label */}
      <p
        className="text-xs font-semibold mt-2 mb-2 px-2 text-center truncate max-w-full"
        style={{ color: entry.color }}
        title={entry.moment}
      >
        {entry.moment}
      </p>

      {/* Card body */}
      <div className="rounded-lg border bg-card shadow-sm p-3 w-[calc(100%-1rem)] space-y-1.5 relative">
        {/* Action buttons — shown on hover */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <TimelineEntryDialog
            bookId={bookId}
            chapters={chapters}
            entry={entry}
            onUpdated={onUpdated}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Delete entry"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete timeline entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{entry.title}&quot; will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Left colour stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: entry.color }}
        />

        <div className="pl-2">
          <p className="text-sm font-semibold leading-tight pr-12 line-clamp-2">
            {entry.title}
          </p>

          {entry.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
              {entry.description}
            </p>
          )}

          {entry.chapter && (
            <div className="flex items-center gap-1 mt-2">
              <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {entry.chapter.title}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
