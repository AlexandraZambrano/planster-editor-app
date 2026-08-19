"use client"

import { COVER_FONTS } from "@/lib/cover-fonts"
import { cn } from "@/lib/utils"

interface FontPickerProps {
  value: string
  onChange: (fontId: string) => void
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {COVER_FONTS.map((font) => (
        <button
          key={font.id}
          type="button"
          onClick={() => onChange(font.id)}
          className={cn(
            "rounded-md border px-2 py-3 text-center hover:border-foreground/40 transition-colors",
            value === font.id ? "border-primary bg-primary/5" : "border-input"
          )}
          data-testid={`cover-font-${font.id}`}
        >
          <span className="block text-lg" style={{ fontFamily: font.family }}>
            Aa
          </span>
          <span className="block text-[10px] text-muted-foreground mt-1 truncate">
            {font.label}
          </span>
        </button>
      ))}
    </div>
  )
}
