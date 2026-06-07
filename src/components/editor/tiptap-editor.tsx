"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import FontFamily from "@tiptap/extension-font-family"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import { FontSize } from "./font-size"
import { Toolbar } from "./toolbar"
import { saveChapterContent } from "@/actions/chapters"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { cn } from "@/lib/utils"

const AUTOSAVE_MS = 30_000

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
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [wordCount, setWordCount] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
      FontFamily,
      FontSize,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialContent && Object.keys(initialContent).length > 0 ? initialContent : undefined,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[1054px] cursor-text",
        style: "padding: 40px 56px;",
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
    }
  }, [])

  const statusLabel = {
    saved: "Saved ✓",
    saving: "Saving…",
    error: "Error saving",
    idle: "Unsaved changes",
  }[saveStatus]

  const statusColor = {
    saved: "text-muted-foreground",
    saving: "text-muted-foreground",
    error: "text-destructive",
    idle: "text-amber-600",
  }[saveStatus]

  return (
    <div className="flex flex-col h-screen bg-[#F9FBFD]">
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

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-[816px] max-w-full bg-white shadow-sm rounded-sm border border-gray-100 min-h-[1054px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-2 bg-background border-t text-xs shrink-0">
        <span className="text-muted-foreground">
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
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
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
