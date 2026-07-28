"use client"

import { useRef } from "react"
import type { Editor } from "@tiptap/react"
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Minus, Undo, Redo, Maximize2, Minimize2,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { FONT_SIZES } from "./font-size"

// Prevents the editor from losing focus when clicking toolbar items
function onToolbarPointerDown(e: React.PointerEvent) {
  e.preventDefault()
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onPointerDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      disabled={disabled}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded text-sm transition-colors",
        "hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Separator() {
  return <div className="h-6 w-px bg-border mx-1 shrink-0" onPointerDown={onToolbarPointerDown} />
}

interface ToolbarSelectProps {
  value: string
  options: readonly { label: string; value: string }[]
  onChange: (value: string) => void
  onMouseDown?: () => void
  className?: string
  title: string
}

function ToolbarSelect({ value, options, onChange, onMouseDown, className, title }: ToolbarSelectProps) {
  return (
    <select
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={onMouseDown}
      className={cn(
        "h-8 rounded border-none bg-transparent text-xs text-foreground cursor-pointer",
        "hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring px-1",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

interface ToolbarProps {
  editor: Editor
  isFocusMode: boolean
  onToggleFocusMode: () => void
}

export function Toolbar({ editor, isFocusMode, onToggleFocusMode }: ToolbarProps) {
  const t = useTranslations("Editor")
  // Native <select> steals focus before onChange fires.
  // We snapshot the selection on mouseDown so we can restore it in onChange.
  const savedSelection = useRef<{ from: number; to: number } | null>(null)

  function saveSelection() {
    const { from, to } = editor.state.selection
    savedSelection.current = { from, to }
  }

  // Retrieves the saved selection and clears it; falls back to "select all"
  // so the mark is committed into the document, not left as a stored/pending mark.
  function popSelection(): { from: number; to: number } | "all" {
    const sel = savedSelection.current
    savedSelection.current = null
    if (sel && sel.from !== sel.to) return sel
    return "all"
  }

  // Font family selector is intentionally disabled for v1.
  // To re-enable: add <ToolbarSelect> for FONT_FAMILIES and call applyFontFamily.
  // function applyFontFamily(value: string) {
  //   const sel = popSelection()
  //   const base = sel === "all"
  //     ? editor.chain().focus().selectAll()
  //     : editor.chain().focus().setTextSelection(sel)
  //   if (value) base.setFontFamily(value).run()
  //   else base.unsetFontFamily().run()
  // }

  function applyFontSize(value: string) {
    const sel = popSelection()
    const base = sel === "all"
      ? editor.chain().focus().selectAll()
      : editor.chain().focus().setTextSelection(sel)
    base.setFontSize(`${value}px`).run()
  }

  const currentFontSize = (() => {
    const raw = editor.getAttributes("textStyle").fontSize as string | undefined
    if (!raw) return "16"
    return raw.replace("px", "")
  })()

  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-0.5 flex-wrap px-3 py-1.5 bg-background border-b shadow-sm"
      onPointerDown={onToolbarPointerDown}
    >
      {/* Text formatting */}
      <ToolbarButton
        title={t("bold")}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("italic")}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("underline")}
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("strikethrough")}
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Font size */}
      <ToolbarSelect
        title={t("fontSize")}
        value={currentFontSize}
        options={FONT_SIZES.map((s) => ({ label: `${s}px`, value: s }))}
        onMouseDown={saveSelection}
        onChange={applyFontSize}
        className="w-16"
      />

      <Separator />

      {/* Alignment */}
      <ToolbarButton
        title={t("alignLeft")}
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("alignCenter")}
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("alignRight")}
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("justify")}
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Lists */}
      <ToolbarButton
        title={t("unorderedList")}
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("orderedList")}
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Horizontal rule */}
      <ToolbarButton
        title={t("insertHorizontalRule")}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Undo / Redo */}
      <ToolbarButton
        title={t("undo")}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title={t("redo")}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Focus mode */}
      <ToolbarButton
        title={isFocusMode ? t("exitFocusMode") : t("focusMode")}
        onClick={onToggleFocusMode}
      >
        {isFocusMode ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
      </ToolbarButton>
    </div>
  )
}
