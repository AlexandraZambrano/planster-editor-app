"use client"

import type { Editor } from "@tiptap/react"
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Minus, Undo, Redo, Maximize2, Minimize2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FONT_FAMILIES, FONT_SIZES } from "./font-size"

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
  className?: string
  title: string
}

function ToolbarSelect({ value, options, onChange, className, title }: ToolbarSelectProps) {
  return (
    <select
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
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
  const currentFontFamily =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? ""

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
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Font family */}
      <ToolbarSelect
        title="Font family"
        value={currentFontFamily}
        options={FONT_FAMILIES as unknown as { label: string; value: string }[]}
        onChange={(value) => {
          if (value) {
            editor.chain().focus().setFontFamily(value).run()
          } else {
            editor.chain().focus().unsetFontFamily().run()
          }
        }}
        className="w-36"
      />

      <Separator />

      {/* Font size */}
      <ToolbarSelect
        title="Font size"
        value={currentFontSize}
        options={FONT_SIZES.map((s) => ({ label: `${s}px`, value: s }))}
        onChange={(value) => {
          editor.chain().focus().setFontSize(`${value}px`).run()
        }}
        className="w-16"
      />

      <Separator />

      {/* Alignment */}
      <ToolbarButton
        title="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Lists */}
      <ToolbarButton
        title="Unordered list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Horizontal rule */}
      <ToolbarButton
        title="Insert horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Undo / Redo */}
      <ToolbarButton
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator />

      {/* Focus mode */}
      <ToolbarButton
        title={isFocusMode ? "Exit focus mode" : "Focus mode"}
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
