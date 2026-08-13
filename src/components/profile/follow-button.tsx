"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { UserPlus, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { followUser, unfollowUser } from "@/actions/follow"

interface FollowButtonProps {
  userId: string
  initialIsFollowing: boolean
}

export function FollowButton({ userId, initialIsFollowing }: FollowButtonProps) {
  const t = useTranslations("Profile")
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !isFollowing
    setIsFollowing(next)
    startTransition(async () => {
      const result = next ? await followUser(userId) : await unfollowUser(userId)
      if (result.error) setIsFollowing(!next)
    })
  }

  return (
    <Button
      type="button"
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      disabled={isPending}
      onClick={toggle}
      className="gap-1.5"
    >
      {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {isFollowing ? t("following") : t("follow")}
    </Button>
  )
}
