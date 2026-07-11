import { notFound, redirect } from "next/navigation"
import Link from "next/link"
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

  const result = await getGoalsDashboard(bookId)
  if ("error" in result) notFound()

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link
          href={`/write/${bookId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Book panel
        </Link>
        <h1 className="text-2xl font-bold mt-1">Writing Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track your progress and stay on target. Streak timezone: UTC.
        </p>
      </div>

      <GoalsView bookId={bookId} dashboard={result} />
    </div>
  )
}
