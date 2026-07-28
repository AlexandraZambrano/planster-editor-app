"use client"

import Image from "next/image"
import Link from "next/link"
import { Handle, Position } from "@xyflow/react"
import { MapPin } from "lucide-react"

export type LocationNodeData = {
  elementId: string
  locationId: string
  bookId: string
  name: string
  thumbnailUrl: string | null
}

export function LocationNode({ data }: { data: LocationNodeData }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden w-[140px] select-none">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-white" />

      <div className="relative h-20 w-full bg-muted flex items-center justify-center">
        {data.thumbnailUrl ? (
          <Image src={data.thumbnailUrl} alt={data.name} fill className="object-cover" sizes="140px" />
        ) : (
          <MapPin className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <div className="p-2">
        <Link
          href={`/write/${data.bookId}/studio/worldbuilding/${data.locationId}`}
          target="_blank"
          className="text-sm font-semibold leading-tight hover:text-primary transition-colors line-clamp-2 block"
        >
          {data.name}
        </Link>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-white" />
    </div>
  )
}
