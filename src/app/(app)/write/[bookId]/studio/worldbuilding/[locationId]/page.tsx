import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LocationSheet } from "@/components/studio/worldbuilding/location-sheet"

interface Props {
  params: Promise<{ bookId: string; locationId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locationId } = await params
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true },
  })
  return { title: location?.name ?? "Location" }
}

export default async function LocationSheetPage({ params }: Props) {
  const { bookId, locationId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [location, allLocations, allCharacters] = await Promise.all([
    prisma.location.findFirst({
      where: { id: locationId, book: { authorId: session.user.id }, bookId },
      include: {
        locationCharacters: {
          include: {
            character: { select: { id: true, name: true, mainImageUrl: true } },
          },
        },
        subLocations: {
          select: { id: true, name: true, images: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.location.findMany({
      where: { bookId, book: { authorId: session.user.id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.character.findMany({
      where: { bookId, book: { authorId: session.user.id } },
      select: { id: true, name: true, mainImageUrl: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!location) notFound()

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={`/write/${bookId}/studio`} className="hover:text-foreground transition-colors">
          Studio
        </Link>
        <span>/</span>
        <Link
          href={`/write/${bookId}/studio/worldbuilding`}
          className="hover:text-foreground transition-colors"
        >
          World Building
        </Link>
        {location.parentLocationId && (
          <>
            <span>/</span>
            <Link
              href={`/write/${bookId}/studio/worldbuilding/${location.parentLocationId}`}
              className="hover:text-foreground transition-colors"
            >
              ↑ Parent
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground font-medium">{location.name}</span>
      </div>

      <LocationSheet
        bookId={bookId}
        location={{ ...location, description: location.description as object }}
        allLocations={allLocations}
        allCharacters={allCharacters}
      />
    </div>
  )
}
