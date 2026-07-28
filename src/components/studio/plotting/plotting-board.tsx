"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"
import { ChapterPlotCard } from "./chapter-plot-card"
import { PlottingSheetDialog } from "./plotting-sheet-dialog"

// ── Shared types ──────────────────────────────────────────────────────────────

export type SceneData = {
  id: string
  title: string
  description: string | null
  order: number
  characterIds: string[]
  locationId: string | null
  location: { id: string; name: string } | null
}

export type ChapterData = {
  id: string
  title: string
  order: number
  plotNote: {
    id: string
    notes: object
    scenes: SceneData[]
  } | null
}

export type CharacterOption = {
  id: string
  name: string
  mainImageUrl: string | null
}

export type LocationOption = {
  id: string
  name: string
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PlottingBoardProps {
  bookId: string
  initialChapters: ChapterData[]
  characters: CharacterOption[]
  locations: LocationOption[]
}

export function PlottingBoard({
  bookId,
  initialChapters,
  characters,
  locations,
}: PlottingBoardProps) {
  const [chapters, setChapters] = useState(initialChapters)
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null

  function handleScenesChanged(chapterId: string, scenes: SceneData[]) {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId && c.plotNote
          ? { ...c, plotNote: { ...c.plotNote, scenes } }
          : c
      )
    )
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-24 text-muted-foreground">
        <BookOpen className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">Add chapters from the book panel first.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto px-6 py-6">
      <div className="flex gap-4 min-w-max pb-4">
        {chapters.map((chapter) => (
          <ChapterPlotCard
            key={chapter.id}
            chapter={chapter}
            isActive={chapter.id === activeChapterId}
            onClick={() =>
              setActiveChapterId(
                chapter.id === activeChapterId ? null : chapter.id
              )
            }
          />
        ))}
      </div>

      {activeChapter && (
        <PlottingSheetDialog
          chapter={activeChapter}
          characters={characters}
          locations={locations}
          open={activeChapterId !== null}
          onClose={() => setActiveChapterId(null)}
          onScenesChanged={handleScenesChanged}
        />
      )}
    </div>
  )
}
