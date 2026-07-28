"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { changePassword } from "@/actions/settings"
import { createClient } from "@/lib/supabase/client"

export function ChangePasswordForm() {
  const t = useTranslations("Settings")
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await changePassword({ currentPassword, newPassword })
      if (result.error) {
        setError(result.error)
        return
      }
      // Supabase invalidates this session's other tokens on a password
      // change, so we sign out locally and send the user back to log in.
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/auth/login?passwordChanged=true")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <PasswordInput
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <PasswordInput
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? t("updating") : t("changePassword")}
      </Button>
    </form>
  )
}
