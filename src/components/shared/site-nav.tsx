import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { MessagesBell } from "@/components/messages/messages-bell"
import { LanguageSwitcher } from "./language-switcher"
import { SignOutButton } from "./sign-out-button"
import { MobileNav } from "./mobile-nav"
import { cn } from "@/lib/utils"

export type SiteNavActive = "home" | "explore" | "library" | "write"

interface SiteNavProps {
  active?: SiteNavActive
}

export async function SiteNav({ active }: SiteNavProps) {
  const [session, t] = await Promise.all([auth(), getTranslations("Nav")])

  const navLinks: { id: string; label: string; href: string; activeKey: SiteNavActive | null }[] = [
    { id: "home", label: t("home"), href: "/", activeKey: "home" },
    { id: "explore", label: t("bestReads"), href: "/explore", activeKey: "explore" },
    { id: "library", label: t("myLibrary"), href: "/library", activeKey: "library" },
    { id: "write", label: t("writeStory"), href: "/write", activeKey: "write" },
  ]

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl gap-4">
        <Link
          href="/"
          className="shrink-0 rounded-full bg-foreground text-white text-xs font-bold px-4 py-2 hover:opacity-90 transition-opacity"
        >
          Planster
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "text-xs lg:text-sm px-3 py-1.5 rounded-full whitespace-nowrap transition-colors",
                active !== undefined && active === item.activeKey
                  ? "border bg-background font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {session ? (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <LanguageSwitcher />
            <MessagesBell />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full ml-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={t("accountMenu")}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={session.user.avatarUrl ?? undefined}
                      alt={session.user.username}
                      style={{ objectPosition: `center ${session.user.avatarPositionY}%` }}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {session.user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/settings">{t("myProfile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <SignOutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Button asChild size="sm" variant="ghost">
              <Link href="/auth/login">{t("signIn")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/register">{t("signUp")}</Link>
            </Button>
          </div>
        )}

        <div className="flex md:hidden items-center gap-1 shrink-0">
          {session && <MessagesBell />}
          {session && <NotificationBell />}
          <MobileNav
            navLinks={navLinks}
            active={active}
            isSignedIn={!!session}
            username={session?.user.username}
          />
        </div>
      </div>
    </header>
  )
}
