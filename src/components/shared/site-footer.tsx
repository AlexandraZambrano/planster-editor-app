import Link from "next/link"
import { getTranslations } from "next-intl/server"

export async function SiteFooter() {
  const t = await getTranslations("Home")

  return (
    <footer className="bg-foreground text-slate-400 text-sm text-center py-8 space-y-2">
      <p>{t("footer", { year: new Date().getFullYear() })}</p>
      <Link href="/privacy" className="inline-block hover:text-white hover:underline">
        {t("privacyPolicy")}
      </Link>
    </footer>
  )
}
