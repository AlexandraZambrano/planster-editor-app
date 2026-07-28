"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Upload, ImageIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_MB = 5

function validateAvatar(
  file: File,
  t: (key: string, values?: Record<string, string | number>) => string
): string | null {
  if (!ACCEPTED.includes(file.type)) {
    return t("onlyImageFiles")
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return t("imageTooLarge", { maxSize: MAX_SIZE_MB })
  }
  return null
}

interface AvatarUploadProps {
  value: string | null
  displayName: string
  positionY: number
  onChange: (url: string) => void
  onPositionChange: (value: number) => void
}

export function AvatarUpload({
  value,
  displayName,
  positionY,
  onChange,
  onPositionChange,
}: AvatarUploadProps) {
  const t = useTranslations("Settings")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const validationError = validateAvatar(file, t)
    if (validationError) {
      setError(validationError)
      e.target.value = ""
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "planster/avatars")
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        onChange(data.url)
        onPositionChange(50)
      } else {
        setError(t("uploadFailed"))
      }
    } catch {
      setError(t("uploadFailed"))
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative h-24 w-24 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted cursor-pointer hover:border-muted-foreground/60 transition-colors shrink-0",
            "flex items-center justify-center"
          )}
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <>
              <Image
                src={value}
                alt={displayName}
                fill
                className="object-cover"
                style={{ objectPosition: `center ${positionY}%` }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="h-5 w-5 text-white" />
              </div>
            </>
          ) : uploading ? (
            <span className="text-xs text-muted-foreground">{t("uploading")}</span>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        {value && (
          <div className="flex-1 max-w-[180px] space-y-1.5">
            <label htmlFor="avatar-position" className="text-xs text-muted-foreground">
              {t("adjustPosition")}
            </label>
            <Slider
              id="avatar-position"
              min={0}
              max={100}
              step={1}
              value={[positionY]}
              onValueChange={([v]) => onPositionChange(v)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t("top")}</span>
              <span>{t("bottom")}</span>
            </div>
          </div>
        )}
      </div>

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
