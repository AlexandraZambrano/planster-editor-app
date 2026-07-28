"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShelfItem } from "./shelf-item"
import { createShelf, type ShelfWithCount } from "@/actions/library"

interface ShelfListProps {
  initialShelves: ShelfWithCount[]
}

export function ShelfList({ initialShelves }: ShelfListProps) {
  const t = useTranslations("Library")
  const [shelves, setShelves] = useState(initialShelves)
  const [newName, setNewName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) {
      setError(t("shelfNameRequired"))
      return
    }

    startTransition(async () => {
      const result = await createShelf(trimmed)
      if (result.error) {
        setError(result.error)
        return
      }
      setShelves((prev) => [
        ...prev,
        { id: result.shelfId!, name: trimmed, isPublic: false, isSystem: false, bookCount: 0 },
      ])
      setNewName("")
      setError(null)
    })
  }

  function handleDelete(id: string) {
    setShelves((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              setError(null)
            }}
            placeholder={t("newShelfName")}
            maxLength={50}
            data-testid="new-shelf-input"
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
        <Button type="submit" disabled={isPending} data-testid="create-shelf-button">
          <PlusIcon className="h-4 w-4 mr-1.5" />
          {t("newShelf")}
        </Button>
      </form>

      <div className="space-y-2">
        {shelves.map((shelf) => (
          <ShelfItem key={shelf.id} shelf={shelf} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
}
