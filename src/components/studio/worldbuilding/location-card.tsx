"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin } from "lucide-react"

interface LocationCardProps {
  location: {
    id: string
    name: string
    images: string[]
    _count: { subLocations: number }
  }
  bookId: string
}

export function LocationCard({ location, bookId }: LocationCardProps) {
  const thumb = location.images[0] ?? null

  return (
    <Link href={`/write/${bookId}/studio/worldbuilding/${location.id}`}>
      <div className="group flex flex-col rounded-xl border border-border bg-card hover:shadow-sm hover:border-muted-foreground/30 transition-all overflow-hidden">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted flex items-center justify-center">
          {thumb ? (
            <Image src={thumb} alt={location.name} fill className="object-cover" />
          ) : (
            <MapPin className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-0.5">
          <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
            {location.name}
          </p>
          {location._count.subLocations > 0 && (
            <p className="text-xs text-muted-foreground">
              {location._count.subLocations} sub-location
              {location._count.subLocations !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
