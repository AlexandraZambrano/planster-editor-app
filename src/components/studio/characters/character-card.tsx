import Link from "next/link"
import Image from "next/image"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StoryRole } from "@prisma/client"

const ROLE_COLORS: Record<StoryRole, string> = {
  PROTAGONIST: "bg-purple-100 text-purple-700",
  ANTAGONIST: "bg-red-100 text-red-700",
  SECONDARY: "bg-blue-100 text-blue-700",
  TERTIARY: "bg-gray-100 text-gray-600",
  OTHER: "bg-gray-100 text-gray-600",
}

const ROLE_LABELS: Record<StoryRole, string> = {
  PROTAGONIST: "Protagonist",
  ANTAGONIST: "Antagonist",
  SECONDARY: "Secondary",
  TERTIARY: "Tertiary",
  OTHER: "Other",
}

interface CharacterCardProps {
  character: {
    id: string
    name: string
    nickname: string | null
    mainImageUrl: string | null
    storyRole: StoryRole
  }
  bookId: string
}

export function CharacterCard({ character, bookId }: CharacterCardProps) {
  return (
    <Link href={`/write/${bookId}/studio/characters/${character.id}`}>
      <div className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
        <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 ring-2 ring-offset-2 ring-transparent group-hover:ring-primary/30 transition-all">
          {character.mainImageUrl ? (
            <Image
              src={character.mainImageUrl}
              alt={character.name}
              fill
              className="object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="text-center min-w-0 w-full">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {character.name}
          </p>
          {character.nickname && (
            <p className="text-xs text-muted-foreground truncate">"{character.nickname}"</p>
          )}
        </div>

        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            ROLE_COLORS[character.storyRole]
          )}
        >
          {ROLE_LABELS[character.storyRole]}
        </span>
      </div>
    </Link>
  )
}
