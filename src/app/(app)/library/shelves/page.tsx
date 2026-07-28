import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { getUserShelves } from "@/actions/library"
import { ShelfList } from "@/components/library/shelf-list"
import { SiteNav } from "@/components/shared/site-nav"

export const metadata: Metadata = { title: "Manage shelves" }

export default async function ShelvesPage() {
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [{ shelves = [] }, t] = await Promise.all([getUserShelves(), getTranslations("Library")])

  return (
    <>
      <SiteNav active="library" />
      <main className="container mx-auto py-10 px-4 max-w-2xl">
        <Link
          href="/library"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("title")}
        </Link>

        <h1 className="text-2xl font-bold mb-8">{t("manageShelves")}</h1>

        <ShelfList initialShelves={shelves} />
      </main>
    </>
  )
}
