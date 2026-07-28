"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "./font-size"
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"

type SaveStatus = "saved" | "saving" | "error" | "idle"

interface StudioEditorProps {
  initialContent: object | null
  onSave: (content: object) => Promise<{ error?: string; success?: boolean }>
}

export function StudioEditor({ initialContent, onSave }: StudioEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const isDirtyRef = useRef(false)
  const isReadyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    async (ed: ReturnType<typeof useEditor>) => {
      if (!ed || !isDirtyRef.current) return
      setSaveStatus("saving")
      try {
        const result = await onSave(ed.getJSON())
        if (result.error) {
          setSaveStatus("error")
        } else {
          setSaveStatus("saved")
          isDirtyRef.current = false
        }
      } catch {
        setSaveStatus("error")
      }
    },
    [onSave]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content:
      initialContent && Object.keys(initialContent).length > 0 ? initialContent : undefined,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[280px] prose prose-sm max-w-none p-3",
      },
    },
    onUpdate({ editor: ed }) {
      if (!isReadyRef.current) return
      isDirtyRef.current = true
      setSaveStatus("idle")
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => save(ed), 2000)
    },
    onCreate() {
      setTimeout(() => {
        isReadyRef.current = true
      }, 0)
    },
  })

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
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

  if (!editor) return null

  function btn(
    title: string,
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode
  ) {
    return (
      <button
        key={title}
        type="button"
        title={title}
        onPointerDown={(e) => {
          e.preventDefault()
          onClick()
        }}
        className={cn(
          "h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors",
          active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        {icon}
      </button>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      {/* Mini toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        {btn("Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3 w-3" />)}
        {btn("Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3 w-3" />)}
        {btn("Underline", editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-3 w-3" />)}
        <div className="h-4 w-px bg-border mx-0.5" />
        {btn("Bullet list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3 w-3" />)}
        {btn("Ordered list", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3 w-3" />)}
        <span className={cn("ml-auto text-xs pr-1", statusColor)}>{statusLabel}</span>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
