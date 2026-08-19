"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useTranslations } from "next-intl"
import { TextStyle } from "./font-size"
import { Toolbar } from "./toolbar"
import { BetaFeedbackPanel } from "./beta-feedback-panel"
import { AuthorNotesPanel } from "./author-notes-panel"
import { NoteHighlight, noteHighlightKey } from "./note-highlight-extension"
import { saveChapterContent } from "@/actions/chapters"
import { getChapterComments, getChapterReviews } from "@/actions/beta"
import {
  createAuthorNote,
  getAuthorNotes,
  deleteAuthorNote,
  type AuthorNoteEntry,
} from "@/actions/author-notes"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, MessageSquare, StickyNote, ChevronLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"

type NoteSelectionState = {
  from: number
  to: number
  text: string
  rect: { top: number; left: number; width: number }
} | null

const AUTOSAVE_MS = 30_000
const DEBOUNCE_MS = 2_000

type SaveStatus = "saved" | "saving" | "error" | "idle"

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length
}

interface TiptapEditorProps {
  chapterId: string
  bookId: string
  chapterTitle: string
  bookTitle: string
  initialContent: object | null
}

export function TiptapEditor({
  chapterId,
  bookId,
  chapterTitle,
  bookTitle,
  initialContent,
}: TiptapEditorProps) {
  const t = useTranslations("Editor")
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [wordCount, setWordCount] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackCount, setFeedbackCount] = useState(0)

  const [authorNotes, setAuthorNotes] = useState<AuthorNoteEntry[] | null>(null)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [noteSelection, setNoteSelection] = useState<NoteSelectionState>(null)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [noteSuccess, setNoteSuccess] = useState(false)
  const savedNoteSelectionRef = useRef<NoteSelectionState>(null)
  const noteFormRef = useRef<HTMLDivElement>(null)

  const loadFeedbackCount = useCallback(() => {
    Promise.all([getChapterComments(chapterId), getChapterReviews(chapterId)])
      .then(([c, r]) => {
        const unresolved = c.comments?.filter((comment) => !comment.resolved).length ?? 0
        setFeedbackCount(unresolved + (r.reviews?.length ?? 0))
      })
      .catch(() => {
        // Non-critical — the feedback badge just stays at its last known count.
      })
  }, [chapterId])

  useEffect(() => {
    loadFeedbackCount()
  }, [loadFeedbackCount])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)
  const isEditorReadyRef = useRef(false)

  const save = useCallback(
    async (editorInstance: ReturnType<typeof useEditor>, force = false) => {
      if (!editorInstance) return
      if (!force && !isDirtyRef.current) return
      setSaveStatus("saving")
      try {
        const content = editorInstance.getJSON()
        const words = countWords(editorInstance.getText())
        const result = await saveChapterContent(chapterId, content, words)
        if (result.error) {
          setSaveStatus("error")
        } else {
          setSaveStatus("saved")
          isDirtyRef.current = false
        }
      } catch (err) {
        console.error("[editor] save failed:", err)
        setSaveStatus("error")
      }
    },
    [chapterId]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      NoteHighlight,
    ],
    content: initialContent && Object.keys(initialContent).length > 0 ? initialContent : undefined,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[1054px] cursor-text",
        style: "padding: 40px 56px 80px;",
      },
      handleKeyDown(_view, event) {
        // Ctrl+S / Cmd+S — manual save
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
          event.preventDefault()
          return true
        }
        return false
      },
    },
    onUpdate({ editor: ed }) {
      if (!isEditorReadyRef.current) return
      setWordCount(countWords(ed.getText()))
      isDirtyRef.current = true
      setSaveStatus("idle")

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => { save(ed) }, DEBOUNCE_MS)
    },
    onCreate({ editor: ed }) {
      setWordCount(countWords(ed.getText()))
      setTimeout(() => { isEditorReadyRef.current = true }, 0)
    },
    onSelectionUpdate({ editor: ed }) {
      const { from, to } = ed.state.selection
      if (from === to) {
        if (!showNoteForm) setNoteSelection(null)
        return
      }
      const text = ed.state.doc.textBetween(from, to, " ")
      if (!text.trim()) {
        setNoteSelection(null)
        return
      }
      const nativeSel = window.getSelection()
      if (!nativeSel || nativeSel.rangeCount === 0) return
      const range = nativeSel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const newSel: NoteSelectionState = {
        from,
        to,
        text: text.trim(),
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + rect.width / 2,
          width: rect.width,
        },
      }
      setNoteSelection(newSel)
      savedNoteSelectionRef.current = newSel
    },
  })

  const updateNoteDecorations = useCallback(
    (list: AuthorNoteEntry[]) => {
      if (!editor) return
      editor.view.dispatch(
        editor.state.tr.setMeta(
          noteHighlightKey,
          list.map((n) => ({ id: n.id, from: n.fromPos, to: n.toPos }))
        )
      )
    },
    [editor]
  )

  const loadNotes = useCallback(() => {
    getAuthorNotes(chapterId).then((r) => {
      const list = r.notes ?? []
      setAuthorNotes(list)
      updateNoteDecorations(list)
    })
  }, [chapterId, updateNoteDecorations])

  useEffect(() => {
    if (!editor) return
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  function openNoteForm() {
    if (!noteSelection) return
    savedNoteSelectionRef.current = noteSelection
    setShowNoteForm(true)
    setNoteText("")
    setNoteError(null)
    setNoteSuccess(false)
  }

  function closeNoteForm() {
    setShowNoteForm(false)
    setNoteSelection(null)
    savedNoteSelectionRef.current = null
    setNoteText("")
    setNoteError(null)
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    const sel = savedNoteSelectionRef.current
    if (!sel) return
    setNoteLoading(true)
    setNoteError(null)

    const result = await createAuthorNote(chapterId, sel.text, sel.from, sel.to, noteText)
    setNoteLoading(false)

    if (result.error) {
      setNoteError(result.error)
    } else {
      setNoteSuccess(true)
      loadNotes()
      setTimeout(closeNoteForm, 1000)
    }
  }

  function jumpToNote(noteId: string) {
    const target = document.querySelector(`[data-note-id="${noteId}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "center" })
    target.classList.add("!bg-violet-400/70")
    setTimeout(() => target.classList.remove("!bg-violet-400/70"), 1200)
  }

  async function handleDeleteNote(noteId: string) {
    setAuthorNotes((prev) => prev?.filter((n) => n.id !== noteId) ?? null)
    await deleteAuthorNote(noteId)
    loadNotes()
  }

  // Dismiss note form when clicking outside
  useEffect(() => {
    if (!showNoteForm) return
    function onMouseDown(e: MouseEvent) {
      if (noteFormRef.current && !noteFormRef.current.contains(e.target as Node)) {
        closeNoteForm()
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [showNoteForm])

  const activeNoteSel = showNoteForm ? savedNoteSelectionRef.current : noteSelection

  // Ctrl+S / Cmd+S save — listened at the window level so it works anywhere in the editor
  useEffect(() => {
    if (!editor) return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        save(editor, true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editor, save])

  // 30-second interval auto-save
  useEffect(() => {
    if (!editor) return
    intervalRef.current = setInterval(() => save(editor), AUTOSAVE_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [editor, save])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const statusLabel = {
    saved: t("savedStatus"),
    saving: t("savingStatus"),
    error: t("errorStatus"),
    idle: t("unsavedStatus"),
  }[saveStatus]

  const statusColor = {
    saved: "text-muted-foreground",
    saving: "text-muted-foreground",
    error: "text-destructive",
    idle: "text-amber-600",
  }[saveStatus]

  return (
    <div className="flex flex-col h-screen bg-muted">
      {/* Top bar — hidden in focus mode */}
      {!isFocusMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-background border-b shrink-0">
          <a
            href={`/write/${bookId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {bookTitle}
          </a>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium truncate">{chapterTitle}</span>

          <Button
            type="button"
            size="sm"
            variant={showNotesPanel ? "secondary" : "ghost"}
            className="ml-auto h-7 gap-1.5 text-xs relative"
            onClick={() => setShowNotesPanel((v) => !v)}
          >
            <StickyNote className="h-3.5 w-3.5" />
            {t("myNotesButton")}
            {authorNotes && authorNotes.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-medium text-white">
                {authorNotes.length > 99 ? "99+" : authorNotes.length}
              </span>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={showFeedback ? "secondary" : "ghost"}
            className="h-7 gap-1.5 text-xs relative"
            onClick={() => setShowFeedback((v) => !v)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {t("feedbackButton")}
            {feedbackCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {feedbackCount > 99 ? "99+" : feedbackCount}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Toolbar */}
      {editor && (
        <Toolbar
          editor={editor}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode((v) => !v)}
        />
      )}

      {/* Editor content — paged, with optional beta feedback / private notes sidebars */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto bg-muted py-8 relative">
          <div className="editor-pages mx-auto w-[816px] max-w-full min-h-[1056px] rounded-md focus-within:ring-2 focus-within:ring-blue-400 transition-shadow relative">
            <EditorContent editor={editor} />

            {/* Floating "add private note" button on text selection */}
            {noteSelection && !showNoteForm && (
              <div
                className="fixed z-20 -translate-x-1/2"
                style={{ top: noteSelection.rect.top - 44, left: noteSelection.rect.left }}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={openNoteForm}
                  className="shadow-md gap-1.5"
                  data-testid="add-note-btn"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  {t("addNoteButton")}
                </Button>
              </div>
            )}

            {/* Private note form */}
            {showNoteForm && activeNoteSel && (
              <div
                ref={noteFormRef}
                className="fixed z-20 w-72 bg-popover border rounded-lg shadow-lg p-3"
                style={{
                  top: activeNoteSel.rect.top - 8,
                  left: Math.min(
                    activeNoteSel.rect.left - 144,
                    (typeof window !== "undefined" ? window.innerWidth : 1000) - 300
                  ),
                }}
                data-testid="note-form"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground line-clamp-2">
                    &ldquo;{activeNoteSel.text.slice(0, 80)}{activeNoteSel.text.length > 80 ? "…" : ""}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={closeNoteForm}
                    className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
                    aria-label={t("closePanel")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <form onSubmit={submitNote} className="space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    rows={3}
                    autoFocus
                    data-testid="note-textarea"
                  />

                  {noteError && (
                    <Alert variant="destructive" className="py-1.5">
                      <AlertDescription className="text-xs">{noteError}</AlertDescription>
                    </Alert>
                  )}

                  {noteSuccess && (
                    <p className="text-xs text-green-600">{t("noteSubmitted")}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={closeNoteForm}
                      className="h-7 text-xs"
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={noteLoading || !noteText.trim()}
                      className="h-7 text-xs"
                    >
                      {noteLoading ? "…" : t("send")}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {showNotesPanel && !isFocusMode && (
          <AuthorNotesPanel
            notes={authorNotes}
            onClose={() => setShowNotesPanel(false)}
            onJump={jumpToNote}
            onDelete={handleDeleteNote}
          />
        )}

        {showFeedback && !isFocusMode && (
          <BetaFeedbackPanel
            chapterId={chapterId}
            onClose={() => setShowFeedback(false)}
            onChange={loadFeedbackCount}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-2 bg-background border-t text-xs shrink-0">
        <span className="text-muted-foreground">
          {t("wordCount", { count: wordCount })}
        </span>

        <div className="flex items-center gap-3">
          <span className={cn("transition-colors", statusColor)}>{statusLabel}</span>
          <Button
            size="sm"
            variant={saveStatus === "idle" ? "default" : "outline"}
            className="h-7 gap-1.5 text-xs"
            disabled={saveStatus === "saving" || !editor}
            onClick={() => editor && save(editor, true)}
          >
            <Save className="h-3 w-3" />
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  )
}
