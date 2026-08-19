import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
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

  const [result, t] = await Promise.all([getBookNotes(bookId), getTranslations("Studio")])
  if ("error" in result) notFound()

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b shrink-0">
        <Link
          href={`/write/${bookId}/studio`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("backToStudio")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{t("freeNotes")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {result.notes.length === 0 ? t("notesHint") : t("noteCount", { count: result.notes.length })}
        </p>
      </div>

      <NotesView bookId={bookId} initialNotes={result.notes} />
    </div>
  )
}
