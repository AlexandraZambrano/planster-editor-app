import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ChevronLeft } from "lucide-react"
import { getBoards, getBoardData } from "@/actions/studio"
import { BoardView } from "@/components/studio/board/board-view"

interface Props {
  params: Promise<{ bookId: string }>
  searchParams: Promise<{ boardId?: string }>
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { bookId } = await params
  const { boardId: qBoardId } = await searchParams

  const session = await auth()
  if (!session) redirect("/auth/login")

  const [boardsResult, t] = await Promise.all([getBoards(bookId), getTranslations("Studio")])
  if ("error" in boardsResult) notFound()

  const { boards } = boardsResult

  // Resolve active board: use query param if valid, else first board
  const activeBoardId = boards.find((b) => b.id === qBoardId)?.id ?? boards[0]?.id ?? ""

  const [characters, locations] = await Promise.all([
    prisma.character.findMany({
      where: { book: { id: bookId, authorId: session.user.id } },
      select: { id: true, name: true, mainImageUrl: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.location.findMany({
      where: { book: { id: bookId, authorId: session.user.id } },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Fetch active board data if a board exists
  let initialElements = []
  let initialConnections = []
  let characterLinks = []

  if (activeBoardId) {
    const boardData = await getBoardData(activeBoardId, bookId)
    if ("error" in boardData) notFound()
    initialElements = boardData.elements
    initialConnections = boardData.connections
    characterLinks = boardData.characterLinks
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b flex-shrink-0">
        <Link
          href={`/write/${bookId}/studio`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("backToStudio")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{t("board")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("boardHint")}
        </p>
      </div>

      <BoardView
        bookId={bookId}
        boards={boards}
        activeBoardId={activeBoardId}
        initialElements={initialElements}
        initialConnections={initialConnections}
        characterLinks={characterLinks}
        characters={characters}
        locations={locations}
      />
    </div>
  )
}
