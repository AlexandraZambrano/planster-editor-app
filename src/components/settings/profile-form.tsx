"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarUpload } from "./avatar-upload"
import { updateProfile, type SettingsData } from "@/actions/settings"

interface ProfileFormProps {
  initial: SettingsData
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const t = useTranslations("Settings")
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [username, setUsername] = useState(initial.username)
  const [bio, setBio] = useState(initial.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl)
  const [avatarPositionY, setAvatarPositionY] = useState(initial.avatarPositionY)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await updateProfile({
        displayName,
        username,
        bio,
        avatarUrl: avatarUrl ?? "",
        avatarPositionY,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <AvatarUpload
        value={avatarUrl}
        displayName={displayName}
        positionY={avatarPositionY}
        onChange={setAvatarUrl}
        onPositionChange={setAvatarPositionY}
      />

      <div className="space-y-1.5">
        <Label htmlFor="displayName">{t("displayName")}</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="username">{t("username")}</Label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">@</span>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">{t("bio")}</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder={t("bioPlaceholder")}
        />
        <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">{t("profileUpdated")}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  )
}
