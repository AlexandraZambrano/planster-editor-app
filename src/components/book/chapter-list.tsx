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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { reorderChapters } from "@/actions/chapters"
import { ChapterItem, type ChapterData } from "./chapter-item"
import { NewChapterDialog } from "./new-chapter-dialog"
import { BookOpen } from "lucide-react"

interface ChapterListProps {
  bookId: string
  initialChapters: ChapterData[]
}

export function ChapterList({ bookId, initialChapters }: ChapterListProps) {
  const [chapters, setChapters] = useState(initialChapters)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setChapters((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id)
      const newIndex = prev.findIndex((c) => c.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex).map((c, i) => ({
        ...c,
        order: i + 1,
      }))

      startTransition(() => {
        reorderChapters(bookId, reordered.map((c) => c.id))
      })

      return reordered
    })
  }

  function handleChapterAdded(chapter: ChapterData) {
    setChapters((prev) => [...prev, chapter])
  }

  function handleChapterDeleted(id: string) {
    setChapters((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c, i) => ({ ...c, order: i + 1 }))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {chapters.length === 0
            ? "No chapters yet"
            : `${chapters.length} chapter${chapters.length !== 1 ? "s" : ""}`}
        </p>
        <NewChapterDialog bookId={bookId} onCreated={handleChapterAdded} />
      </div>

      {chapters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <BookOpen className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Add your first chapter to get started</p>
        </div>
      ) : (
        <DndContext
          id="chapter-list-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 group">
              {chapters.map((chapter) => (
                <ChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  bookId={bookId}
                  onDelete={handleChapterDeleted}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
