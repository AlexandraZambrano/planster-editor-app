"use client"

import { formatDistanceToNow } from "date-fns"
import { X, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useDateLocale } from "@/lib/date-locale"
import type { AuthorNoteEntry } from "@/actions/author-notes"

interface AuthorNotesPanelProps {
  notes: AuthorNoteEntry[] | null
  onClose: () => void
  onJump: (noteId: string) => void
  onDelete: (noteId: string) => void
}

export function AuthorNotesPanel({ notes, onClose, onJump, onDelete }: AuthorNotesPanelProps) {
  const t = useTranslations("Editor")
  const dateLocale = useDateLocale()

  return (
    <aside className="w-80 shrink-0 border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
        <span className="text-sm font-semibold">{t("myNotesTitle")}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("closePanel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {notes === null ? null : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noNotes")}</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border p-3 space-y-1.5"
                data-testid="author-note"
              >
                <button
                  type="button"
                  onClick={() => onJump(note.id)}
                  className="w-full text-left"
                >
                  <p className="text-xs italic text-muted-foreground border-l-2 pl-2 line-clamp-2">
                    &ldquo;{note.selectedText}&rdquo;
                  </p>
                  <p className="text-sm mt-1.5">{note.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: dateLocale })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("deleteNote")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
