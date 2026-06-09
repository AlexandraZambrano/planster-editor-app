"use client"

import { useState, useTransition, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, Upload, ImagePlus, X, User, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input as DialogInput } from "@/components/ui/input"
import { StudioEditor } from "@/components/editor/studio-editor"
import {
  updateLocation,
  deleteLocation,
  saveLocationDescription,
  addToLocationGallery,
  removeFromLocationGallery,
  addLocationCharacter,
  removeLocationCharacter,
  type LocationUpdateFields,
} from "@/actions/studio"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationCharacterEntry {
  characterId: string
  note: string | null
  character: {
    id: string
    name: string
    mainImageUrl: string | null
  }
}

interface SubLocation {
  id: string
  name: string
  images: string[]
}

interface LocationSheetProps {
  bookId: string
  location: {
    id: string
    bookId: string
    name: string
    description: object
    images: string[]
    parentLocationId: string | null
    locationCharacters: LocationCharacterEntry[]
    subLocations: SubLocation[]
  }
  allLocations: { id: string; name: string }[]
  allCharacters: { id: string; name: string; mainImageUrl: string | null }[]
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadToCloudinary(file: File, folder: string): Promise<string | null> {
  const form = new FormData()
  form.append("file", file)
  form.append("folder", folder)
  const res = await fetch("/api/upload", { method: "POST", body: form })
  const data = await res.json()
  return data.url ?? null
}

// ── Main component ────────────────────────────────────────────────────────────

export function LocationSheet({
  bookId,
  location: initial,
  allLocations,
  allCharacters,
}: LocationSheetProps) {
  const router = useRouter()

  // Detail fields
  const [name, setName] = useState(initial.name)
  const [parentId, setParentId] = useState<string>(initial.parentLocationId ?? "none")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Gallery
  const [images, setImages] = useState(initial.images)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Characters
  const [characters, setCharacters] = useState(initial.locationCharacters)
  const [addCharOpen, setAddCharOpen] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState("")
  const [charNote, setCharNote] = useState("")
  const [addCharError, setAddCharError] = useState<string | null>(null)
  const [addingChar, startAddCharTransition] = useTransition()

  // ── Save details ────────────────────────────────────────────────────────────

  function handleSave() {
    setSaveError(null)
    setSaveOk(false)
    const data: LocationUpdateFields = {
      name: name.trim() || initial.name,
      parentLocationId: parentId === "none" ? null : parentId,
    }
    startTransition(async () => {
      const result = await updateLocation(initial.id, data)
      if ("error" in result) {
        setSaveError(result.error)
      } else {
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 3000)
      }
    })
  }

  // ── Delete location ─────────────────────────────────────────────────────────

  function handleDelete() {
    startTransition(async () => {
      await deleteLocation(initial.id)
      router.push(`/write/${bookId}/studio/worldbuilding`)
    })
  }

  // ── Gallery ─────────────────────────────────────────────────────────────────

