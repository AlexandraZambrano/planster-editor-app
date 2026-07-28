import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { getGoalsDashboard } from "@/actions/goals"
import { GoalsView } from "@/components/goals/goals-view"

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function GoalsPage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [result, t] = await Promise.all([getGoalsDashboard(bookId), getTranslations("Goals")])
  if ("error" in result) notFound()

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link
          href={`/write/${bookId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("backToBookPanel")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
      </div>

      <GoalsView bookId={bookId} dashboard={result} />
    </div>
  )
}
