"use client"

import { useState, useTransition } from "react"
import { Search, Plus, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createBookNote } from "@/actions/studio"
import type { BookNoteData } from "@/actions/studio"

interface NotesSidebarProps {
  bookId: string
  notes: BookNoteData[]
  activeNoteId: string | null
  onNoteCreated: (note: BookNoteData) => void
  onNoteSelected: (noteId: string) => void
}

function contentPreview(content: Record<string, unknown>): string {
  try {
    const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> }
    const texts: string[] = []
    for (const block of doc.content ?? []) {
      for (const inline of block.content ?? []) {
        if (inline.text) texts.push(inline.text)
      }
      if (texts.length > 0) break
    }
    return texts.join("").slice(0, 80)
  } catch {
    return ""
  }
}

export function NotesSidebar({
  bookId,
  notes,
  activeNoteId,
  onNoteCreated,
  onNoteSelected,
}: NotesSidebarProps) {
  const [query, setQuery] = useState("")
  const [isCreating, startCreate] = useTransition()

  const filtered = notes.filter((n) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q))
  })

  function handleCreate() {
    startCreate(async () => {
      const result = await createBookNote(bookId, "Untitled note")
      if ("note" in result) {
        onNoteCreated(result.note)
      }
    })
  }

  return (
    <div className="w-64 shrink-0 border-r flex flex-col h-full bg-background">
      <div className="p-3 border-b space-y-2">
        <Button
          onClick={handleCreate}
          disabled={isCreating}
          size="sm"
          className="w-full gap-1.5"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New note
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search title or tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            {query ? "No notes match your search." : "No notes yet. Create one above."}
          </p>
        ) : (
          filtered.map((note) => {
            const preview = contentPreview(note.content)
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => onNoteSelected(note.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-colors hover:bg-accent/50",
                  note.id === activeNoteId && "bg-accent"
                )}
              >
                <p className="text-sm font-medium truncate">{note.title || "Untitled"}</p>
                {preview && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
                )}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground leading-none"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground leading-none self-center">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
