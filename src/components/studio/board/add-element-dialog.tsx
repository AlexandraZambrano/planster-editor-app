"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { User, MapPin } from "lucide-react"
import { addBoardElement } from "@/actions/studio"
import type { BoardElementData } from "@/actions/studio"

export type ElementOption = {
  id: string
  label: string
  imageUrl: string | null
}

interface AddElementDialogProps {
  type: "CHARACTER" | "LOCATION"
  options: ElementOption[]
  boardId: string
  onAdded: (element: BoardElementData) => void
  trigger: React.ReactNode
}

export function AddElementDialog({
  type,
  options,
  boardId,
  onAdded,
  trigger,
}: AddElementDialogProps) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  function handleSelect(id: string) {
    startTransition(async () => {
      const result = await addBoardElement(boardId, type, id, {}, 150, 150)
      if ("element" in result) {
        onAdded(result.element)
        setOpen(false)
      }
    })
  }

  const isCharacter = type === "CHARACTER"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add {isCharacter ? "character" : "location"}</DialogTitle>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No {isCharacter ? "characters" : "locations"} available to add.
            <br />
            Create them in {isCharacter ? "Characters" : "World Building"} first.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-64 overflow-y-auto -mx-1">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors"
              >
                <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                  {opt.imageUrl ? (
                    <Image src={opt.imageUrl} alt={opt.label} width={32} height={32} className="object-cover" />
                  ) : isCharacter ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
