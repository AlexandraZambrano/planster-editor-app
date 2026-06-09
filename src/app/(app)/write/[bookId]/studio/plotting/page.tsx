import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getPlottingBoard } from "@/actions/studio"
import { PlottingBoard } from "@/components/studio/plotting/plotting-board"

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function PlottingPage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const result = await getPlottingBoard(bookId)
  if ("error" in result) notFound()

  const { chapters, characters, locations } = result

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-4 border-b flex-shrink-0">
        <Link
          href={`/write/${bookId}/studio`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Studio
        </Link>
        <h1 className="text-2xl font-bold mt-1">Plotting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {chapters.length === 0
            ? "Add chapters to start plotting."
            : `${chapters.length} chapter${chapters.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <PlottingBoard
        bookId={bookId}
        initialChapters={chapters}
        characters={characters}
        locations={locations}
      />
    </div>
  )
}
