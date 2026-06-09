import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CharacterCard } from "@/components/studio/characters/character-card"
import { NewCharacterDialog } from "@/components/studio/characters/new-character-dialog"

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function CharactersPage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const book = await prisma.book.findFirst({
    where: { id: bookId, authorId: session.user.id },
    select: { id: true, title: true },
  })
  if (!book) notFound()

  const characters = await prisma.character.findMany({
    where: { bookId },
    select: {
      id: true,
      name: true,
      nickname: true,
      mainImageUrl: true,
      storyRole: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/write/${bookId}/studio`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Studio
          </Link>
          <h1 className="text-2xl font-bold mt-1">Characters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {characters.length === 0
              ? "No characters yet."
              : `${characters.length} character${characters.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <NewCharacterDialog bookId={bookId} />
      </div>

      {/* Grid */}
      {characters.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {characters.map((c) => (
            <CharacterCard key={c.id} character={c} bookId={bookId} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">Create your first character to get started.</p>
        </div>
      )}
    </div>
  )
}
