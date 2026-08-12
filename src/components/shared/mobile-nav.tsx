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
import { cn } from "@/lib/utils"
import type { SiteNavActive } from "./site-nav"

interface NavLink {
  id: string
  label: string
  href: string
  activeKey: SiteNavActive | null
}

interface MobileNavProps {
  navLinks: NavLink[]
  active?: SiteNavActive
  isSignedIn: boolean
  username?: string | null
}

export function MobileNav({ navLinks, active, isSignedIn, username }: MobileNavProps) {
  const t = useTranslations("Nav")
  const tLanguage = useTranslations("Language")

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left">Planster</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 mt-4">
          {navLinks.map((item) => (
            <SheetClose asChild key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active !== undefined && active === item.activeKey
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="border-t my-4" />

        {isSignedIn ? (
          <div className="flex flex-col gap-1">
            <SheetClose asChild>
              <Link
                href="/settings"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {username ? `@${username}` : t("myProfile")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <div className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                <SignOutButton />
              </div>
            </SheetClose>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
          <span className="text-xs text-muted-foreground">{tLanguage("label")}</span>
          <LanguageSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )
}
