import Image from "next/image"
import Link from "next/link"
import { FollowButton } from "@/components/profile/follow-button"
import type { PersonCard as PersonCardType } from "@/actions/people"

interface PersonCardProps {
  person: PersonCardType
  caption?: string | null
}

export function PersonCard({ person, caption }: PersonCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
      <Link href={`/profile/${person.username}`} className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border shrink-0">
        {person.avatarUrl ? (
          <Image src={person.avatarUrl} alt={person.displayName} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82] text-white font-bold">
            {person.displayName[0]?.toUpperCase()}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${person.username}`} className="block hover:underline">
          <p className="text-sm font-semibold truncate">{person.displayName}</p>
        </Link>
        <p className="text-xs text-muted-foreground truncate">@{person.username}</p>
        {caption ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{caption}</p>
        ) : (
          person.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{person.bio}</p>
        )}
      </div>
      <FollowButton userId={person.id} initialIsFollowing={person.isFollowing} />
    </div>
  )
}
