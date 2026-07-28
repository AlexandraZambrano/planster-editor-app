"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, Check, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
import { renameShelf, toggleShelfVisibility, deleteShelf, type ShelfWithCount } from "@/actions/library"

interface ShelfItemProps {
  shelf: ShelfWithCount
  onDelete: (id: string) => void
}

export function ShelfItem({ shelf, onDelete }: ShelfItemProps) {
  const t = useTranslations("Library")
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(shelf.name)
  const [nameInput, setNameInput] = useState(shelf.name)
  const [isPublic, setIsPublic] = useState(shelf.isPublic)
  const [isPending, startTransition] = useTransition()

  function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === name) {
      setNameInput(name)
      setIsEditing(false)
      return
    }
    startTransition(async () => {
      const result = await renameShelf(shelf.id, trimmed)
      if (!result.error) setName(trimmed)
      setIsEditing(false)
    })
  }

  function handleVisibilityChange(checked: boolean) {
    setIsPublic(checked)
    startTransition(async () => {
      await toggleShelfVisibility(shelf.id, checked)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteShelf(shelf.id)
      onDelete(shelf.id)
    })
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-background border rounded-lg">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName()
                if (e.key === "Escape") {
                  setNameInput(name)
                  setIsEditing(false)
                }
              }}
              className="h-7 text-sm"
              maxLength={50}
              autoFocus
            />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setNameInput(name)
                setIsEditing(false)
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{name}</span>
            {shelf.isSystem && (
              <Badge variant="outline" className="text-xs">
                {t("system")}
              </Badge>
            )}
            {!shelf.isSystem && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("renameShelf")}
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("shelfBookCount", { count: shelf.bookCount })}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">{isPublic ? t("public") : t("private")}</span>
        <Switch
          checked={isPublic}
          onCheckedChange={handleVisibilityChange}
          disabled={isPending}
          aria-label={t("toggleShelfVisibility")}
        />
      </div>

      {!shelf.isSystem && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              aria-label={t("deleteShelf")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteShelfConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteShelfConfirmDescription", { name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
