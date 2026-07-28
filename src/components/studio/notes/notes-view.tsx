"use client"

import { useState } from "react"
import { StickyNote } from "lucide-react"
import { NotesSidebar } from "./notes-sidebar"
import { NoteEditorPanel } from "./note-editor-panel"
import type { BookNoteData } from "@/actions/studio"

interface NotesViewProps {
  bookId: string
  initialNotes: BookNoteData[]
}

export function NotesView({ bookId, initialNotes }: NotesViewProps) {
  const [notes, setNotes] = useState<BookNoteData[]>(initialNotes)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialNotes[0]?.id ?? null)

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null

  function handleNoteCreated(note: BookNoteData) {
    setNotes((prev) => [note, ...prev])
    setActiveNoteId(note.id)
  }

  function handleNoteSelected(noteId: string) {
    setActiveNoteId(noteId)
  }

  function handleNoteUpdated(
    noteId: string,
    patch: Partial<Pick<BookNoteData, "title" | "content" | "tags">>
  ) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, ...patch, updatedAt: new Date() } : n
      )
    )
  }

  function handleNoteDeleted(noteId: string) {
    const remaining = notes.filter((n) => n.id !== noteId)
    setNotes(remaining)
    if (activeNoteId === noteId) {
      setActiveNoteId(remaining[0]?.id ?? null)
    }
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <NotesSidebar
        bookId={bookId}
        notes={notes}
        activeNoteId={activeNoteId}
        onNoteCreated={handleNoteCreated}
        onNoteSelected={handleNoteSelected}
      />

      {activeNote ? (
        <NoteEditorPanel
          key={activeNote.id}
          note={activeNote}
          onUpdated={handleNoteUpdated}
          onDeleted={handleNoteDeleted}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <StickyNote className="h-12 w-12 opacity-30" />
          <p className="text-sm">Select a note or create a new one.</p>
        </div>
      )}
    </div>
  )
}
