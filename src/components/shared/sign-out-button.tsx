"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const t = useTranslations("Nav")
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2 text-left">
      <LogOut className="h-4 w-4" />
      {t("signOut")}
    </button>
  )
}
