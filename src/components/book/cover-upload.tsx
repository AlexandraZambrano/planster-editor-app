"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_MB = 5
const MIN_WIDTH = 1600
const MIN_HEIGHT = 2400

async function validateCover(file: File): Promise<string | null> {
  if (!ACCEPTED.includes(file.type)) {
    return "Only JPG, PNG and WEBP files are accepted"
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Image must be smaller than ${MAX_SIZE_MB}MB`
  }
  try {
    const bitmap = await createImageBitmap(file)
    if (bitmap.width < MIN_WIDTH || bitmap.height < MIN_HEIGHT) {
      return `Cover must be at least ${MIN_WIDTH}×${MIN_HEIGHT}px (yours is ${bitmap.width}×${bitmap.height}px)`
    }
  } catch {
    // createImageBitmap not supported — skip dimension check
  }
  return null
}

interface CoverUploadProps {
  value?: string
  onChange: (url: string) => void
  className?: string
}

export function CoverUpload({ value, onChange, className }: CoverUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const validationError = await validateCover(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ""
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "planster/covers")
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        onChange(data.url)
      } else {
        setError("Upload failed. Please try again.")
      }
    } catch {
      setError("Upload failed. Please try again.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="relative aspect-[2/3] w-40 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted cursor-pointer hover:border-muted-foreground/60 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <>
            <Image src={value} alt="Cover" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {uploading ? (
              <div className="text-xs">Uploading…</div>
            ) : (
              <>
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs text-center px-2">Click to upload cover</span>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        JPG, PNG or WEBP · Min. {MIN_WIDTH}×{MIN_HEIGHT}px · Max {MAX_SIZE_MB}MB
      </p>

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-7 px-2"
          onClick={() => onChange("")}
        >
          <X className="h-3 w-3 mr-1" />
          Remove
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
    </div>
  )
}
