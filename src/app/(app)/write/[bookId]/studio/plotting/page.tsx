import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
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

  const [result, t] = await Promise.all([getPlottingBoard(bookId), getTranslations("Studio")])
  if ("error" in result) notFound()

  const { chapters, characters, locations } = result

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-4 border-b flex-shrink-0">
        <Link
          href={`/write/${bookId}/studio`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("backToStudio")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{t("plotting")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {chapters.length === 0 ? t("addChaptersToStartPlotting") : t("chapterCount", { count: chapters.length })}
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
