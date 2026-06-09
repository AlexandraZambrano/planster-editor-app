"use client"

import { GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChapterData } from "./plotting-board"

interface ChapterPlotCardProps {
  chapter: ChapterData
  isActive: boolean
  onClick: () => void
}

export function ChapterPlotCard({ chapter, isActive, onClick }: ChapterPlotCardProps) {
  const scenes = chapter.plotNote?.scenes ?? []
  const previewScenes = scenes.slice(0, 3)
  const remaining = scenes.length - previewScenes.length

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="chapter-plot-card"
      className={cn(
        "w-56 flex-shrink-0 text-left rounded-xl border bg-card p-4 space-y-3",
        "hover:shadow-sm hover:border-muted-foreground/30 transition-all",
        isActive && "border-primary/60 shadow-sm bg-primary/5"
      )}
    >
      {/* Chapter header */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Ch. {chapter.order}
        </p>
        <p className="text-sm font-semibold line-clamp-2 leading-snug">{chapter.title}</p>
      </div>

      {/* Scenes preview */}
      <div className="space-y-1">
        {scenes.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 italic">
            <GitBranch className="h-3 w-3" />
            No scenes
          </div>
        ) : (
          <>
            {previewScenes.map((scene) => (
              <div
                key={scene.id}
                className="text-xs text-muted-foreground bg-muted/60 rounded px-2 py-1 truncate"
              >
                {scene.title}
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-xs text-muted-foreground/60 pl-1">
                +{remaining} more
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pt-1 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  )
}
