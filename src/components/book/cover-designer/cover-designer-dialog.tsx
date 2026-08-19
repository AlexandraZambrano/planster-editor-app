"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { BackgroundPicker, type BackgroundType } from "./background-picker"
import { FontPicker } from "./font-picker"
import { CoverPreview } from "./cover-preview"
import { COVER_BACKGROUNDS, getCoverBackground } from "@/lib/cover-backgrounds"
import { createTextLayer, createTitleLayer, type CoverTextLayer } from "@/lib/cover-text-layers"
import { updateBookCover } from "@/actions/books"
import { cn } from "@/lib/utils"

const TEXT_COLORS = ["#FFFFFF", "#000000", "#FFCF9C", "#FF8C6B", "#E8543F", "#7C3F82"]
const MIN_FONT_SIZE = 32
const MAX_FONT_SIZE = 180
const FONT_SIZE_STEP = 8

export interface CoverDesignRecipe {
  backgroundType: BackgroundType
  backgroundValue: string
  textLayers: CoverTextLayer[]
  stockPhotographerName?: string
  stockPhotographerUrl?: string
  stockSourceUrl?: string
}

interface CoverDesignerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookTitle: string
  initialDesign?: CoverDesignRecipe
  onSave: (coverUrl: string, recipe: CoverDesignRecipe) => void
  // When set (editing an existing book), saving also persists the cover to
  // the book immediately, rather than only updating local form state until
  // the writer separately submits the whole page.
  bookId?: string
}

export function CoverDesignerDialog({
  open,
  onOpenChange,
  bookTitle,
  initialDesign,
  onSave,
  bookId,
}: CoverDesignerDialogProps) {
  const t = useTranslations("Write")

  const [backgroundType, setBackgroundType] = useState<BackgroundType>(
    initialDesign?.backgroundType ?? "PRESET"
  )
  const [backgroundValue, setBackgroundValue] = useState(
    initialDesign?.backgroundValue ?? COVER_BACKGROUNDS[0].id
  )
  const [stockMeta, setStockMeta] = useState<{
    stockPhotographerName?: string
    stockPhotographerUrl?: string
    stockSourceUrl?: string
  }>({
    stockPhotographerName: initialDesign?.stockPhotographerName,
    stockPhotographerUrl: initialDesign?.stockPhotographerUrl,
    stockSourceUrl: initialDesign?.stockSourceUrl,
  })
  const [textLayers, setTextLayers] = useState<CoverTextLayer[]>(
    initialDesign?.textLayers?.length ? initialDesign.textLayers : [createTitleLayer(bookTitle)]
  )
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    textLayers[0]?.id ?? null
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // All the state above is only correct as of whenever this component first
  // mounted — if the dialog is mounted early (e.g. the writer switches to
  // the "Design a cover" tab before typing a title) and only opened later,
  // the initial useState() values go stale. Re-derive everything fresh each
  // time the dialog actually opens, rather than trusting the mount-time
  // snapshot.
  useEffect(() => {
    if (!open) return
    setBackgroundType(initialDesign?.backgroundType ?? "PRESET")
    setBackgroundValue(initialDesign?.backgroundValue ?? COVER_BACKGROUNDS[0].id)
    setStockMeta({
      stockPhotographerName: initialDesign?.stockPhotographerName,
      stockPhotographerUrl: initialDesign?.stockPhotographerUrl,
      stockSourceUrl: initialDesign?.stockSourceUrl,
    })
    const layers = initialDesign?.textLayers?.length
      ? initialDesign.textLayers
      : [createTitleLayer(bookTitle)]
    setTextLayers(layers)
    setSelectedLayerId(layers[0]?.id ?? null)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const previewUrl =
    backgroundType === "PRESET" ? (getCoverBackground(backgroundValue)?.url ?? null) : backgroundValue
  const selectedLayer = textLayers.find((l) => l.id === selectedLayerId) ?? null

  function updateLayer(id: string, patch: Partial<CoverTextLayer>) {
    setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function addLayer() {
    const layer = createTextLayer({ text: t("newTextDefault") })
    setTextLayers((prev) => [...prev, layer])
    setSelectedLayerId(layer.id)
  }

  function deleteLayer(id: string) {
    setTextLayers((prev) => prev.filter((l) => l.id !== id))
    setSelectedLayerId((current) => (current === id ? null : current))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/cover-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backgroundType, backgroundValue, textLayers }),
      })
      const data = await res.json()
      if (data.error || !data.coverUrl) {
        setError(data.error ?? t("coverSaveFailed"))
        return
      }

      const recipe = { backgroundType, backgroundValue, textLayers, ...stockMeta }

      if (bookId) {
        const result = await updateBookCover(bookId, data.coverUrl, recipe)
        if (result.error) {
          setError(result.error)
          return
        }
      }

      onSave(data.coverUrl, recipe)
      onOpenChange(false)
    } catch {
      setError(t("coverSaveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("coverDesignerTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-6">
          <div className="shrink-0 space-y-1.5">
            <CoverPreview
              backgroundUrl={previewUrl}
              textLayers={textLayers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onUpdateLayer={updateLayer}
            />
            <p className="text-[11px] text-muted-foreground text-center max-w-[280px]">
              {t("canvasHint")}
            </p>
            {backgroundType === "STOCK" && stockMeta.stockPhotographerName && (
              <p className="text-[10px] text-muted-foreground text-center" data-testid="photo-attribution">
                {t("photoCreditLabel", { name: stockMeta.stockPhotographerName })}
              </p>
            )}
          </div>

          <div className="flex-1 space-y-4 min-w-[260px]">
            <BackgroundPicker
              backgroundType={backgroundType}
              backgroundValue={backgroundValue}
              onChange={(selection) => {
                setBackgroundType(selection.backgroundType)
                setBackgroundValue(selection.backgroundValue)
                setStockMeta({
                  stockPhotographerName: selection.stockPhotographerName,
                  stockPhotographerUrl: selection.stockPhotographerUrl,
                  stockSourceUrl: selection.stockSourceUrl,
                })
              }}
            />

            <Button type="button" variant="outline" size="sm" onClick={addLayer} className="w-full">
              {t("addTextLayer")}
            </Button>

            {selectedLayer && (
              <div className="space-y-3 border rounded-lg p-3" data-testid="layer-editor">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{t("selectedTextLabel")}</p>
                  <button
                    type="button"
                    onClick={() => deleteLayer(selectedLayer.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={t("deleteTextLayer")}
                    data-testid="delete-layer-btn"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">{t("chooseFont")}</p>
                  <FontPicker
                    value={selectedLayer.fontId}
                    onChange={(fontId) => updateLayer(selectedLayer.id, { fontId })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateLayer(selectedLayer.id, { color })}
                        className={cn(
                          "h-6 w-6 rounded-full border-2",
                          selectedLayer.color === color ? "border-primary" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={color}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          fontSize: Math.max(MIN_FONT_SIZE, selectedLayer.fontSize - FONT_SIZE_STEP),
                        })
                      }
                      className="h-6 w-6 flex items-center justify-center rounded border hover:bg-muted"
                      aria-label={t("decreaseFontSize")}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          fontSize: Math.min(MAX_FONT_SIZE, selectedLayer.fontSize + FONT_SIZE_STEP),
                        })
                      }
                      className="h-6 w-6 flex items-center justify-center rounded border hover:bg-muted"
                      aria-label={t("increaseFontSize")}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t("savingCover") : t("saveCover")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
