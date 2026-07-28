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

export function StarRating({ value, onChange, readOnly = false, size = "md" }: StarRatingProps) {
  const t = useTranslations("Common")
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const displayValue = hoverValue ?? value ?? 0
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5"

  function ratingFor(starIndex: number, half: "left" | "right") {
    return half === "left" ? starIndex - 0.5 : starIndex
  }

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHoverValue(null)}
      aria-label={t("rating")}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fill = Math.min(Math.max(displayValue - (starIndex - 1), 0), 1) * 100
        return (
          <div key={starIndex} className="relative">
            <Star className={cn(starSize, "text-muted-foreground/30")} />
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${fill}%` }}>
              <Star className={cn(starSize, "fill-amber-400 text-amber-400")} />
            </div>
            {!readOnly && onChange && (
              <div className="absolute inset-0 flex">
                <button
                  type="button"
                  className="w-1/2 h-full"
                  aria-label={t("rateStars", { count: starIndex - 0.5 })}
                  onClick={() => onChange(ratingFor(starIndex, "left"))}
                  onMouseEnter={() => setHoverValue(ratingFor(starIndex, "left"))}
                />
                <button
                  type="button"
                  className="w-1/2 h-full"
                  aria-label={t("rateStars", { count: starIndex })}
                  onClick={() => onChange(ratingFor(starIndex, "right"))}
                  onMouseEnter={() => setHoverValue(ratingFor(starIndex, "right"))}
                />
              </div>
            )}
          </div>
        )
      })}
      {value != null && <span className="text-xs text-muted-foreground ml-1">{value.toFixed(1)}</span>}
    </div>
  )
}
