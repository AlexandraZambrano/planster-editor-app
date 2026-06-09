"use client"

import { useState, useRef, useCallback, useEffect, useTransition, KeyboardEvent } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@/components/editor/font-size"
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"
import { updateBookNote, deleteBookNote } from "@/actions/studio"
import type { BookNoteData } from "@/actions/studio"

type SaveStatus = "saved" | "saving" | "error" | "idle"

interface NoteEditorPanelProps {
  note: BookNoteData
  onUpdated: (noteId: string, patch: Partial<Pick<BookNoteData, "title" | "content" | "tags">>) => void
  onDeleted: (noteId: string) => void
}

export function NoteEditorPanel({ note, onUpdated, onDeleted }: NoteEditorPanelProps) {
  const [title, setTitle] = useState(note.title)
  const [tags, setTags] = useState<string[]>(note.tags)
  const [tagInput, setTagInput] = useState("")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [, startDelete] = useTransition()

  const isDirtyRef = useRef(false)
  const isReadyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleContentSave = useCallback(
    (content: object) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaveStatus("saving")
        const result = await updateBookNote(note.id, { content })
        setSaveStatus("error" in result ? "error" : "saved")
        isDirtyRef.current = false
      }, 2000)
    },
    [note.id]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: note.content && Object.keys(note.content).length > 0 ? note.content : undefined,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[300px] prose prose-sm max-w-none p-4",
      },
    },
    onUpdate({ editor: ed }) {
      if (!isReadyRef.current) return
      isDirtyRef.current = true
      setSaveStatus("idle")
      const json = ed.getJSON()
      onUpdated(note.id, { content: json as Record<string, unknown> })
      scheduleContentSave(json)
    },
    onCreate() {
      setTimeout(() => { isReadyRef.current = true }, 0)
    },
  })

  // Reset editor when switching notes
  useEffect(() => {
    if (editor && note.content && Object.keys(note.content).length > 0) {
      editor.commands.setContent(note.content)
    } else if (editor) {
      editor.commands.clearContent()
    }
    setTitle(note.title)
    setTags(note.tags)
    setSaveStatus("saved")
    isDirtyRef.current = false
    isReadyRef.current = false
    setTimeout(() => { isReadyRef.current = true }, 0)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id])

  async function handleTitleBlur() {
    if (title === note.title) return
    if (!title.trim()) {
      setTitle(note.title)
      return
    }
    setSaveStatus("saving")
    const result = await updateBookNote(note.id, { title: title.trim() })
    if ("error" in result) {
      setSaveStatus("error")
    } else {
      setSaveStatus("saved")
      onUpdated(note.id, { title: title.trim() })
    }
  }

  async function handleTagsSave(newTags: string[]) {
    setSaveStatus("saving")
    const result = await updateBookNote(note.id, { tags: newTags })
    if ("error" in result) {
      setSaveStatus("error")
    } else {
      setSaveStatus("saved")
      onUpdated(note.id, { tags: newTags })
    }
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/,/g, "")
      if (tag && !tags.includes(tag)) {
        const newTags = [...tags, tag]
        setTags(newTags)
        handleTagsSave(newTags)
      }
      setTagInput("")
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      const newTags = tags.slice(0, -1)
      setTags(newTags)
      handleTagsSave(newTags)
    }
  }

  function removeTag(tag: string) {
    const newTags = tags.filter((t) => t !== tag)
    setTags(newTags)
    handleTagsSave(newTags)
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteBookNote(note.id)
      if ("success" in result) onDeleted(note.id)
    })
  }

  const statusLabel = { saved: "Saved ✓", saving: "Saving…", error: "Error saving", idle: "Unsaved changes" }[saveStatus]
  const statusColor = { saved: "text-muted-foreground", saving: "text-muted-foreground", error: "text-destructive", idle: "text-amber-600" }[saveStatus]

  function toolBtn(title: string, active: boolean, onClick: () => void, icon: React.ReactNode) {
    return (
      <button
        key={title}
        type="button"
        title={title}
        onPointerDown={(e) => { e.preventDefault(); onClick() }}
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Note header */}
      <div className="px-6 py-4 border-b space-y-3 shrink-0">
        <div className="flex items-start gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Note title"
            className="flex-1 text-xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/60 focus:ring-0"
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete note?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{note.title}&quot; will be permanently deleted. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Tag input */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? "Add tags (press Enter)…" : ""}
            className="h-6 border-none shadow-none px-1 text-xs w-36 focus-visible:ring-0 bg-transparent"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {editor && (
          <>
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-b bg-muted/30 shrink-0">
              {toolBtn("Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3 w-3" />)}
              {toolBtn("Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3 w-3" />)}
              {toolBtn("Underline", editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-3 w-3" />)}
              <div className="h-4 w-px bg-border mx-0.5" />
              {toolBtn("Bullet list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3 w-3" />)}
              {toolBtn("Ordered list", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3 w-3" />)}
              <span className={cn("ml-auto text-xs pr-1", statusColor)}>{statusLabel}</span>
            </div>
            <EditorContent editor={editor} className="flex-1" />
          </>
        )}
      </div>
    </div>
  )
}
