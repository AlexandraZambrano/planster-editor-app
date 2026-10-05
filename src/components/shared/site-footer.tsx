import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Logo } from "./logo"

export async function SiteFooter() {
  const t = await getTranslations("Home")

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <Logo />
          <p>{t("footer", { year: new Date().getFullYear() })}</p>
        </div>
        <Link href="/privacy" className="rounded-sm hover:text-foreground hover:underline underline-offset-4">
          {t("privacyPolicy")}
        </Link>
      </div>
    </footer>
  )
}
