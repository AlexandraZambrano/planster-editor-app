import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Compass, House, Library, LogIn, PenLine, UserRound, type LucideIcon } from "lucide-react"
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
import { Logo } from "./logo"
import { cn } from "@/lib/utils"

export type SiteNavActive = "home" | "explore" | "library" | "write" | "me"

interface SiteNavProps {
  active?: SiteNavActive
}

interface NavItem {
  key: SiteNavActive
  label: string
  tabLabel: string
  href: string
  icon: LucideIcon
}

export async function SiteNav({ active }: SiteNavProps) {
  const [session, t] = await Promise.all([auth(), getTranslations("Nav")])

  const navItems: NavItem[] = [
    { key: "home", label: t("home"), tabLabel: t("home"), href: "/", icon: House },
    { key: "explore", label: t("bestReads"), tabLabel: t("tabExplore"), href: "/explore", icon: Compass },
    { key: "write", label: t("writeStory"), tabLabel: t("tabWrite"), href: "/write", icon: PenLine },
    { key: "library", label: t("myLibrary"), tabLabel: t("tabLibrary"), href: "/library", icon: Library },
  ]
  const meItem: NavItem = session
    ? { key: "me", label: t("myProfile"), tabLabel: t("tabMe"), href: `/@${session.user.username}`, icon: UserRound }
    : { key: "me", label: t("signIn"), tabLabel: t("signIn"), href: "/auth/login", icon: LogIn }

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl gap-4">
          <Logo />

          <nav aria-label={t("primaryNav")} className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(({ key, label, href, icon: Icon }) => {
              const isActive = active === key
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 text-sm px-3.5 h-10 rounded-full whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              )
            })}
          </nav>

          {session ? (
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <LanguageSwitcher />
              <MessagesBell />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="rounded-full ml-1" aria-label={t("accountMenu")}>
                    <Avatar className="h-10 w-10 ring-2 ring-background">
                      <AvatarImage
                        src={session.user.avatarUrl ?? undefined}
                        alt=""
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
                    <Link href={`/@${session.user.username}`}>{t("myProfile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">{t("settings")}</Link>
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
              <Button asChild variant="ghost">
                <Link href="/auth/login">{t("signIn")}</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">{t("signUp")}</Link>
              </Button>
            </div>
          )}

          <div className="flex md:hidden items-center gap-1 shrink-0">
            {session && <MessagesBell />}
            {session && <NotificationBell />}
            <MobileNav isSignedIn={!!session} username={session?.user.username} />
          </div>
        </div>
      </header>

      {/* Social-app style tab bar: primary destinations always one tap away on phones */}
      <nav
        id="mobile-tabbar"
        aria-label={t("primaryNav")}
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-16">
          {[...navItems, meItem].map(({ key, tabLabel, href, icon: Icon }) => {
            const isActive = active === key
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full transition-colors",
                      isActive && "bg-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {tabLabel}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
