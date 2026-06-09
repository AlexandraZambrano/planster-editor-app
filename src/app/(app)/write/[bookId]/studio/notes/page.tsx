import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getBookNotes } from "@/actions/studio"
import { NotesView } from "@/components/studio/notes/notes-view"

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function NotesPage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const result = await getBookNotes(bookId)
  if ("error" in result) notFound()

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b shrink-0">
        <Link
          href={`/write/${bookId}/studio`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Studio
        </Link>
        <h1 className="text-2xl font-bold mt-1">Notes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {result.notes.length === 0
            ? "Your private scratch pad for ideas, research, and anything else."
            : `${result.notes.length} note${result.notes.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <NotesView bookId={bookId} initialNotes={result.notes} />
    </div>
  )
}
