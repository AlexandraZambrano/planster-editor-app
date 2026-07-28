"use client"

import { useTransition } from "react"
import { Users, MapPin, StickyNote, ImageIcon } from "lucide-react"
import { addBoardElement } from "@/actions/studio"
import { AddElementDialog } from "./add-element-dialog"
import type { BoardElementData } from "@/actions/studio"

export type CharacterOption = { id: string; name: string; mainImageUrl: string | null }
export type LocationOption = { id: string; name: string }

interface BoardSidebarProps {
  boardId: string
  characters: CharacterOption[]
  locations: LocationOption[]
  existingCharacterIds: string[]
  existingLocationIds: string[]
  onAdded: (element: BoardElementData) => void
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
    >
      {icon}
    </button>
  )
}

export function BoardSidebar({
  boardId,
  characters,
  locations,
  existingCharacterIds,
  existingLocationIds,
  onAdded,
}: BoardSidebarProps) {
  const [, startTransition] = useTransition()

  function handleAddNote() {
    startTransition(async () => {
      const result = await addBoardElement(boardId, "NOTE", null, { text: "", color: "#fef3c7" }, 200, 200)
      if ("element" in result) onAdded(result.element)
    })
  }

  function handleAddImage() {
    startTransition(async () => {
      const result = await addBoardElement(boardId, "IMAGE", null, { imageUrl: "" }, 200, 200)
      if ("element" in result) onAdded(result.element)
    })
  }

  const availableCharacters = characters.filter((c) => !existingCharacterIds.includes(c.id))
  const availableLocations = locations.filter((l) => !existingLocationIds.includes(l.id))

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1 bg-background rounded-xl border shadow-md p-1.5">
      <AddElementDialog
        type="CHARACTER"
        boardId={boardId}
        options={availableCharacters.map((c) => ({ id: c.id, label: c.name, imageUrl: c.mainImageUrl }))}
        onAdded={onAdded}
        trigger={<ToolButton icon={<Users className="h-4 w-4" />} label="Add character" />}
      />

      <AddElementDialog
        type="LOCATION"
        boardId={boardId}
        options={availableLocations.map((l) => ({ id: l.id, label: l.name, imageUrl: null }))}
        onAdded={onAdded}
        trigger={<ToolButton icon={<MapPin className="h-4 w-4" />} label="Add location" />}
      />

      <ToolButton icon={<StickyNote className="h-4 w-4" />} label="Add note" onClick={handleAddNote} />
      <ToolButton icon={<ImageIcon className="h-4 w-4" />} label="Add image" onClick={handleAddImage} />
    </div>
  )
}
