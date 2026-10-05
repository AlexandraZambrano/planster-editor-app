"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { LanguageSwitcher } from "./language-switcher"
import { SignOutButton } from "./sign-out-button"

interface MobileNavProps {
  isSignedIn: boolean
  username?: string | null
}

// Secondary navigation only (account, language) — primary destinations live in the bottom tab bar.
export function MobileNav({ isSignedIn, username }: MobileNavProps) {
  const t = useTranslations("Nav")
  const tLanguage = useTranslations("Language")
  const itemClass =
    "rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={t("openMenu")}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left font-display">Planster</SheetTitle>
        </SheetHeader>

        {isSignedIn ? (
          <div className="flex flex-col gap-1 mt-4">
            <SheetClose asChild>
              <Link href={username ? `/@${username}` : "/settings"} className={itemClass}>
                {username ? `@${username}` : t("myProfile")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/settings" className={itemClass}>
                {t("settings")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <div className={`${itemClass} cursor-pointer`}>
                <SignOutButton />
              </div>
            </SheetClose>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            <SheetClose asChild>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/login">{t("signIn")}</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button asChild className="w-full">
                <Link href="/auth/register">{t("signUp")}</Link>
              </Button>
            </SheetClose>
          </div>
        )}

        <div className="mt-auto pt-4 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{tLanguage("label")}</span>
          <LanguageSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )
}
