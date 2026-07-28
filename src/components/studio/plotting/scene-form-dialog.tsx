"use client"

import { useState, useTransition } from "react"
import { Plus, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createScene, updateScene } from "@/actions/studio"
import type { SceneData, CharacterOption, LocationOption } from "./plotting-board"

interface SceneFormDialogProps {
  plotNoteId: string
  characters: CharacterOption[]
  locations: LocationOption[]
  onCreated?: (scene: SceneData) => void
  onUpdated?: () => void
  // When editing an existing scene
  scene?: SceneData
  trigger?: React.ReactNode
}

export function SceneFormDialog({
  plotNoteId,
  characters,
  locations,
  onCreated,
  onUpdated,
  scene,
  trigger,
}: SceneFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(scene?.title ?? "")
  const [description, setDescription] = useState(scene?.description ?? "")
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>(scene?.characterIds ?? [])
  const [locationId, setLocationId] = useState<string>(scene?.locationId ?? "none")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setTitle(scene?.title ?? "")
    setDescription(scene?.description ?? "")
    setSelectedCharIds(scene?.characterIds ?? [])
    setLocationId(scene?.locationId ?? "none")
    setError("")
    setOpen(true)
  }

  function toggleChar(id: string) {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    setError("")

    startTransition(async () => {
      const locId = locationId === "none" ? null : locationId

      if (scene) {
        const result = await updateScene(scene.id, {
          title,
          description: description.trim() || null,
          characterIds: selectedCharIds,
          locationId: locId,
        })
        if ("error" in result) {
          setError(result.error)
          return
        }
        onUpdated?.()
      } else {
        const result = await createScene(
          plotNoteId,
          title,
          description.trim() || undefined,
          selectedCharIds,
          locId
        )
        if ("error" in result) {
          setError(result.error)
          return
        }
        onCreated?.(result.scene as SceneData)
      }

      setOpen(false)
    })
  }

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} className="cursor-pointer">
          {trigger}
        </span>
      ) : scene ? (
        <button
          type="button"
          onClick={handleOpen}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
          title="Edit scene"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add scene
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{scene ? "Edit scene" : "New scene"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="scene-title">Title *</Label>
              <Input
                id="scene-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Scene title"
                data-testid="scene-title-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scene-desc">Description</Label>
              <Textarea
                id="scene-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what happens in this scene…"
                rows={3}
              />
            </div>

            {locations.length > 0 && (
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {characters.length > 0 && (
              <div className="space-y-2">
                <Label>Characters in this scene</Label>
                <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1.5">
                  {characters.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded px-1.5 py-1"
                    >
                      <Checkbox
                        checked={selectedCharIds.includes(c.id)}
                        onCheckedChange={() => toggleChar(c.id)}
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving…" : scene ? "Save changes" : "Add scene"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
