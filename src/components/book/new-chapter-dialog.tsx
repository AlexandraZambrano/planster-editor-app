"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { createChapter } from "@/actions/chapters"
import type { ChapterData } from "./chapter-item"
import type { PublicationStatus } from "@prisma/client"

interface NewChapterDialogProps {
  bookId: string
  onCreated: (chapter: ChapterData) => void
}

export function NewChapterDialog({ bookId, onCreated }: NewChapterDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setTitle("")
      setError(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError("Title is required"); return }

    startTransition(async () => {
      const result = await createChapter(bookId, title.trim())
      if (result.error) {
        setError(result.error)
        return
      }
      onCreated({
        id: result.chapterId!,
        title: title.trim(),
        order: 9999,
        visibility: "DRAFT" as PublicationStatus,
        wordCount: 0,
        updatedAt: new Date(),
      })
      setOpen(false)
      setTitle("")
      setError(null)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="new-chapter-button">
          <PlusIcon className="h-4 w-4 mr-1.5" />
          New chapter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New chapter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="chapter-title">Chapter title</Label>
            <Input
              id="chapter-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null) }}
              placeholder="Chapter 1"
              autoFocus
              data-testid="chapter-title-input"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="create-chapter-button">
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
