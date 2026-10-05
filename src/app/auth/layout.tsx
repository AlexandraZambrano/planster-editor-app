import type { Metadata } from "next"
import Link from "next/link"
import { X } from "lucide-react"
import { getTranslations } from "next-intl/server"

export const metadata: Metadata = {
  title: {
    template: "%s — Planster",
    default: "Planster",
  },
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Common")

  return (
    <div className="flex-1 flex items-center justify-center bg-secondary/60 px-4 py-12">
      <div className="relative w-full max-w-sm bg-card rounded-3xl border shadow-lift p-8">
        <Link
          href="/"
          aria-label={t("close")}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Link>
        {children}
      </div>
    </div>
  )
}
