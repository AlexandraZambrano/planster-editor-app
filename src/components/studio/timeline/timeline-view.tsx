"use client"

import { useState, useTransition } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Clock, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reorderTimelineEntries } from "@/actions/studio"
import { TimelineEntryCard } from "./timeline-entry-card"
import { TimelineEntryDialog } from "./timeline-entry-dialog"

export type TimelineEntryData = {
  id: string
  title: string
  moment: string
  description: string | null
  color: string
  order: number
  chapterId: string | null
  chapter: { id: string; title: string } | null
}

export type ChapterOption = {
  id: string
  title: string
}

const ZOOM_LEVELS = [160, 220, 300] as const
const ZOOM_LABELS = ["Compact", "Normal", "Wide"] as const

interface TimelineViewProps {
  bookId: string
  initialEntries: TimelineEntryData[]
  chapters: ChapterOption[]
}

export function TimelineView({ bookId, initialEntries, chapters }: TimelineViewProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [zoomIndex, setZoomIndex] = useState(1)
  const [, startTransition] = useTransition()

  const cardWidth = ZOOM_LEVELS[zoomIndex]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setEntries((prev) => {
      const oldIndex = prev.findIndex((e) => e.id === active.id)
      const newIndex = prev.findIndex((e) => e.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex).map((e, i) => ({
        ...e,
        order: i + 1,
      }))
      startTransition(() => {
        reorderTimelineEntries(bookId, reordered.map((e) => e.id))
      })
      return reordered
    })
  }

  function handleCreated(entry: TimelineEntryData) {
    setEntries((prev) => [...prev, entry])
  }

  function handleUpdated(updated: TimelineEntryData) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  function handleDeleted(id: string) {
    setEntries((prev) =>
      prev.filter((e) => e.id !== id).map((e, i) => ({ ...e, order: i + 1 }))
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-24 text-muted-foreground">
        <Clock className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm mb-4">No timeline entries yet.</p>
        <TimelineEntryDialog bookId={bookId} chapters={chapters} onCreated={handleCreated} />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0">
        <TimelineEntryDialog bookId={bookId} chapters={chapters} onCreated={handleCreated} />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
            disabled={zoomIndex === 0}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-14 text-center">
            {ZOOM_LABELS[zoomIndex]}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline scroll area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="relative min-w-max px-8 pt-8 pb-12">
          {/* Background horizontal line — sits at dot centre (38px from container top) */}
          <div className="absolute left-0 right-0 top-[38px] h-px bg-border" />

          <DndContext
            id="timeline-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={entries.map((e) => e.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex items-start relative z-10">
                {entries.map((entry) => (
                  <TimelineEntryCard
                    key={entry.id}
                    entry={entry}
                    chapters={chapters}
                    bookId={bookId}
                    cardWidth={cardWidth}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  )
}
