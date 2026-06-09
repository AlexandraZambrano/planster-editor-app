"use client"

import Image from "next/image"
import Link from "next/link"
import { Handle, Position } from "@xyflow/react"
import { User } from "lucide-react"

const ROLE_COLORS: Record<string, string> = {
  PROTAGONIST: "bg-purple-100 text-purple-700",
  ANTAGONIST: "bg-red-100 text-red-700",
  SECONDARY: "bg-blue-100 text-blue-700",
  TERTIARY: "bg-gray-100 text-gray-600",
  OTHER: "bg-gray-100 text-gray-600",
}

const ROLE_LABELS: Record<string, string> = {
  PROTAGONIST: "Protagonist",
  ANTAGONIST: "Antagonist",
  SECONDARY: "Secondary",
  TERTIARY: "Tertiary",
  OTHER: "Other",
}

export type CharacterNodeData = {
  elementId: string
  characterId: string
  bookId: string
  name: string
  mainImageUrl: string | null
  storyRole: string
}

export function CharacterNode({ data }: { data: CharacterNodeData }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3 w-[140px] flex flex-col items-center gap-2 select-none">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-white" />

      <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-border">
        {data.mainImageUrl ? (
          <Image src={data.mainImageUrl} alt={data.name} fill className="object-cover" sizes="56px" />
        ) : (
          <User className="h-7 w-7 text-muted-foreground" />
        )}
      </div>

      <div className="text-center min-w-0 w-full space-y-1">
        <Link
          href={`/write/${data.bookId}/studio/characters/${data.characterId}`}
          target="_blank"
          className="text-sm font-semibold leading-tight hover:text-primary transition-colors line-clamp-2 block"
        >
          {data.name}
        </Link>
        <span
          className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[data.storyRole] ?? ROLE_COLORS.OTHER}`}
        >
          {ROLE_LABELS[data.storyRole] ?? data.storyRole}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-white" />
    </div>
  )
}
