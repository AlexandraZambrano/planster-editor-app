"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { GripVertical } from "lucide-react"
import { COVER_FONTS } from "@/lib/cover-fonts"
import type { CoverTextLayer } from "@/lib/cover-text-layers"
import { cn } from "@/lib/utils"

// Serves the same .ttf files sharp embeds server-side (public/fonts/covers/)
// so this CSS preview stays visually close to the final rendered cover.
const FONT_FACES = COVER_FONTS.map(
  (f) => `@font-face { font-family: "${f.family}"; src: url("/fonts/covers/${f.fileName}"); }`
).join("\n")

const FONT_FAMILY_BY_ID = new Map(COVER_FONTS.map((f) => [f.id, f.family]))

// The server renders at 1600x2400 (see src/lib/cover-card.ts); the preview
// is fixed at this pixel width so layer font sizes scale down by a constant,
// known factor instead of needing a ResizeObserver.
const RENDER_WIDTH = 1600
const PREVIEW_WIDTH = 280
const SCALE = PREVIEW_WIDTH / RENDER_WIDTH

interface CoverPreviewProps {
  backgroundUrl: string | null
  textLayers: CoverTextLayer[]
  selectedLayerId: string | null
  onSelectLayer: (id: string | null) => void
  onUpdateLayer: (id: string, patch: Partial<CoverTextLayer>) => void
}

export function CoverPreview({
  backgroundUrl,
  textLayers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
}: CoverPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null)

  function startDrag(e: React.PointerEvent, layerId: string) {
    e.preventDefault()
    e.stopPropagation()
    setDraggingLayerId(layerId)

    function handleMove(moveEvent: PointerEvent) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const xPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100
      const yPercent = ((moveEvent.clientY - rect.top) / rect.height) * 100
      onUpdateLayer(layerId, {
        xPercent: Math.min(95, Math.max(5, xPercent)),
        yPercent: Math.min(95, Math.max(5, yPercent)),
      })
    }

    function handleUp() {
      setDraggingLayerId(null)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  return (
    <div style={{ width: PREVIEW_WIDTH }}>
      <style>{FONT_FACES}</style>
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-muted bg-cover bg-center select-none"
        style={{ width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * 1.5 }}
        onClick={() => onSelectLayer(null)}
        data-testid="cover-preview"
      >
        {backgroundUrl && (
          <Image
            src={backgroundUrl}
            alt=""
            fill
            className="object-cover pointer-events-none"
            sizes={`${PREVIEW_WIDTH}px`}
          />
        )}

        {textLayers.map((layer) => {
          const isSelected = selectedLayerId === layer.id
          return (
            <div
              key={layer.id}
              className="absolute"
              style={{
                left: `${layer.xPercent}%`,
                top: `${layer.yPercent}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelectLayer(layer.id)
              }}
              data-testid={`cover-layer-${layer.id}`}
            >
              {isSelected && (
                <button
                  type="button"
                  onPointerDown={(e) => startDrag(e, layer.id)}
                  className="absolute left-1/2 -top-5 -translate-x-1/2 flex h-4 w-6 items-center justify-center rounded bg-primary text-primary-foreground cursor-grab active:cursor-grabbing"
                  aria-label="Drag to reposition"
                  data-testid={`cover-layer-drag-${layer.id}`}
                >
                  <GripVertical className="h-3 w-3" />
                </button>
              )}
              <input
                value={layer.text}
                onChange={(e) => onUpdateLayer(layer.id, { text: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => onSelectLayer(layer.id)}
                className={cn(
                  "bg-transparent text-center outline-none border border-dashed",
                  isSelected ? "border-primary" : "border-transparent",
                  draggingLayerId === layer.id && "cursor-grabbing"
                )}
                style={{
                  fontFamily: FONT_FAMILY_BY_ID.get(layer.fontId),
                  color: layer.color,
                  fontSize: layer.fontSize * SCALE,
                  width: Math.max(60, layer.text.length * layer.fontSize * SCALE * 0.6),
                  maxWidth: PREVIEW_WIDTH - 16,
                  WebkitTextStroke: "0.5px rgba(0,0,0,0.5)",
                }}
                data-testid={`cover-layer-input-${layer.id}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
