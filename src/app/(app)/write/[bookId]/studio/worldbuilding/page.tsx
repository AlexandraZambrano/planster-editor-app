import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LocationCard } from "@/components/studio/worldbuilding/location-card"
import { NewLocationDialog } from "@/components/studio/worldbuilding/new-location-dialog"
import { ChevronLeft } from "lucide-react"

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function WorldBuildingPage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const book = await prisma.book.findFirst({
    where: { id: bookId, authorId: session.user.id },
    select: { id: true, title: true },
  })
  if (!book) notFound()

  const [locations, t] = await Promise.all([
    prisma.location.findMany({
      where: { bookId },
      select: {
        id: true,
        name: true,
        parentLocationId: true,
        images: true,
        _count: { select: { subLocations: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getTranslations("Studio"),
  ])

  // Split into top-level and sub-locations for hierarchical display
  const topLevel = locations.filter((l) => l.parentLocationId === null)
  const subMap = new Map<string, typeof locations>()
  for (const loc of locations) {
    if (loc.parentLocationId) {
      const arr = subMap.get(loc.parentLocationId) ?? []
      arr.push(loc)
      subMap.set(loc.parentLocationId, arr)
    }
  }

  const allForDialog = locations.map((l) => ({ id: l.id, name: l.name }))

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/write/${bookId}/studio`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("backToStudio")}
          </Link>
          <h1 className="text-2xl font-bold mt-1">{t("worldBuilding")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {locations.length === 0 ? t("noLocationsYet") : t("locationCount", { count: locations.length })}
          </p>
        </div>
        <NewLocationDialog bookId={bookId} locations={allForDialog} />
      </div>

      {/* Content */}
      {locations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">{t("createFirstLocation")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top-level locations */}
          {topLevel.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {topLevel.map((loc) => (
                  <div key={loc.id} className="space-y-2">
                    <LocationCard location={loc} bookId={bookId} />

                    {/* Sub-locations nested below */}
                    {(subMap.get(loc.id) ?? []).length > 0 && (
                      <div className="pl-4 space-y-2">
                        {(subMap.get(loc.id) ?? []).map((sub) => (
                          <LocationCard key={sub.id} location={sub} bookId={bookId} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orphan sub-locations (parent deleted) */}
          {locations.filter(
            (l) => l.parentLocationId !== null && !locations.find((p) => p.id === l.parentLocationId)
          ).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {t("otherLocations")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {locations
                  .filter(
                    (l) =>
                      l.parentLocationId !== null &&
                      !locations.find((p) => p.id === l.parentLocationId)
                  )
                  .map((loc) => (
                    <LocationCard key={loc.id} location={loc} bookId={bookId} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
