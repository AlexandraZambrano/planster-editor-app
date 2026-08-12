import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { BookForm } from "@/components/book/book-form"
import { SiteNav } from "@/components/shared/site-nav"

export const metadata: Metadata = { title: "New book" }

export default async function NewBookPage() {
  const session = await auth()
  if (!session) redirect("/auth/login")

  const t = await getTranslations("Write")

  return (
    <>
      <SiteNav active="write" />
      <main className="bg-foreground min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto py-10 px-4 max-w-2xl">
          <Link
            href="/write"
            className="inline-flex items-center text-sm text-white/80 hover:text-white mb-6"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("backToMyBooks")}
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-8">{t("createNewBook")}</h1>

          <div className="bg-muted rounded-xl p-6">
            <BookForm />
          </div>
        </div>
      </main>
    </>
  )
}
