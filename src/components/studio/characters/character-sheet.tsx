"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  User, Trash2, Upload, X, ImagePlus,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import { StudioEditor } from "@/components/editor/studio-editor"
import { CharacterLinkDialog } from "./character-link-dialog"
import {
  updateCharacter,
  deleteCharacter,
  saveCharacterBackstory,
  setCharacterMainImage,
  addToCharacterGallery,
  removeFromCharacterGallery,
  deleteCharacterLink,
  type CharacterLink,
  type CharacterUpdateFields,
} from "@/actions/studio"
import type { StoryRole } from "@prisma/client"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface CharacterSheetProps {
  bookId: string
  character: {
    id: string
    bookId: string
    name: string
    nickname: string | null
    age: number | null
    birthDate: string | null
    mainImageUrl: string | null
    gallery: string[]
    height: string | null
    weight: string | null
    build: string | null
    eyeColor: string | null
    hairColor: string | null
    hairStyle: string | null
    facialFeatures: string | null
    tattoos: string | null
    dressingStyle: string | null
    physicalNotes: string | null
    storyRole: StoryRole
    storyRoleNote: string | null
    shortTermGoals: string | null
    longTermGoals: string | null
    backstory: object
    links: CharacterLink[]
  }
  otherCharacters: { id: string; name: string; mainImageUrl: string | null }[]
}

const ROLE_OPTIONS: { value: StoryRole; label: string }[] = [
  { value: "PROTAGONIST", label: "Protagonist" },
  { value: "ANTAGONIST", label: "Antagonist" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "TERTIARY", label: "Tertiary" },
  { value: "OTHER", label: "Other" },
]

const REL_LABELS: Record<string, string> = {
  FRIEND: "Friend", ENEMY: "Enemy", LOVER: "Lover",
  FAMILY: "Family", MENTOR: "Mentor", RIVAL: "Rival",
  UNKNOWN: "Unknown", OTHER: "Other",
}

const REL_COLORS: Record<string, string> = {
  FRIEND: "bg-blue-100 text-blue-700",
  ENEMY: "bg-red-100 text-red-700",
  LOVER: "bg-pink-100 text-pink-700",
  FAMILY: "bg-green-100 text-green-700",
  MENTOR: "bg-purple-100 text-purple-700",
  RIVAL: "bg-orange-100 text-orange-700",
  UNKNOWN: "bg-gray-100 text-gray-600",
  OTHER: "bg-gray-100 text-gray-600",
}

// ── Image upload helper ───────────────────────────────────────────────────────

async function uploadToCloudinary(file: File, folder: string): Promise<string | null> {
  const form = new FormData()
  form.append("file", file)
  form.append("folder", folder)
  const res = await fetch("/api/upload", { method: "POST", body: form })
  const data = await res.json()
  return data.url ?? null
}

// ── Main component ────────────────────────────────────────────────────────────

