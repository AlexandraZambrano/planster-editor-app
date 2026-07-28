import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CharacterSheet } from "@/components/studio/characters/character-sheet"
import type { CharacterLink } from "@/actions/studio"
import type { RelationshipType } from "@prisma/client"

interface Props {
  params: Promise<{ bookId: string; characterId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { characterId } = await params
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true },
  })
  return { title: character?.name ?? "Character" }
}

export default async function CharacterSheetPage({ params }: Props) {
  const { bookId, characterId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [character, otherCharacters] = await Promise.all([
    prisma.character.findFirst({
      where: { id: characterId, book: { authorId: session.user.id }, bookId },
      include: {
        linksFrom: {
          include: {
            characterB: { select: { id: true, name: true, mainImageUrl: true } },
          },
        },
        linksTo: {
          include: {
            characterA: { select: { id: true, name: true, mainImageUrl: true } },
          },
        },
      },
    }),
    prisma.character.findMany({
      where: { bookId, book: { authorId: session.user.id }, NOT: { id: characterId } },
      select: { id: true, name: true, mainImageUrl: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!character) notFound()

  // Normalise links so the component receives a flat list
  const links: CharacterLink[] = [
    ...character.linksFrom.map((l) => ({
      id: l.id,
      otherId: l.characterBId,
      otherName: l.characterB.name,
      otherImageUrl: l.characterB.mainImageUrl,
      relationshipType: l.relationshipType as RelationshipType,
      note: l.note,
    })),
    ...character.linksTo.map((l) => ({
      id: l.id,
      otherId: l.characterAId,
      otherName: l.characterA.name,
      otherImageUrl: l.characterA.mainImageUrl,
      relationshipType: l.relationshipType as RelationshipType,
      note: l.note,
    })),
  ]

  const { linksFrom: _f, linksTo: _t, ...characterData } = character

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={`/write/${bookId}/studio`} className="hover:text-foreground transition-colors">
          Studio
        </Link>
        <span>/</span>
        <Link
          href={`/write/${bookId}/studio/characters`}
          className="hover:text-foreground transition-colors"
        >
          Characters
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{character.name}</span>
      </div>

      <CharacterSheet
        bookId={bookId}
        character={{ ...characterData, links, backstory: characterData.backstory as object }}
        otherCharacters={otherCharacters}
      />
    </div>
  )
}
