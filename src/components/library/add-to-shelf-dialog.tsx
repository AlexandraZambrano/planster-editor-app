"use client"

import { useState, useTransition } from "react"
import { FolderPlus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { addBookToShelf, removeBookFromShelf, type ShelfWithCount } from "@/actions/library"

const SHELF_EXCLUSIONS: Record<string, string> = {
  "Reading now": "Want to read",
  "Read": "Reading now",
}

interface AddToShelfDialogProps {
  libraryId: string
  shelves: ShelfWithCount[]
  shelfIds: string[]
  onChange: (shelfIds: string[]) => void
}

export function AddToShelfDialog({ libraryId, shelves, shelfIds, onChange }: AddToShelfDialogProps) {
  const t = useTranslations("Library")
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  function handleToggle(shelfId: string, checked: boolean) {
    const shelf = shelves.find((s) => s.id === shelfId)
    let next: string[]

    if (checked) {
      next = [...shelfIds, shelfId]
      if (shelf?.isSystem) {
        const excludedName = SHELF_EXCLUSIONS[shelf.name]
        const excludedShelf = shelves.find((s) => s.isSystem && s.name === excludedName)
        if (excludedShelf) next = next.filter((id) => id !== excludedShelf.id)
      }
    } else {
      next = shelfIds.filter((id) => id !== shelfId)
    }
    onChange(next)

    startTransition(async () => {
      if (checked) {
        await addBookToShelf(libraryId, shelfId)
      } else {
        await removeBookFromShelf(libraryId, shelfId)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-6 gap-1 px-1.5 text-xs">
          <FolderPlus className="h-3 w-3" />
          {t("shelves")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t("addToShelves")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5">
          {shelves.map((shelf) => (
            <div key={shelf.id} className="flex items-center gap-2">
              <Checkbox
                id={`shelf-${libraryId}-${shelf.id}`}
                checked={shelfIds.includes(shelf.id)}
                onCheckedChange={(checked) => handleToggle(shelf.id, checked === true)}
              />
              <Label htmlFor={`shelf-${libraryId}-${shelf.id}`} className="text-sm font-normal cursor-pointer">
                {shelf.name}
              </Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
