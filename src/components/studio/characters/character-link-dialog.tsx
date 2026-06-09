"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Plus, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addCharacterLink } from "@/actions/studio"
import type { RelationshipType } from "@prisma/client"

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  FRIEND: "Friend",
  ENEMY: "Enemy",
  LOVER: "Lover",
  FAMILY: "Family",
  MENTOR: "Mentor",
  RIVAL: "Rival",
  UNKNOWN: "Unknown",
  OTHER: "Other",
}

interface OtherCharacter {
  id: string
  name: string
  mainImageUrl: string | null
}

interface CharacterLinkDialogProps {
  bookId: string
  currentCharacterId: string
  otherCharacters: OtherCharacter[]
  onCreated: () => void
}

export function CharacterLinkDialog({
  bookId,
  currentCharacterId,
  otherCharacters,
  onCreated,
}: CharacterLinkDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [relType, setRelType] = useState<RelationshipType>("FRIEND")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setSelectedId("")
    setRelType("FRIEND")
    setNote("")
    setError(null)
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) {
      setError("Select a character")
      return
    }
    startTransition(async () => {
      const result = await addCharacterLink(
        bookId,
        currentCharacterId,
        selectedId,
        relType,
        note || undefined
      )
      if ("error" in result) {
        setError(result.error)
      } else {
        setOpen(false)
        onCreated()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add link
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add relationship link</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Character picker */}
          <div className="space-y-1.5">
            <Label>Character</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {otherCharacters.length === 0 ? (
                <p className="text-xs text-muted-foreground col-span-2 py-2">
                  No other characters in this book yet.
                </p>
              ) : (
                otherCharacters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedId(c.id); setError(null) }}
                    className={`flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors ${
                      selectedId === c.id
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
                ))
              )}
            </div>
            {error === "Select a character" && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          {/* Relationship type */}
          <div className="space-y-1.5">
            <Label>Relationship type</Label>
            <Select
              value={relType}
              onValueChange={(v) => setRelType(v as RelationshipType)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {RELATIONSHIP_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="link-note">Note (optional)</Label>
            <Input
              id="link-note"
              placeholder="e.g. childhood friends"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {error && error !== "Select a character" && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || otherCharacters.length === 0}
            >
              {isPending ? "Adding…" : "Add link"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
