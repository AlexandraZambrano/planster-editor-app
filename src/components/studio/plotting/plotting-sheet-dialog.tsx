"use client"

import { useCallback } from "react"
import { X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StudioEditor } from "@/components/editor/studio-editor"
import { savePlotNoteNotes } from "@/actions/studio"
import { SceneList } from "./scene-list"
import type { ChapterData, CharacterOption, LocationOption, SceneData } from "./plotting-board"

interface PlottingSheetDialogProps {
  chapter: ChapterData
  characters: CharacterOption[]
  locations: LocationOption[]
  open: boolean
  onClose: () => void
  onScenesChanged: (chapterId: string, scenes: SceneData[]) => void
}

export function PlottingSheetDialog({
  chapter,
  characters,
  locations,
  open,
  onClose,
  onScenesChanged,
}: PlottingSheetDialogProps) {
  const handleSaveNotes = useCallback(
    (content: object) => savePlotNoteNotes(chapter.id, content as Record<string, unknown>),
    [chapter.id]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="plotting-sheet-dialog">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-8">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Chapter {chapter.order}
              </p>
              <DialogTitle className="text-lg font-semibold mt-0.5">
                {chapter.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Notes */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Notes</p>
            <StudioEditor
              initialContent={chapter.plotNote?.notes as object ?? null}
              onSave={handleSaveNotes}
            />
          </div>

          {/* Scenes */}
          {chapter.plotNote && (
            <SceneList
              plotNoteId={chapter.plotNote.id}
              initialScenes={chapter.plotNote.scenes}
              characters={characters}
              locations={locations}
              onScenesChanged={(scenes) => onScenesChanged(chapter.id, scenes)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
