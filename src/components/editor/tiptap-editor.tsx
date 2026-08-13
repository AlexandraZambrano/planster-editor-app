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
import { saveChapterContent } from "@/actions/chapters"
import { getChapterComments, getChapterReviews } from "@/actions/beta"
import { Button } from "@/components/ui/button"
import { Save, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

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
  })

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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {bookTitle}
          </a>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium truncate">{chapterTitle}</span>

          <Button
            type="button"
            size="sm"
            variant={showFeedback ? "secondary" : "ghost"}
            className="ml-auto h-7 gap-1.5 text-xs relative"
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

      {/* Editor content — paged, with an optional beta feedback sidebar */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto bg-muted py-8">
          <div className="editor-pages mx-auto w-[816px] max-w-full min-h-[1056px] rounded-md focus-within:ring-2 focus-within:ring-blue-400 transition-shadow">
            <EditorContent editor={editor} />
          </div>
        </div>

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