  async function handleGalleryAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingGallery(true)
    for (const file of files) {
      if (images.length >= 10) break
      const url = await uploadToCloudinary(file, "planster/locations")
      if (url) {
        const result = await addToLocationGallery(initial.id, url)
        if (!("error" in result)) setImages((g) => [...g, url])
      }
    }
    setUploadingGallery(false)
    e.target.value = ""
  }

  async function handleGalleryRemove(url: string) {
    await removeFromLocationGallery(initial.id, url)
    setImages((g) => g.filter((u) => u !== url))
  }

  // ── Add character ───────────────────────────────────────────────────────────

  function handleAddCharSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCharId) {
      setAddCharError("Select a character")
      return
    }
    startAddCharTransition(async () => {
      const result = await addLocationCharacter(
        initial.id,
        selectedCharId,
        charNote.trim() || undefined
      )
      if ("error" in result) {
        setAddCharError(result.error)
      } else {
        const char = allCharacters.find((c) => c.id === selectedCharId)
        if (char) {
          setCharacters((prev) => [
            ...prev,
            { characterId: char.id, note: charNote.trim() || null, character: char },
          ])
        }
        setAddCharOpen(false)
        setSelectedCharId("")
        setCharNote("")
        setAddCharError(null)
      }
    })
  }

  async function handleRemoveChar(characterId: string) {
    await removeLocationCharacter(initial.id, characterId)
    setCharacters((prev) => prev.filter((c) => c.characterId !== characterId))
  }

  // ── Available characters to add ─────────────────────────────────────────────

  const linkedIds = new Set(characters.map((c) => c.characterId))
  const availableChars = allCharacters.filter((c) => !linkedIds.has(c.id))

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{initial.name}</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {initial.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this location and all its sub-locations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList className="w-full justify-start h-9 bg-muted/50 border-b rounded-none px-0 mb-0">
          {["details", "description", "characters", "sub-locations"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="h-9 px-4 capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t === "sub-locations" ? "Sub-locations" : t.charAt(0).toUpperCase() + t.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Details tab ── */}
        <TabsContent value="details" className="pt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Name</Label>
              <Input
                id="loc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Parent location</Label>
              <Select
                value={parentId}
                onValueChange={setParentId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None (top-level) —</SelectItem>
                  {allLocations
                    .filter((l) => l.id !== initial.id)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gallery */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Images ({images.length}/10)</Label>
              {images.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={uploadingGallery}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {uploadingGallery ? "Uploading…" : "Add images"}
                </Button>
              )}
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleGalleryAdd}
              disabled={uploadingGallery}
            />
            {images.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {images.map((url) => (
                  <div key={url} className="relative aspect-video rounded-md overflow-hidden group">
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => handleGalleryRemove(url)}
                      className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full items-center justify-center hidden group-hover:flex text-white hover:bg-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No images yet.</p>
            )}
          </div>
        </TabsContent>

        {/* ── Description tab ── */}
        <TabsContent value="description" className="pt-6">
          <StudioEditor
            initialContent={initial.description as object}
            onSave={(content) => saveLocationDescription(initial.id, content)}
          />
        </TabsContent>

        {/* ── Characters tab ── */}
        <TabsContent value="characters" className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {characters.length === 0
                ? "No characters linked yet."
                : `${characters.length} character${characters.length !== 1 ? "s" : ""}`}
            </p>

            <Dialog open={addCharOpen} onOpenChange={(v) => {
              setAddCharOpen(v)
              if (!v) { setSelectedCharId(""); setCharNote(""); setAddCharError(null) }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={availableChars.length === 0}>
                  <Upload className="h-3.5 w-3.5" />
                  Add character
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Link a character</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCharSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Character</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableChars.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedCharId(c.id); setAddCharError(null) }}
                          className={`flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors ${
                            selectedCharId === c.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/40"
                          }`}
                        >
                          <div className="relative h-7 w-7 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                            {c.mainImageUrl ? (
                              <Image src={c.mainImageUrl} alt={c.name} fill className="object-cover" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="truncate text-xs font-medium">{c.name}</span>
                        </button>
                      ))}
                    </div>
                    {addCharError === "Select a character" && (
                      <p className="text-xs text-destructive">{addCharError}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="char-note">Note (optional)</Label>
                    <DialogInput
                      id="char-note"
                      placeholder="e.g. lives here"
                      value={charNote}
                      onChange={(e) => setCharNote(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  {addCharError && addCharError !== "Select a character" && (
                    <p className="text-xs text-destructive">{addCharError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAddCharOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={addingChar}>
                      {addingChar ? "Linking…" : "Link"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {characters.length > 0 && (
            <div className="space-y-2">
              {characters.map(({ characterId, note, character }) => (
                <div
                  key={characterId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {character.mainImageUrl ? (
                      <Image
                        src={character.mainImageUrl}
                        alt={character.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/write/${bookId}/studio/characters/${characterId}`}
                      className="text-sm font-medium hover:text-primary transition-colors truncate block"
                    >
                      {character.name}
                    </Link>
                    {note && (
                      <p className="text-xs text-muted-foreground truncate">{note}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemoveChar(characterId)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Sub-locations tab ── */}
        <TabsContent value="sub-locations" className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {initial.subLocations.length === 0
              ? "No sub-locations yet."
              : `${initial.subLocations.length} sub-location${initial.subLocations.length !== 1 ? "s" : ""}`}
          </p>

          {initial.subLocations.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {initial.subLocations.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/write/${bookId}/studio/worldbuilding/${sub.id}`}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:shadow-sm hover:border-muted-foreground/30 transition-all"
                >
                  <div className="relative h-8 w-8 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {sub.images[0] ? (
                      <Image src={sub.images[0]} alt={sub.name} fill className="object-cover" />
                    ) : (
                      <MapPin className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">{sub.name}</span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save bar (details tab) */}
      <div className="flex items-center justify-between pt-4 border-t">
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {saveOk && <p className="text-sm text-green-600">Saved ✓</p>}
        {!saveError && !saveOk && <span />}
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
