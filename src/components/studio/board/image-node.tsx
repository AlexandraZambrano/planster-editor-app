"use client"

import { useRef, useTransition } from "react"
import Image from "next/image"
import { Handle, Position, useReactFlow } from "@xyflow/react"
import { ImageIcon, Loader2 } from "lucide-react"
import { updateBoardElementContent } from "@/actions/studio"

export type ImageNodeData = {
  elementId: string
  imageUrl: string
}

export function ImageNode({ id, data }: { id: string; data: ImageNodeData }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { updateNodeData } = useReactFlow()
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "planster/board")

    startTransition(async () => {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = (await res.json()) as { url: string }
        updateNodeData(id, { imageUrl: url })
        await updateBoardElementContent(data.elementId, { imageUrl: url })
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden w-[180px] select-none">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-white" />

      <div className="relative min-h-[120px] bg-muted flex items-center justify-center">
        {data.imageUrl ? (
          <Image
            src={data.imageUrl}
            alt="Board image"
            width={180}
            height={120}
            className="object-cover w-full"
            unoptimized
          />
        ) : isPending ? (
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        ) : (
          <button
            type="button"
            className="nodrag flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors p-6"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Click to upload</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-white" />
    </div>
  )
}
