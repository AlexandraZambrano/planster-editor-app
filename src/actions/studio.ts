"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { StoryRole, RelationshipType, BoardElementType, Prisma } from "@prisma/client"

// ── Location helpers ───────────────────────────────────────────────────────────

async function getLocationForAuthor(locationId: string, userId: string) {
  return prisma.location.findFirst({
    where: { id: locationId, book: { authorId: userId } },
    select: { id: true, bookId: true },
  })
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getBookForAuthor(bookId: string, userId: string) {
  return prisma.book.findFirst({
    where: { id: bookId, authorId: userId },
    select: { id: true },
  })
}

async function getCharacterForAuthor(characterId: string, userId: string) {
  return prisma.character.findFirst({
    where: { id: characterId, book: { authorId: userId } },
    select: { id: true, bookId: true },
  })
}

// ── Characters ────────────────────────────────────────────────────────────────

export async function getCharacters(bookId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

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

  return { characters }
}

export async function createCharacter(bookId: string, name: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  if (!name.trim()) return { error: "Name is required" as const }

  const character = await prisma.character.create({
    data: { bookId, name: name.trim(), backstory: {} },
  })

  revalidatePath(`/write/${bookId}/studio/characters`)
  return { characterId: character.id }
}

export type CharacterUpdateFields = {
  name?: string
  nickname?: string | null
  age?: number | null
  birthDate?: string | null
  height?: string | null
  weight?: string | null
  build?: string | null
  eyeColor?: string | null
  hairColor?: string | null
  hairStyle?: string | null
  facialFeatures?: string | null
  tattoos?: string | null
  dressingStyle?: string | null
  physicalNotes?: string | null
  storyRole?: StoryRole
  storyRoleNote?: string | null
  shortTermGoals?: string | null
  longTermGoals?: string | null
}

export async function updateCharacter(
  characterId: string,
  data: CharacterUpdateFields
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const character = await getCharacterForAuthor(characterId, session.user.id)
  if (!character) return { error: "Not found" as const }

  if (data.name !== undefined && !data.name.trim())
    return { error: "Name cannot be empty" as const }

  await prisma.character.update({
    where: { id: characterId },
    data: { ...data, name: data.name?.trim() },
  })

  revalidatePath(`/write/${character.bookId}/studio/characters`)
  revalidatePath(`/write/${character.bookId}/studio/characters/${characterId}`)
  return { success: true as const }
}

export async function deleteCharacter(characterId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const character = await getCharacterForAuthor(characterId, session.user.id)
  if (!character) return { error: "Not found" as const }

  await prisma.character.delete({ where: { id: characterId } })

  revalidatePath(`/write/${character.bookId}/studio/characters`)
  return { success: true as const }
}

export async function saveCharacterBackstory(
  characterId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const character = await getCharacterForAuthor(characterId, session.user.id)
  if (!character) return { error: "Not found" as const }

  const plainContent = JSON.parse(JSON.stringify(content))
  await prisma.character.update({
    where: { id: characterId },
    data: { backstory: plainContent },
  })

  return { success: true as const }
}

export async function setCharacterMainImage(characterId: string, url: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const character = await getCharacterForAuthor(characterId, session.user.id)
  if (!character) return { error: "Not found" as const }

  await prisma.character.update({
    where: { id: characterId },
    data: { mainImageUrl: url },
  })

  revalidatePath(`/write/${character.bookId}/studio/characters`)
  revalidatePath(`/write/${character.bookId}/studio/characters/${characterId}`)
  return { success: true as const }
}

export async function addToCharacterGallery(characterId: string, url: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const character = await getCharacterForAuthor(characterId, session.user.id)
  if (!character) return { error: "Not found" as const }

  const current = await prisma.character.findUnique({
    where: { id: characterId },
    select: { gallery: true },
  })
  if (!current) return { error: "Not found" as const }
  if (current.gallery.length >= 10) return { error: "Gallery full (max 10)" as const }

  await prisma.character.update({
    where: { id: characterId },
    data: { gallery: { push: url } },
  })

  return { success: true as const }
}

export async function removeFromCharacterGallery(characterId: string, url: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const character = await getCharacterForAuthor(characterId, session.user.id)
  if (!character) return { error: "Not found" as const }

  const current = await prisma.character.findUnique({
    where: { id: characterId },
    select: { gallery: true },
  })
  if (!current) return { error: "Not found" as const }

  await prisma.character.update({
    where: { id: characterId },
    data: { gallery: current.gallery.filter((g) => g !== url) },
  })

  return { success: true as const }
}

// ── Character with links ──────────────────────────────────────────────────────

export type CharacterLink = {
  id: string
  otherId: string
  otherName: string
  otherImageUrl: string | null
  relationshipType: RelationshipType
  note: string | null
}

export async function getCharacterWithLinks(characterId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const character = await prisma.character.findFirst({
    where: { id: characterId, book: { authorId: session.user.id } },
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
  })

  if (!character) return { error: "Not found" as const }

  // Normalise — always expose the "other" character regardless of link direction
  const links: CharacterLink[] = [
    ...character.linksFrom.map((l) => ({
      id: l.id,
      otherId: l.characterBId,
      otherName: l.characterB.name,
      otherImageUrl: l.characterB.mainImageUrl,
      relationshipType: l.relationshipType,
      note: l.note,
    })),
    ...character.linksTo.map((l) => ({
      id: l.id,
      otherId: l.characterAId,
      otherName: l.characterA.name,
      otherImageUrl: l.characterA.mainImageUrl,
      relationshipType: l.relationshipType,
      note: l.note,
    })),
  ]

  const { linksFrom: _f, linksTo: _t, ...rest } = character
  return { character: { ...rest, links } }
}

export async function addCharacterLink(
  bookId: string,
  characterAId: string,
  characterBId: string,
  relationshipType: RelationshipType,
  note?: string
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  if (characterAId === characterBId)
    return { error: "Cannot link a character to themselves" as const }

  const [charA, charB] = await Promise.all([
    prisma.character.findFirst({ where: { id: characterAId, bookId }, select: { id: true } }),
    prisma.character.findFirst({ where: { id: characterBId, bookId }, select: { id: true } }),
  ])
  if (!charA || !charB) return { error: "Character not found" as const }

  const existing = await prisma.characterLink.findFirst({
    where: {
      OR: [
        { characterAId, characterBId },
        { characterAId: characterBId, characterBId: characterAId },
      ],
    },
  })
  if (existing) return { error: "Link already exists" as const }

  await prisma.characterLink.create({
    data: { characterAId, characterBId, relationshipType, note: note || null },
  })

  revalidatePath(`/write/${bookId}/studio/characters/${characterAId}`)
  revalidatePath(`/write/${bookId}/studio/characters/${characterBId}`)
  return { success: true as const }
}

export async function deleteCharacterLink(linkId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const link = await prisma.characterLink.findUnique({
    where: { id: linkId },
    select: {
      characterAId: true,
      characterBId: true,
      characterA: { select: { book: { select: { id: true, authorId: true } } } },
    },
  })

  if (!link || link.characterA.book.authorId !== session.user.id)
    return { error: "Not found" as const }

  await prisma.characterLink.delete({ where: { id: linkId } })

  const bookId = link.characterA.book.id
  revalidatePath(`/write/${bookId}/studio/characters/${link.characterAId}`)
  revalidatePath(`/write/${bookId}/studio/characters/${link.characterBId}`)
  return { success: true as const }
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function getLocations(bookId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  const locations = await prisma.location.findMany({
    where: { bookId },
    select: {
      id: true,
      name: true,
      parentLocationId: true,
      images: true,
      _count: { select: { subLocations: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return { locations }
}

export async function createLocation(
  bookId: string,
  name: string,
  parentLocationId?: string | null
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  if (!name.trim()) return { error: "Name is required" as const }

  if (parentLocationId) {
    const parent = await prisma.location.findFirst({
      where: { id: parentLocationId, bookId },
      select: { id: true },
    })
    if (!parent) return { error: "Parent location not found" as const }
  }

  const location = await prisma.location.create({
    data: {
      bookId,
      name: name.trim(),
      description: {},
      parentLocationId: parentLocationId ?? null,
    },
  })

  revalidatePath(`/write/${bookId}/studio/worldbuilding`)
  return { locationId: location.id }
}

export type LocationUpdateFields = {
  name?: string
  parentLocationId?: string | null
}

export async function updateLocation(
  locationId: string,
  data: LocationUpdateFields
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const location = await getLocationForAuthor(locationId, session.user.id)
  if (!location) return { error: "Not found" as const }

  if (data.name !== undefined && !data.name.trim())
    return { error: "Name cannot be empty" as const }

  if (data.parentLocationId === locationId)
    return { error: "Cannot set location as its own parent" as const }

  await prisma.location.update({
    where: { id: locationId },
    data: { ...data, name: data.name?.trim() },
  })

  revalidatePath(`/write/${location.bookId}/studio/worldbuilding`)
  revalidatePath(`/write/${location.bookId}/studio/worldbuilding/${locationId}`)
  return { success: true as const }
}

export async function deleteLocation(locationId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const location = await getLocationForAuthor(locationId, session.user.id)
  if (!location) return { error: "Not found" as const }

  await prisma.location.delete({ where: { id: locationId } })

  revalidatePath(`/write/${location.bookId}/studio/worldbuilding`)
  return { success: true as const }
}

export async function saveLocationDescription(
  locationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const location = await getLocationForAuthor(locationId, session.user.id)
  if (!location) return { error: "Not found" as const }

  const plainContent = JSON.parse(JSON.stringify(content))
  await prisma.location.update({
    where: { id: locationId },
    data: { description: plainContent },
  })

  return { success: true as const }
}

export async function addToLocationGallery(locationId: string, url: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const location = await getLocationForAuthor(locationId, session.user.id)
  if (!location) return { error: "Not found" as const }

  const current = await prisma.location.findUnique({
    where: { id: locationId },
    select: { images: true },
  })
  if (!current) return { error: "Not found" as const }
  if (current.images.length >= 10) return { error: "Gallery full (max 10)" as const }

  await prisma.location.update({
    where: { id: locationId },
    data: { images: { push: url } },
  })

  return { success: true as const }
}

export async function removeFromLocationGallery(locationId: string, url: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const location = await getLocationForAuthor(locationId, session.user.id)
  if (!location) return { error: "Not found" as const }

  const current = await prisma.location.findUnique({
    where: { id: locationId },
    select: { images: true },
  })
  if (!current) return { error: "Not found" as const }

  await prisma.location.update({
    where: { id: locationId },
    data: { images: current.images.filter((i) => i !== url) },
  })

  return { success: true as const }
}

export async function addLocationCharacter(
  locationId: string,
  characterId: string,
  note?: string
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const location = await getLocationForAuthor(locationId, session.user.id)
  if (!location) return { error: "Not found" as const }

  const character = await prisma.character.findFirst({
    where: { id: characterId, bookId: location.bookId },
    select: { id: true },
  })
  if (!character) return { error: "Character not found" as const }

  const existing = await prisma.locationCharacter.findUnique({
    where: { locationId_characterId: { locationId, characterId } },
  })
  if (existing) return { error: "Character already linked" as const }

  await prisma.locationCharacter.create({
    data: { locationId, characterId, note: note || null },
  })

  revalidatePath(`/write/${location.bookId}/studio/worldbuilding/${locationId}`)
  return { success: true as const }
}

export async function removeLocationCharacter(
  locationId: string,
  characterId: string
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const location = await getLocationForAuthor(locationId, session.user.id)
  if (!location) return { error: "Not found" as const }

  await prisma.locationCharacter.delete({
    where: { locationId_characterId: { locationId, characterId } },
  })

  revalidatePath(`/write/${location.bookId}/studio/worldbuilding/${locationId}`)
  return { success: true as const }
}

// ── Plotting helpers ──────────────────────────────────────────────────────────

async function getChapterForAuthorPlotting(chapterId: string, userId: string) {
  return prisma.chapter.findFirst({
    where: { id: chapterId, book: { authorId: userId } },
    select: { id: true, bookId: true },
  })
}

async function getPlotNoteByIdWithAuthor(plotNoteId: string, userId: string) {
  return prisma.plotNote.findFirst({
    where: {
      id: plotNoteId,
      chapter: { book: { authorId: userId } },
    },
    select: {
      id: true,
      chapterId: true,
      chapter: { select: { bookId: true } },
      _count: { select: { scenes: true } },
    },
  })
}

async function getSceneForAuthor(sceneId: string, userId: string) {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: {
      id: true,
      plotNoteId: true,
      order: true,
      plotNote: {
        select: {
          chapter: {
            select: {
              bookId: true,
              book: { select: { authorId: true } },
            },
          },
        },
      },
    },
  })
  if (!scene || scene.plotNote.chapter.book.authorId !== userId) return null
  return {
    id: scene.id,
    plotNoteId: scene.plotNoteId,
    order: scene.order,
    bookId: scene.plotNote.chapter.bookId,
  }
}

// ── Plotting ──────────────────────────────────────────────────────────────────

export async function getPlottingBoard(bookId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  const [chapters, characters, locations] = await Promise.all([
    prisma.chapter.findMany({
      where: { bookId },
      select: {
        id: true,
        title: true,
        order: true,
        plotNote: {
          select: {
            id: true,
            notes: true,
            scenes: {
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                characterIds: true,
                locationId: true,
                location: { select: { id: true, name: true } },
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    }),
    prisma.character.findMany({
      where: { bookId },
      select: { id: true, name: true, mainImageUrl: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { bookId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return {
    chapters: chapters.map((chapter) => ({
      ...chapter,
      plotNote: chapter.plotNote
        ? { ...chapter.plotNote, notes: chapter.plotNote.notes as object }
        : null,
    })),
    characters,
    locations,
  }
}

export async function savePlotNoteNotes(
  chapterId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const chapter = await getChapterForAuthorPlotting(chapterId, session.user.id)
  if (!chapter) return { error: "Not found" as const }

  const plainContent = JSON.parse(JSON.stringify(content))
  await prisma.plotNote.upsert({
    where: { chapterId },
    create: { chapterId, notes: plainContent },
    update: { notes: plainContent },
  })

  return { success: true as const }
}

export type SceneUpdateFields = {
  title?: string
  description?: string | null
  characterIds?: string[]
  locationId?: string | null
}

export async function createScene(
  plotNoteId: string,
  title: string,
  description?: string,
  characterIds?: string[],
  locationId?: string | null
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const plotNote = await getPlotNoteByIdWithAuthor(plotNoteId, session.user.id)
  if (!plotNote) return { error: "Not found" as const }

  if (!title.trim()) return { error: "Title is required" as const }

  const scene = await prisma.scene.create({
    data: {
      plotNoteId,
      title: title.trim(),
      description: description?.trim() || null,
      characterIds: characterIds ?? [],
      locationId: locationId ?? null,
      order: plotNote._count.scenes + 1,
    },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      characterIds: true,
      locationId: true,
      location: { select: { id: true, name: true } },
    },
  })

  revalidatePath(`/write/${plotNote.chapter.bookId}/studio/plotting`)
  return { scene }
}

export async function updateScene(sceneId: string, data: SceneUpdateFields) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const scene = await getSceneForAuthor(sceneId, session.user.id)
  if (!scene) return { error: "Not found" as const }

  if (data.title !== undefined && !data.title.trim())
    return { error: "Title cannot be empty" as const }

  await prisma.scene.update({
    where: { id: sceneId },
    data: { ...data, title: data.title?.trim() },
  })

  revalidatePath(`/write/${scene.bookId}/studio/plotting`)
  return { success: true as const }
}

export async function deleteScene(sceneId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const scene = await getSceneForAuthor(sceneId, session.user.id)
  if (!scene) return { error: "Not found" as const }

  await prisma.$transaction([
    prisma.scene.delete({ where: { id: sceneId } }),
    prisma.scene.updateMany({
      where: { plotNoteId: scene.plotNoteId, order: { gt: scene.order } },
      data: { order: { decrement: 1 } },
    }),
  ])

  revalidatePath(`/write/${scene.bookId}/studio/plotting`)
  return { success: true as const }
}

export async function reorderScenes(plotNoteId: string, orderedIds: string[]) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const plotNote = await getPlotNoteByIdWithAuthor(plotNoteId, session.user.id)
  if (!plotNote) return { error: "Not found" as const }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.scene.update({ where: { id }, data: { order: index + 1 } })
    )
  )

  revalidatePath(`/write/${plotNote.chapter.bookId}/studio/plotting`)
  return { success: true as const }
}

// ── Timeline ──────────────────────────────────────────────────────────────────

async function getTimelineEntryForAuthor(entryId: string, userId: string) {
  return prisma.timelineEntry.findFirst({
    where: { id: entryId, book: { authorId: userId } },
    select: { id: true, bookId: true },
  })
}

export async function getTimeline(bookId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  const entries = await prisma.timelineEntry.findMany({
    where: { bookId },
    select: {
      id: true,
      title: true,
      moment: true,
      description: true,
      color: true,
      order: true,
      chapterId: true,
      chapter: { select: { id: true, title: true } },
    },
    orderBy: { order: "asc" },
  })

  return { entries }
}

export type TimelineEntryInput = {
  title: string
  moment: string
  description?: string | null
  color?: string
  chapterId?: string | null
}

export async function createTimelineEntry(bookId: string, data: TimelineEntryInput) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  if (!data.title.trim()) return { error: "Title is required" as const }
  if (!data.moment.trim()) return { error: "Moment is required" as const }

  const count = await prisma.timelineEntry.count({ where: { bookId } })

  const entry = await prisma.timelineEntry.create({
    data: {
      bookId,
      title: data.title.trim(),
      moment: data.moment.trim(),
      description: data.description?.trim() || null,
      color: data.color ?? "#6b3fa0",
      chapterId: data.chapterId ?? null,
      order: count + 1,
    },
    select: {
      id: true,
      title: true,
      moment: true,
      description: true,
      color: true,
      order: true,
      chapterId: true,
      chapter: { select: { id: true, title: true } },
    },
  })

  revalidatePath(`/write/${bookId}/studio/timeline`)
  return { entry }
}

export type TimelineEntryUpdateInput = {
  title?: string
  moment?: string
  description?: string | null
  color?: string
  chapterId?: string | null
}

export async function updateTimelineEntry(
  entryId: string,
  data: TimelineEntryUpdateInput
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const entry = await getTimelineEntryForAuthor(entryId, session.user.id)
  if (!entry) return { error: "Not found" as const }

  if (data.title !== undefined && !data.title.trim())
    return { error: "Title cannot be empty" as const }
  if (data.moment !== undefined && !data.moment.trim())
    return { error: "Moment cannot be empty" as const }

  await prisma.timelineEntry.update({
    where: { id: entryId },
    data: {
      ...data,
      title: data.title?.trim(),
      moment: data.moment?.trim(),
    },
  })

  revalidatePath(`/write/${entry.bookId}/studio/timeline`)
  return { success: true as const }
}

export async function deleteTimelineEntry(entryId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const entry = await getTimelineEntryForAuthor(entryId, session.user.id)
  if (!entry) return { error: "Not found" as const }

  await prisma.timelineEntry.delete({ where: { id: entryId } })

  revalidatePath(`/write/${entry.bookId}/studio/timeline`)
  return { success: true as const }
}

export async function reorderTimelineEntries(bookId: string, orderedIds: string[]) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.timelineEntry.update({ where: { id }, data: { order: index + 1 } })
    )
  )

  revalidatePath(`/write/${bookId}/studio/timeline`)
  return { success: true as const }
}

// ── Board ─────────────────────────────────────────────────────────────────────

async function getBoardForAuthor(boardId: string, userId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, book: { authorId: userId } },
    select: { id: true, bookId: true },
  })
}

async function getBoardElementForAuthor(elementId: string, userId: string) {
  return prisma.boardElement.findFirst({
    where: { id: elementId, board: { book: { authorId: userId } } },
    select: { id: true, boardId: true, board: { select: { bookId: true } } },
  })
}

export async function getBoards(bookId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  const boards = await prisma.board.findMany({
    where: { bookId },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  return { boards }
}

export async function createBoard(bookId: string, name: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  if (!name.trim()) return { error: "Name is required" as const }

  const board = await prisma.board.create({
    data: { bookId, name: name.trim() },
    select: { id: true, name: true, createdAt: true },
  })

  revalidatePath(`/write/${bookId}/studio/board`)
  return { board }
}

export async function deleteBoard(boardId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const board = await getBoardForAuthor(boardId, session.user.id)
  if (!board) return { error: "Not found" as const }

  await prisma.board.delete({ where: { id: boardId } })

  revalidatePath(`/write/${board.bookId}/studio/board`)
  return { success: true as const }
}

export type BoardElementData = {
  id: string
  type: BoardElementType
  characterId: string | null
  locationId: string | null
  posX: number
  posY: number
  content: Record<string, unknown>
  character: { id: string; name: string; mainImageUrl: string | null; storyRole: string } | null
  location: { id: string; name: string; images: string[] } | null
}

export type BoardConnectionData = {
  id: string
  fromElementId: string
  toElementId: string
  label: string | null
  color: string
  isAutomatic: boolean
}

export type CharacterLinkData = {
  id: string
  characterAId: string
  characterBId: string
  relationshipType: RelationshipType
  note: string | null
}

export async function getBoardData(boardId: string, bookId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  const board = await prisma.board.findFirst({
    where: { id: boardId, bookId },
    select: {
      id: true,
      name: true,
      elements: {
        select: {
          id: true,
          type: true,
          characterId: true,
          locationId: true,
          posX: true,
          posY: true,
          content: true,
          character: {
            select: { id: true, name: true, mainImageUrl: true, storyRole: true },
          },
          location: {
            select: { id: true, name: true, images: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      connections: {
        select: {
          id: true,
          fromElementId: true,
          toElementId: true,
          label: true,
          color: true,
          isAutomatic: true,
        },
      },
    },
  })

  if (!board) return { error: "Not found" as const }

  const characterLinks = await prisma.characterLink.findMany({
    where: { characterA: { bookId } },
    select: {
      id: true,
      characterAId: true,
      characterBId: true,
      relationshipType: true,
      note: true,
    },
  })

  return {
    board: { id: board.id, name: board.name },
    elements: board.elements.map((el) => ({
      ...el,
      content: el.content as Record<string, unknown>,
    })) as BoardElementData[],
    connections: board.connections as BoardConnectionData[],
    characterLinks: characterLinks as CharacterLinkData[],
  }
}

export async function addBoardElement(
  boardId: string,
  type: BoardElementType,
  referenceId?: string | null,
  content?: Prisma.InputJsonValue,
  posX?: number,
  posY?: number
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const board = await getBoardForAuthor(boardId, session.user.id)
  if (!board) return { error: "Not found" as const }

  const element = await prisma.boardElement.create({
    data: {
      boardId,
      type,
      characterId: type === "CHARACTER" ? (referenceId ?? null) : null,
      locationId: type === "LOCATION" ? (referenceId ?? null) : null,
      content: content ?? {},
      posX: posX ?? 100,
      posY: posY ?? 100,
    },
    select: {
      id: true,
      type: true,
      characterId: true,
      locationId: true,
      posX: true,
      posY: true,
      content: true,
      character: {
        select: { id: true, name: true, mainImageUrl: true, storyRole: true },
      },
      location: {
        select: { id: true, name: true, images: true },
      },
    },
  })

  return {
    element: { ...element, content: element.content as Record<string, unknown> } as BoardElementData,
  }
}

export async function saveBoardElementPosition(elementId: string, x: number, y: number) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const element = await getBoardElementForAuthor(elementId, session.user.id)
  if (!element) return { error: "Not found" as const }

  await prisma.boardElement.update({
    where: { id: elementId },
    data: { posX: x, posY: y },
  })

  return { success: true as const }
}

export async function updateBoardElementContent(
  elementId: string,
  content: Record<string, unknown>
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const element = await getBoardElementForAuthor(elementId, session.user.id)
  if (!element) return { error: "Not found" as const }

  await prisma.boardElement.update({
    where: { id: elementId },
    data: { content: JSON.parse(JSON.stringify(content)) },
  })

  return { success: true as const }
}

export async function deleteBoardElement(elementId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const element = await getBoardElementForAuthor(elementId, session.user.id)
  if (!element) return { error: "Not found" as const }

  await prisma.boardElement.delete({ where: { id: elementId } })

  revalidatePath(`/write/${element.board.bookId}/studio/board`)
  return { success: true as const }
}

export async function addBoardConnection(
  boardId: string,
  fromElementId: string,
  toElementId: string,
  label?: string,
  color?: string
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const board = await getBoardForAuthor(boardId, session.user.id)
  if (!board) return { error: "Not found" as const }

  const connection = await prisma.boardConnection.create({
    data: {
      boardId,
      fromElementId,
      toElementId,
      label: label ?? null,
      color: color ?? "#6b3fa0",
      isAutomatic: false,
    },
    select: {
      id: true,
      fromElementId: true,
      toElementId: true,
      label: true,
      color: true,
      isAutomatic: true,
    },
  })

  return { connection }
}

export async function deleteBoardConnection(connectionId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const connection = await prisma.boardConnection.findFirst({
    where: {
      id: connectionId,
      board: { book: { authorId: session.user.id } },
    },
    select: { id: true, board: { select: { bookId: true } } },
  })

  if (!connection) return { error: "Not found" as const }

  await prisma.boardConnection.delete({ where: { id: connectionId } })

  revalidatePath(`/write/${connection.board.bookId}/studio/board`)
  return { success: true as const }
}

// ── Book Notes ────────────────────────────────────────────────────────────────

async function getBookNoteForAuthor(noteId: string, userId: string) {
  return prisma.bookNote.findFirst({
    where: { id: noteId, book: { authorId: userId } },
    select: { id: true, bookId: true },
  })
}

export type BookNoteData = {
  id: string
  title: string
  content: Record<string, unknown>
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export async function getBookNotes(bookId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  const notes = await prisma.bookNote.findMany({
    where: { bookId },
    select: {
      id: true,
      title: true,
      content: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  return { notes: notes.map((n) => ({ ...n, content: n.content as Record<string, unknown> })) as BookNoteData[] }
}

export async function createBookNote(bookId: string, title: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const book = await getBookForAuthor(bookId, session.user.id)
  if (!book) return { error: "Not found" as const }

  if (!title.trim()) return { error: "Title is required" as const }

  const note = await prisma.bookNote.create({
    data: { bookId, title: title.trim(), content: {}, tags: [] },
    select: {
      id: true,
      title: true,
      content: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  revalidatePath(`/write/${bookId}/studio/notes`)
  return { note: { ...note, content: note.content as Record<string, unknown> } as BookNoteData }
}

export async function updateBookNote(
  noteId: string,
  data: Partial<{ title: string; content: object; tags: string[] }>
) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const note = await getBookNoteForAuthor(noteId, session.user.id)
  if (!note) return { error: "Not found" as const }

  if ("title" in data && data.title !== undefined && !data.title.trim()) {
    return { error: "Title is required" as const }
  }

  await prisma.bookNote.update({
    where: { id: noteId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.tags !== undefined && { tags: data.tags }),
    },
  })

  return { success: true as const }
}

export async function deleteBookNote(noteId: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" as const }

  const note = await getBookNoteForAuthor(noteId, session.user.id)
  if (!note) return { error: "Not found" as const }

  await prisma.bookNote.delete({ where: { id: noteId } })

  revalidatePath(`/write/${note.bookId}/studio/notes`)
  return { success: true as const }
}
