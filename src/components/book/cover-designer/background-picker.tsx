"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Search, Upload, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { COVER_BACKGROUNDS } from "@/lib/cover-backgrounds"
import {
  searchStockPhotos,
  getFeaturedStockPhotos,
  trackStockPhotoUsage,
  type StockPhoto,
} from "@/actions/cover-design"
import { cn } from "@/lib/utils"

const SEARCH_DEBOUNCE_MS = 300
const REQUEST_TIMEOUT_MS = 15_000

// A server action call can hang indefinitely if the page's connection to the
// dev/prod server goes stale (e.g. right after a server restart) — without
// this, the UI would be stuck on the loading indicator forever instead of
// ever showing an error.
function withTimeout(
  promise: Promise<{ error?: string; photos?: StockPhoto[] }>,
  ms: number
): Promise<{ error?: string; photos?: StockPhoto[] }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ error: "Stock photo search failed" }), ms)
    promise.then((value) => {
      clearTimeout(timer)
      resolve(value)
    })
  })
}

export type BackgroundType = "PRESET" | "UPLOAD" | "STOCK"

export interface BackgroundSelection {
  backgroundType: BackgroundType
  backgroundValue: string
  stockPhotographerName?: string
  stockPhotographerUrl?: string
  stockSourceUrl?: string
}

interface BackgroundPickerProps {
  backgroundType: BackgroundType
  backgroundValue: string
  onChange: (selection: BackgroundSelection) => void
}

export function BackgroundPicker({ backgroundType, backgroundValue, onChange }: BackgroundPickerProps) {
  const t = useTranslations("Write")
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState("")
  const [photos, setPhotos] = useState<StockPhoto[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [featured, setFeatured] = useState<StockPhoto[] | null>(null)
  const [loadingFeatured, setLoadingFeatured] = useState(false)
  const [featuredError, setFeaturedError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The visually-active tab is tracked separately from `backgroundType` —
  // switching to "My image" or "Photos" shouldn't itself change the actual
  // selected background (and briefly desyncing them, e.g. backgroundType
  // "STOCK" with a leftover PRESET id as backgroundValue, produced an
  // invalid combination the preview couldn't render).
  const [activeTab, setActiveTab] = useState<BackgroundType>(backgroundType)

  // A small curated gallery — same idea as the preset color grid — shown
  // before the writer types a search of their own. Loaded lazily, only once
  // the Photos tab is actually opened, to avoid burning Unsplash's hourly
  // quota for writers who never visit it.
  useEffect(() => {
    if (activeTab !== "STOCK" || featured !== null || loadingFeatured) return
    setLoadingFeatured(true)
    withTimeout(getFeaturedStockPhotos(), REQUEST_TIMEOUT_MS).then((result) => {
      setLoadingFeatured(false)
      if (result.error) setFeaturedError(result.error)
      else setFeatured(result.photos ?? [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const isSearching = query.trim().length > 0
  const displayedPhotos = isSearching ? photos : featured
  const displayedLoading = isSearching ? searching : loadingFeatured
  const displayedError = isSearching ? searchError : featuredError

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "planster/cover-backgrounds")
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        onChange({ backgroundType: "UPLOAD", backgroundValue: data.url })
      }
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!value.trim()) {
        setPhotos(null)
        return
      }
      setSearching(true)
      setSearchError(null)
      const result = await withTimeout(searchStockPhotos(value), REQUEST_TIMEOUT_MS)
      setSearching(false)
      if (result.error) {
        setSearchError(result.error)
        setPhotos(null)
      } else {
        setPhotos(result.photos ?? [])
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        const type = v as BackgroundType
        setActiveTab(type)
        if (type === "PRESET") onChange({ backgroundType: "PRESET", backgroundValue: COVER_BACKGROUNDS[0].id })
        else if (type === "UPLOAD") inputRef.current?.click()
        // STOCK: just switch tabs, wait for the user to search + pick
      }}
    >
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="PRESET">{t("backgroundColors")}</TabsTrigger>
        <TabsTrigger value="UPLOAD">{t("backgroundOwnImage")}</TabsTrigger>
        <TabsTrigger value="STOCK">{t("backgroundPhotos")}</TabsTrigger>
      </TabsList>

      <TabsContent value="PRESET" className="mt-3">
        <div className="grid grid-cols-4 gap-2">
          {COVER_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => onChange({ backgroundType: "PRESET", backgroundValue: bg.id })}
              className={cn(
                "relative aspect-[2/3] rounded overflow-hidden border-2",
                backgroundType === "PRESET" && backgroundValue === bg.id
                  ? "border-primary"
                  : "border-transparent"
              )}
              data-testid={`cover-bg-${bg.id}`}
            >
              <Image src={bg.url} alt={bg.id} fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="UPLOAD" className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t("backgroundOwnImage")}
        </button>
        {backgroundType === "UPLOAD" && backgroundValue && (
          <div className="relative aspect-[2/3] w-20 rounded overflow-hidden border">
            <Image src={backgroundValue} alt="" fill className="object-cover" sizes="80px" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
        />
      </TabsContent>

      <TabsContent value="STOCK" className="mt-3 space-y-3">
        <p className="text-[11px] text-muted-foreground bg-muted rounded-md px-2.5 py-2" data-testid="stock-credit-notice">
          {t("stockPhotoCreditNotice")}
        </p>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t("stockSearchPlaceholder")}
            className="pl-8 h-9 text-sm"
            data-testid="stock-search-input"
          />
        </div>

        {!isSearching && !displayedLoading && !displayedError && (
          <p className="text-xs text-muted-foreground">{t("featuredPhotos")}</p>
        )}
        {displayedError && <p className="text-xs text-destructive">{displayedError}</p>}
        {displayedLoading && <p className="text-xs text-muted-foreground">…</p>}
        {displayedPhotos && !displayedLoading && displayedPhotos.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("noPhotosFound")}</p>
        )}

        {displayedPhotos && displayedPhotos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {displayedPhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => {
                  onChange({
                    backgroundType: "STOCK",
                    backgroundValue: photo.fullUrl,
                    stockPhotographerName: photo.photographerName,
                    stockPhotographerUrl: photo.photographerUrl,
                    stockSourceUrl: photo.sourceUrl,
                  })
                  // Required by Unsplash's API guidelines: ping this the
                  // moment a photo is put to use, not merely displayed.
                  trackStockPhotoUsage(photo.downloadLocation)
                }}
                className={cn(
                  "relative aspect-[2/3] rounded overflow-hidden border-2",
                  backgroundType === "STOCK" && backgroundValue === photo.fullUrl
                    ? "border-primary"
                    : "border-transparent"
                )}
                data-testid={`stock-photo-${photo.id}`}
              >
                <Image src={photo.thumbnailUrl} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
