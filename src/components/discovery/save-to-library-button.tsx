"use client"

import { useState, useTransition } from "react"
import { Check, BookmarkPlus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { saveToLibrary, removeFromLibrary } from "@/actions/library"

interface SaveToLibraryButtonProps {
  bookId: string
  initialSaved: boolean
}

export function SaveToLibraryButton({ bookId, initialSaved }: SaveToLibraryButtonProps) {
  const t = useTranslations("Book")
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const next = !saved
    setSaved(next)
    startTransition(async () => {
      const result = next ? await saveToLibrary(bookId) : await removeFromLibrary(bookId)
      if (result.error) setSaved(!next)
    })
  }

  return (
    <Button
      type="button"
      variant={saved ? "outline" : "default"}
      onClick={handleClick}
      disabled={isPending}
      data-testid="save-to-library-button"
    >
      {saved ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          {t("saved")}
        </>
      ) : (
        <>
          <BookmarkPlus className="h-4 w-4 mr-2" />
          {t("saveToLibrary")}
        </>
      )}
    </Button>
  )
}
