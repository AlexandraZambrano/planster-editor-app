import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTimeline } from "@/actions/studio"
import { TimelineView } from "@/components/studio/timeline/timeline-view"

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function TimelinePage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [timelineResult, chapters] = await Promise.all([
    getTimeline(bookId),
    prisma.chapter.findMany({
      where: { book: { id: bookId, authorId: session.user.id } },
      select: { id: true, title: true, order: true },
      orderBy: { order: "asc" },
    }),
  ])

  if ("error" in timelineResult) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-4 border-b flex-shrink-0">
        <Link
          href={`/write/${bookId}/studio`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Studio
        </Link>
        <h1 className="text-2xl font-bold mt-1">Timeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {timelineResult.entries.length === 0
            ? "Add your first story event to get started."
            : `${timelineResult.entries.length} event${timelineResult.entries.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <TimelineView
        bookId={bookId}
        initialEntries={timelineResult.entries}
        chapters={chapters}
      />
    </div>
  )
}
