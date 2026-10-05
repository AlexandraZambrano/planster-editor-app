"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number | null
  onChange?: (rating: number) => void
  readOnly?: boolean
  size?: "sm" | "md"
}

const clamp = (n: number) => Math.min(5, Math.max(0.5, n))

export function StarRating({ value, onChange, readOnly = false, size = "md" }: StarRatingProps) {
  const t = useTranslations("Common")
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const interactive = !readOnly && !!onChange
  const displayValue = hoverValue ?? value ?? 0
  // Interactive stars are larger so the whole row is a comfortable touch target
  const starSize = interactive ? "h-7 w-7" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5"

  // Maps a pointer position anywhere on the row to the nearest half star
  function ratingAt(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return clamp(Math.ceil(((e.clientX - rect.left) / rect.width) * 10) / 2)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const current = value ?? 0
    const next = ({ ArrowRight: current + 0.5, ArrowUp: current + 0.5, ArrowLeft: current - 0.5, ArrowDown: current - 0.5, Home: 0.5, End: 5 } as Record<string, number>)[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange?.(clamp(next))
  }

  const stars = [1, 2, 3, 4, 5].map((starIndex) => {
    const fill = Math.min(Math.max(displayValue - (starIndex - 1), 0), 1) * 100
    return (
      <div key={starIndex} className="relative">
        <Star className={cn(starSize, "text-muted-foreground/30")} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${fill}%` }}>
          <Star className={cn(starSize, "fill-amber-400 text-amber-400")} />
        </div>
      </div>
    )
  })

  return (
    <div className="flex items-center gap-1.5">
      {interactive ? (
        // One focusable slider instead of ten half-star buttons: a real touch target,
        // a single tab stop, and arrow keys for half-star steps.
        <div
          role="slider"
          tabIndex={0}
          aria-label={t("rating")}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={value ?? 0}
          aria-valuetext={t("starsValue", { count: value ?? 0 })}
          className="flex cursor-pointer touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onMouseMove={(e) => setHoverValue(ratingAt(e))}
          onMouseLeave={() => setHoverValue(null)}
          onClick={(e) => onChange(ratingAt(e))}
          onKeyDown={handleKeyDown}
        >
          {stars}
        </div>
      ) : (
        <div className="flex items-center gap-0.5" aria-hidden>
          {stars}
        </div>
      )}
      {value != null && <span className="text-xs text-muted-foreground">{value.toFixed(1)}</span>}
    </div>
  )
}
