"use client"

import { useCallback, useRef } from "react"
import { Handle, Position, useReactFlow } from "@xyflow/react"
import { cn } from "@/lib/utils"
import { updateBoardElementContent } from "@/actions/studio"

const NOTE_COLORS = [
  { bg: "#fef3c7", label: "Amber" },
  { bg: "#dbeafe", label: "Blue" },
  { bg: "#dcfce7", label: "Green" },
  { bg: "#fce7f3", label: "Pink" },
  { bg: "#f3e8ff", label: "Purple" },
  { bg: "#f1f5f9", label: "Slate" },
]

export type NoteNodeData = {
  elementId: string
  text: string
  noteColor: string
}

export function NoteNode({ id, data }: { id: string; data: NoteNodeData }) {
  const { updateNodeData } = useReactFlow()
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value
      updateNodeData(id, { text })
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        updateBoardElementContent(data.elementId, { text, color: data.noteColor })
      }, 1000)
    },
    [id, data.elementId, data.noteColor, updateNodeData]
  )

  const handleColorChange = useCallback(
    (color: string) => {
      updateNodeData(id, { noteColor: color })
      updateBoardElementContent(data.elementId, { text: data.text, color })
    },
    [id, data.elementId, data.text, updateNodeData]
  )

  return (
    <div
      className="rounded-xl border shadow-sm p-3 w-[200px] min-h-[120px] flex flex-col gap-2"
      style={{ backgroundColor: data.noteColor || "#fef3c7" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2.5 !h-2.5 !border-2 !border-white" />

      <textarea
        className="nodrag nopan flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none min-h-[72px] w-full"
        placeholder="Write a note…"
        value={data.text}
        onChange={handleTextChange}
      />

      <div className="flex gap-1.5 flex-wrap nodrag nopan">
        {NOTE_COLORS.map((c) => (
          <button
            key={c.bg}
            type="button"
            onClick={() => handleColorChange(c.bg)}
            className={cn(
              "h-4 w-4 rounded-full border transition-transform",
              data.noteColor === c.bg ? "border-gray-600 scale-125" : "border-gray-300"
            )}
            style={{ backgroundColor: c.bg }}
            title={c.label}
          />
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2.5 !h-2.5 !border-2 !border-white" />
    </div>
  )
}