export function CharacterSheet({
  bookId,
  character: initial,
  otherCharacters,
}: CharacterSheetProps) {
  const router = useRouter()
  const [fields, setFields] = useState<CharacterUpdateFields>({
    name: initial.name,
    nickname: initial.nickname,
    age: initial.age,
    birthDate: initial.birthDate,
    height: initial.height,
    weight: initial.weight,
    build: initial.build,
    eyeColor: initial.eyeColor,
    hairColor: initial.hairColor,
    hairStyle: initial.hairStyle,
    facialFeatures: initial.facialFeatures,
    tattoos: initial.tattoos,
    dressingStyle: initial.dressingStyle,
    physicalNotes: initial.physicalNotes,
    storyRole: initial.storyRole,
    storyRoleNote: initial.storyRoleNote,
    shortTermGoals: initial.shortTermGoals,
    longTermGoals: initial.longTermGoals,
  })
  const [mainImage, setMainImage] = useState(initial.mainImageUrl)
  const [gallery, setGallery] = useState(initial.gallery)
  const [links, setLinks] = useState(initial.links)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [isPending, startTransition] = useTransition()
  const mainInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function field(key: keyof CharacterUpdateFields) {
    return {
      value: (fields[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((f) => ({ ...f, [key]: e.target.value || null })),
    }
  }

  // ── Save all text fields ──────────────────────────────────────────────────

  function handleSave() {
    setSaveError(null)
    setSaveOk(false)
    startTransition(async () => {
      const result = await updateCharacter(initial.id, fields)
      if ("error" in result) {
        setSaveError(result.error)
      } else {
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 3000)
      }
    })
  }

  // ── Delete character ──────────────────────────────────────────────────────

  function handleDelete() {
    startTransition(async () => {
      await deleteCharacter(initial.id)
      router.push(`/write/${bookId}/studio/characters`)
    })
  }

  // ── Main image ────────────────────────────────────────────────────────────

  async function handleMainImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMain(true)
    const url = await uploadToCloudinary(file, "planster/characters")
    if (url) {
      await setCharacterMainImage(initial.id, url)
      setMainImage(url)
    }
    setUploadingMain(false)
    e.target.value = ""
  }

  // ── Gallery ───────────────────────────────────────────────────────────────

  async function handleGalleryAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingGallery(true)
    for (const file of files) {
      if (gallery.length >= 10) break
      const url = await uploadToCloudinary(file, "planster/characters")
      if (url) {
        const result = await addToCharacterGallery(initial.id, url)
        if (!("error" in result)) setGallery((g) => [...g, url])
      }
    }
    setUploadingGallery(false)
    e.target.value = ""
  }

  async function handleGalleryRemove(url: string) {
    await removeFromCharacterGallery(initial.id, url)
    setGallery((g) => g.filter((u) => u !== url))
  }

  // ── Links ─────────────────────────────────────────────────────────────────

  const refreshLinks = useCallback(() => router.refresh(), [router])

  async function handleDeleteLink(linkId: string) {
    await deleteCharacterLink(linkId)
    setLinks((l) => l.filter((x) => x.id !== linkId))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{initial.name}</h1>
          {initial.nickname && (
            <p className="text-sm text-muted-foreground">"{initial.nickname}"</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
                  This will permanently delete the character and all their relationship links.
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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="identity">
        <TabsList className="w-full justify-start h-9 bg-muted/50 border-b rounded-none px-0 mb-0">
          {["identity", "physical", "story", "backstory", "links"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="h-9 px-4 capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t === "identity" ? "Identity" :
               t === "physical" ? "Physical" :
               t === "story" ? "Story" :
               t === "backstory" ? "Backstory" : "Links"}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Identity tab ── */}
        <TabsContent value="identity" className="pt-6 space-y-6">
          <div className="flex gap-8 items-start">
            {/* Main image */}
            <div className="shrink-0">
              <Label className="text-xs text-muted-foreground mb-2 block">Photo</Label>
              <div
                className="relative h-32 w-32 rounded-full overflow-hidden bg-muted cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 flex items-center justify-center transition-colors"
                onClick={() => mainInputRef.current?.click()}
              >
                {mainImage ? (
                  <>
                    <Image src={mainImage} alt="Character" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    {uploadingMain ? (
                      <span className="text-xs">Uploading…</span>
                    ) : (
                      <>
                        <User className="h-10 w-10" />
                        <span className="text-xs">Upload</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={mainInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleMainImageChange}
                disabled={uploadingMain}
              />
            </div>

            {/* Basic fields */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="char-name">Full name</Label>
                <Input id="char-name" {...field("name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="char-nickname">Nickname</Label>
                <Input id="char-nickname" placeholder="Optional" {...field("nickname")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="char-birthdate">Date of birth</Label>
                <Input id="char-birthdate" placeholder="e.g. 15 March" {...field("birthDate")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="char-age">Age</Label>
                <Input
                  id="char-age"
                  type="number"
                  min={0}
                  placeholder="Optional"
                  value={fields.age ?? ""}
                  onChange={(e) =>
                    setFields((f) => ({
                      ...f,
                      age: e.target.value ? parseInt(e.target.value, 10) : null,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Image gallery ({gallery.length}/10)</Label>
              {gallery.length < 10 && (
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
            {gallery.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {gallery.map((url) => (
                  <div key={url} className="relative aspect-square rounded-md overflow-hidden group">
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

        {/* ── Physical tab ── */}
        <TabsContent value="physical" className="pt-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                ["height", "Height"],
                ["weight", "Weight"],
                ["build", "Build"],
                ["eyeColor", "Eye colour"],
                ["hairColor", "Hair colour"],
                ["hairStyle", "Hair style"],
                ["facialFeatures", "Facial features"],
                ["tattoos", "Tattoos / scars / marks"],
                ["dressingStyle", "Dressing style"],
              ] as [keyof CharacterUpdateFields, string][]
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`char-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`char-${key}`}
                  placeholder="—"
                  className="h-8 text-sm"
                  {...field(key)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="char-physnotes">Additional physical notes</Label>
            <Textarea
              id="char-physnotes"
              placeholder="Other physical details…"
              rows={4}
              {...field("physicalNotes")}
            />
          </div>
        </TabsContent>

        {/* ── Story tab ── */}
        <TabsContent value="story" className="pt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-1.5">
              <Label>Story role</Label>
              <Select
                value={fields.storyRole ?? "SECONDARY"}
                onValueChange={(v) =>
                  setFields((f) => ({ ...f, storyRole: v as StoryRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="char-rolenote">Role note</Label>
              <Input
                id="char-rolenote"
                placeholder="e.g. reluctant hero"
                {...field("storyRoleNote")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="char-goals-short">Short-term goals</Label>
            <Textarea
              id="char-goals-short"
              placeholder="What the character wants right now…"
              rows={4}
              {...field("shortTermGoals")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="char-goals-long">Long-term goals</Label>
            <Textarea
              id="char-goals-long"
              placeholder="What the character ultimately wants…"
              rows={4}
              {...field("longTermGoals")}
            />
          </div>
        </TabsContent>

        {/* ── Backstory tab ── */}
        <TabsContent value="backstory" className="pt-6">
          <StudioEditor
            initialContent={initial.backstory as object}
            onSave={(content) => saveCharacterBackstory(initial.id, content)}
          />
        </TabsContent>

        {/* ── Links tab ── */}
        <TabsContent value="links" className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {links.length === 0
                ? "No relationship links yet."
                : `${links.length} link${links.length === 1 ? "" : "s"}`}
            </p>
            <CharacterLinkDialog
              bookId={bookId}
              currentCharacterId={initial.id}
              otherCharacters={otherCharacters}
              onCreated={refreshLinks}
            />
          </div>

          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {link.otherImageUrl ? (
                      <Image
                        src={link.otherImageUrl}
                        alt={link.otherName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{link.otherName}</p>
                    {link.note && (
                      <p className="text-xs text-muted-foreground truncate">{link.note}</p>
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                      REL_COLORS[link.relationshipType] ?? "bg-gray-100 text-gray-600"
                    )}
                  >
                    {REL_LABELS[link.relationshipType] ?? link.relationshipType}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save bar (identity / physical / story tabs) */}
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
