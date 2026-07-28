import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  saveCharacterBackstory,
  setCharacterMainImage,
  addToCharacterGallery,
  removeFromCharacterGallery,
  getCharacterWithLinks,
  addCharacterLink,
  deleteCharacterLink,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  saveLocationDescription,
  addToLocationGallery,
  removeFromLocationGallery,
  addLocationCharacter,
  removeLocationCharacter,
  getPlottingBoard,
  savePlotNoteNotes,
  createScene,
  updateScene,
  deleteScene,
  reorderScenes,
  getTimeline,
  createTimelineEntry,
  updateTimelineEntry,
  deleteTimelineEntry,
  reorderTimelineEntries,
  getBoards,
  createBoard,
  deleteBoard,
  getBoardData,
  addBoardElement,
  saveBoardElementPosition,
  updateBoardElementContent,
  deleteBoardElement,
  addBoardConnection,
  deleteBoardConnection,
  getBookNotes,
  createBookNote,
  updateBookNote,
  deleteBookNote,
} from "./studio"

// ── Auth mock ──────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user1", email: "a@b.com" } }),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

function resetMocks() {
  Object.values(db).forEach((model) => {
    if (typeof model === "object") {
      Object.values(model).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) fn.mockReset()
      })
    }
  })
}

beforeEach(resetMocks)

// ── Helpers ────────────────────────────────────────────────────────────────

const BOOK = { id: "book1" }
const CHAR = { id: "char1", bookId: "book1" }
const CHAR_FULL = {
  id: "char1",
  name: "Aria",
  bookId: "book1",
  linksFrom: [],
  linksTo: [],
}

// ── getCharacters ──────────────────────────────────────────────────────────

describe("getCharacters", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getCharacters("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getCharacters("book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns characters list", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.character.findMany.mockResolvedValueOnce([
      { id: "c1", name: "Aria", nickname: null, mainImageUrl: null, storyRole: "PROTAGONIST" },
    ])
    const result = await getCharacters("book1")
    expect(result).toEqual({
      characters: [
        { id: "c1", name: "Aria", nickname: null, mainImageUrl: null, storyRole: "PROTAGONIST" },
      ],
    })
  })
})

// ── createCharacter ────────────────────────────────────────────────────────

describe("createCharacter", () => {
  it("rejects empty name", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    const result = await createCharacter("book1", "   ")
    expect(result).toEqual({ error: "Name is required" })
  })

  it("creates character and returns id", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.character.create.mockResolvedValueOnce({ id: "char1" })
    const result = await createCharacter("book1", "Aria")
    expect(result).toEqual({ characterId: "char1" })
    expect(db.character.create).toHaveBeenCalledWith({
      data: { bookId: "book1", name: "Aria", backstory: {} },
    })
  })
})

// ── updateCharacter ────────────────────────────────────────────────────────

describe("updateCharacter", () => {
  it("rejects blank name", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    const result = await updateCharacter("char1", { name: "" })
    expect(result).toEqual({ error: "Name cannot be empty" })
  })

  it("updates allowed fields", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    db.character.update.mockResolvedValueOnce({})
    const result = await updateCharacter("char1", { nickname: "Ari", storyRole: "PROTAGONIST" })
    expect(result).toEqual({ success: true })
    expect(db.character.update).toHaveBeenCalledWith({
      where: { id: "char1" },
      data: { nickname: "Ari", storyRole: "PROTAGONIST", name: undefined },
    })
  })

  it("returns not found for unknown character", async () => {
    db.character.findFirst.mockResolvedValueOnce(null)
    const result = await updateCharacter("char1", { nickname: "X" })
    expect(result).toEqual({ error: "Not found" })
  })
})

// ── deleteCharacter ────────────────────────────────────────────────────────

describe("deleteCharacter", () => {
  it("deletes and returns success", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    db.character.delete.mockResolvedValueOnce({})
    const result = await deleteCharacter("char1")
    expect(result).toEqual({ success: true })
    expect(db.character.delete).toHaveBeenCalledWith({ where: { id: "char1" } })
  })

  it("returns not found for unknown character", async () => {
    db.character.findFirst.mockResolvedValueOnce(null)
    const result = await deleteCharacter("char1")
    expect(result).toEqual({ error: "Not found" })
  })
})

// ── saveCharacterBackstory ─────────────────────────────────────────────────

describe("saveCharacterBackstory", () => {
  it("saves JSON content", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    db.character.update.mockResolvedValueOnce({})
    const content = { type: "doc", content: [] }
    const result = await saveCharacterBackstory("char1", content)
    expect(result).toEqual({ success: true })
    expect(db.character.update).toHaveBeenCalledWith({
      where: { id: "char1" },
      data: { backstory: content },
    })
  })
})

// ── setCharacterMainImage ──────────────────────────────────────────────────

describe("setCharacterMainImage", () => {
  it("sets main image URL", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    db.character.update.mockResolvedValueOnce({})
    const result = await setCharacterMainImage("char1", "https://img.url/photo.jpg")
    expect(result).toEqual({ success: true })
    expect(db.character.update).toHaveBeenCalledWith({
      where: { id: "char1" },
      data: { mainImageUrl: "https://img.url/photo.jpg" },
    })
  })
})

// ── addToCharacterGallery ──────────────────────────────────────────────────

describe("addToCharacterGallery", () => {
  it("adds image to gallery", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    db.character.findUnique.mockResolvedValueOnce({ gallery: ["img1.jpg", "img2.jpg"] })
    db.character.update.mockResolvedValueOnce({})
    const result = await addToCharacterGallery("char1", "img3.jpg")
    expect(result).toEqual({ success: true })
  })

  it("rejects when gallery is full (10 images)", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    db.character.findUnique.mockResolvedValueOnce({
      gallery: Array(10).fill("img.jpg"),
    })
    const result = await addToCharacterGallery("char1", "new.jpg")
    expect(result).toEqual({ error: "Gallery full (max 10)" })
  })
})

// ── removeFromCharacterGallery ─────────────────────────────────────────────

describe("removeFromCharacterGallery", () => {
  it("removes image from gallery", async () => {
    db.character.findFirst.mockResolvedValueOnce(CHAR)
    db.character.findUnique.mockResolvedValueOnce({ gallery: ["img1.jpg", "img2.jpg"] })
    db.character.update.mockResolvedValueOnce({})
    const result = await removeFromCharacterGallery("char1", "img1.jpg")
    expect(result).toEqual({ success: true })
    expect(db.character.update).toHaveBeenCalledWith({
      where: { id: "char1" },
      data: { gallery: ["img2.jpg"] },
    })
  })
})

// ── getCharacterWithLinks ──────────────────────────────────────────────────

describe("getCharacterWithLinks", () => {
  it("returns character with normalised links", async () => {
    const charWithLinks = {
      ...CHAR_FULL,
      linksFrom: [
        {
          id: "link1",
          characterBId: "char2",
          relationshipType: "FRIEND",
          note: null,
          characterB: { id: "char2", name: "Bela", mainImageUrl: null },
        },
      ],
      linksTo: [
        {
          id: "link2",
          characterAId: "char3",
          relationshipType: "ENEMY",
          note: "rivals",
          characterA: { id: "char3", name: "Cira", mainImageUrl: null },
        },
      ],
    }
    db.character.findFirst.mockResolvedValueOnce(charWithLinks)
    const result = await getCharacterWithLinks("char1")
    expect("error" in result).toBe(false)
    if ("character" in result) {
      expect(result.character.links).toHaveLength(2)
      expect(result.character.links[0]).toMatchObject({
        id: "link1",
        otherId: "char2",
        otherName: "Bela",
        relationshipType: "FRIEND",
      })
      expect(result.character.links[1]).toMatchObject({
        id: "link2",
        otherId: "char3",
        otherName: "Cira",
        relationshipType: "ENEMY",
        note: "rivals",
      })
    }
  })

  it("returns not found for unknown character", async () => {
    db.character.findFirst.mockResolvedValueOnce(null)
    const result = await getCharacterWithLinks("char1")
    expect(result).toEqual({ error: "Not found" })
  })
})

// ── addCharacterLink ───────────────────────────────────────────────────────

describe("addCharacterLink", () => {
  it("rejects self-link", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    const result = await addCharacterLink("book1", "char1", "char1", "FRIEND")
    expect(result).toEqual({ error: "Cannot link a character to themselves" })
  })

  it("rejects duplicate link", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.character.findFirst
      .mockResolvedValueOnce({ id: "char1" })
      .mockResolvedValueOnce({ id: "char2" })
    db.characterLink.findFirst.mockResolvedValueOnce({ id: "existing" })
    const result = await addCharacterLink("book1", "char1", "char2", "FRIEND")
    expect(result).toEqual({ error: "Link already exists" })
  })

  it("creates a new link", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.character.findFirst
      .mockResolvedValueOnce({ id: "char1" })
      .mockResolvedValueOnce({ id: "char2" })
    db.characterLink.findFirst.mockResolvedValueOnce(null)
    db.characterLink.create.mockResolvedValueOnce({ id: "link1" })
    const result = await addCharacterLink("book1", "char1", "char2", "LOVER", "deeply in love")
    expect(result).toEqual({ success: true })
    expect(db.characterLink.create).toHaveBeenCalledWith({
      data: {
        characterAId: "char1",
        characterBId: "char2",
        relationshipType: "LOVER",
        note: "deeply in love",
      },
    })
  })
})

// ── deleteCharacterLink ────────────────────────────────────────────────────

describe("deleteCharacterLink", () => {
  it("deletes a link owned by the author", async () => {
    db.characterLink.findUnique.mockResolvedValueOnce({
      characterAId: "char1",
      characterBId: "char2",
      characterA: { book: { id: "book1", authorId: "user1" } },
    })
    db.characterLink.delete.mockResolvedValueOnce({})
    const result = await deleteCharacterLink("link1")
    expect(result).toEqual({ success: true })
  })

  it("rejects deletion for non-author", async () => {
    db.characterLink.findUnique.mockResolvedValueOnce({
      characterAId: "char1",
      characterBId: "char2",
      characterA: { book: { id: "book1", authorId: "other-user" } },
    })
    const result = await deleteCharacterLink("link1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns not found for missing link", async () => {
    db.characterLink.findUnique.mockResolvedValueOnce(null)
    const result = await deleteCharacterLink("link1")
    expect(result).toEqual({ error: "Not found" })
  })
})

// ── Location helpers ────────────────────────────────────────────────────────

const LOC = { id: "loc1", bookId: "book1" }

// ── getLocations ────────────────────────────────────────────────────────────

describe("getLocations", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getLocations("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getLocations("book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns location list", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.location.findMany.mockResolvedValueOnce([
      { id: "loc1", name: "The Keep", parentLocationId: null, images: [], _count: { subLocations: 2 } },
    ])
    const result = await getLocations("book1")
    expect(result).toEqual({
      locations: [
        { id: "loc1", name: "The Keep", parentLocationId: null, images: [], _count: { subLocations: 2 } },
      ],
    })
  })
})

// ── createLocation ──────────────────────────────────────────────────────────

describe("createLocation", () => {
  it("rejects empty name", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    const result = await createLocation("book1", "   ")
    expect(result).toEqual({ error: "Name is required" })
  })

  it("creates location and returns id", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.location.create.mockResolvedValueOnce({ id: "loc1" })
    const result = await createLocation("book1", "The Keep")
    expect(result).toEqual({ locationId: "loc1" })
    expect(db.location.create).toHaveBeenCalledWith({
      data: { bookId: "book1", name: "The Keep", description: {}, parentLocationId: null },
    })
  })

  it("validates parent location belongs to the book", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.location.findFirst.mockResolvedValueOnce(null)
    const result = await createLocation("book1", "Sub-room", "bad-parent")
    expect(result).toEqual({ error: "Parent location not found" })
  })

  it("creates sub-location with valid parent", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.location.findFirst.mockResolvedValueOnce({ id: "loc0" })
    db.location.create.mockResolvedValueOnce({ id: "loc1" })
    const result = await createLocation("book1", "Sub-room", "loc0")
    expect(result).toEqual({ locationId: "loc1" })
  })
})

// ── updateLocation ──────────────────────────────────────────────────────────

describe("updateLocation", () => {
  it("rejects blank name", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    const result = await updateLocation("loc1", { name: "" })
    expect(result).toEqual({ error: "Name cannot be empty" })
  })

  it("rejects self as parent", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    const result = await updateLocation("loc1", { parentLocationId: "loc1" })
    expect(result).toEqual({ error: "Cannot set location as its own parent" })
  })

  it("updates name", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.location.update.mockResolvedValueOnce({})
    const result = await updateLocation("loc1", { name: "New Name" })
    expect(result).toEqual({ success: true })
    expect(db.location.update).toHaveBeenCalledWith({
      where: { id: "loc1" },
      data: { name: "New Name" },
    })
  })

  it("returns not found for unknown location", async () => {
    db.location.findFirst.mockResolvedValueOnce(null)
    const result = await updateLocation("loc1", { name: "X" })
    expect(result).toEqual({ error: "Not found" })
  })
})

// ── deleteLocation ──────────────────────────────────────────────────────────

describe("deleteLocation", () => {
  it("deletes and returns success", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.location.delete.mockResolvedValueOnce({})
    const result = await deleteLocation("loc1")
    expect(result).toEqual({ success: true })
    expect(db.location.delete).toHaveBeenCalledWith({ where: { id: "loc1" } })
  })

  it("returns not found for unknown location", async () => {
    db.location.findFirst.mockResolvedValueOnce(null)
    const result = await deleteLocation("loc1")
    expect(result).toEqual({ error: "Not found" })
  })
})

// ── saveLocationDescription ─────────────────────────────────────────────────

describe("saveLocationDescription", () => {
  it("saves JSON content", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.location.update.mockResolvedValueOnce({})
    const content = { type: "doc", content: [] }
    const result = await saveLocationDescription("loc1", content)
    expect(result).toEqual({ success: true })
    expect(db.location.update).toHaveBeenCalledWith({
      where: { id: "loc1" },
      data: { description: content },
    })
  })
})

// ── addToLocationGallery ────────────────────────────────────────────────────

describe("addToLocationGallery", () => {
  it("adds image to gallery", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.location.findUnique.mockResolvedValueOnce({ images: ["img1.jpg"] })
    db.location.update.mockResolvedValueOnce({})
    const result = await addToLocationGallery("loc1", "img2.jpg")
    expect(result).toEqual({ success: true })
  })

  it("rejects when gallery is full (10 images)", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.location.findUnique.mockResolvedValueOnce({ images: Array(10).fill("img.jpg") })
    const result = await addToLocationGallery("loc1", "new.jpg")
    expect(result).toEqual({ error: "Gallery full (max 10)" })
  })
})

// ── removeFromLocationGallery ───────────────────────────────────────────────

describe("removeFromLocationGallery", () => {
  it("removes image from gallery", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.location.findUnique.mockResolvedValueOnce({ images: ["img1.jpg", "img2.jpg"] })
    db.location.update.mockResolvedValueOnce({})
    const result = await removeFromLocationGallery("loc1", "img1.jpg")
    expect(result).toEqual({ success: true })
    expect(db.location.update).toHaveBeenCalledWith({
      where: { id: "loc1" },
      data: { images: ["img2.jpg"] },
    })
  })
})

// ── addLocationCharacter ────────────────────────────────────────────────────

describe("addLocationCharacter", () => {
  it("links a character to a location", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.character.findFirst.mockResolvedValueOnce({ id: "char1" })
    db.locationCharacter.findUnique.mockResolvedValueOnce(null)
    db.locationCharacter.create.mockResolvedValueOnce({})
    const result = await addLocationCharacter("loc1", "char1", "lives here")
    expect(result).toEqual({ success: true })
    expect(db.locationCharacter.create).toHaveBeenCalledWith({
      data: { locationId: "loc1", characterId: "char1", note: "lives here" },
    })
  })

  it("rejects duplicate link", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.character.findFirst.mockResolvedValueOnce({ id: "char1" })
    db.locationCharacter.findUnique.mockResolvedValueOnce({ id: "existing" })
    const result = await addLocationCharacter("loc1", "char1")
    expect(result).toEqual({ error: "Character already linked" })
  })

  it("rejects character not in the book", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.character.findFirst.mockResolvedValueOnce(null)
    const result = await addLocationCharacter("loc1", "bad-char")
    expect(result).toEqual({ error: "Character not found" })
  })
})

// ── removeLocationCharacter ─────────────────────────────────────────────────

describe("removeLocationCharacter", () => {
  it("removes a character link", async () => {
    db.location.findFirst.mockResolvedValueOnce(LOC)
    db.locationCharacter.delete.mockResolvedValueOnce({})
    const result = await removeLocationCharacter("loc1", "char1")
    expect(result).toEqual({ success: true })
    expect(db.locationCharacter.delete).toHaveBeenCalledWith({
      where: { locationId_characterId: { locationId: "loc1", characterId: "char1" } },
    })
  })

  it("returns not found when location not owned by user", async () => {
    db.location.findFirst.mockResolvedValueOnce(null)
    const result = await removeLocationCharacter("loc1", "char1")
    expect(result).toEqual({ error: "Not found" })
  })
})

// ── Plotting fixtures ─────────────────────────────────────────────────────────

const PLOT_NOTE = {
  id: "plotnote1",
  chapterId: "chapter1",
  chapter: { bookId: "book1" },
  _count: { scenes: 1 },
}

const SCENE_RAW = {
  id: "scene1",
  plotNoteId: "plotnote1",
  order: 1,
  plotNote: {
    chapter: {
      bookId: "book1",
      book: { authorId: "user1" },
    },
  },
}

const SCENE_RESULT = {
  id: "scene1",
  title: "Opening",
  description: null,
  order: 1,
  characterIds: [],
  locationId: null,
  location: null,
}

// ── getPlottingBoard ───────────────────────────────────────────────────────────

describe("getPlottingBoard", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getPlottingBoard("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getPlottingBoard("book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns chapters, characters and locations", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.chapter.findMany.mockResolvedValueOnce([
      { id: "chapter1", title: "Chapter 1", order: 1, plotNote: null },
    ])
    db.character.findMany.mockResolvedValueOnce([
      { id: "char1", name: "Aria", mainImageUrl: null },
    ])
    db.location.findMany.mockResolvedValueOnce([
      { id: "loc1", name: "Forest" },
    ])
    const result = await getPlottingBoard("book1")
    expect(result).toEqual({
      chapters: [{ id: "chapter1", title: "Chapter 1", order: 1, plotNote: null }],
      characters: [{ id: "char1", name: "Aria", mainImageUrl: null }],
      locations: [{ id: "loc1", name: "Forest" }],
    })
  })
})

// ── savePlotNoteNotes ─────────────────────────────────────────────────────────

describe("savePlotNoteNotes", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await savePlotNoteNotes("chapter1", {})
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author chapter", async () => {
    db.chapter.findFirst.mockResolvedValueOnce(null)
    const result = await savePlotNoteNotes("chapter1", {})
    expect(result).toEqual({ error: "Not found" })
  })

  it("upserts plot note notes", async () => {
    db.chapter.findFirst.mockResolvedValueOnce({ id: "chapter1", bookId: "book1" })
    db.plotNote.upsert.mockResolvedValueOnce({})
    const content = { type: "doc", content: [] }
    const result = await savePlotNoteNotes("chapter1", content)
    expect(result).toEqual({ success: true })
    expect(db.plotNote.upsert).toHaveBeenCalledWith({
      where: { chapterId: "chapter1" },
      create: { chapterId: "chapter1", notes: content },
      update: { notes: content },
    })
  })
})

// ── createScene ───────────────────────────────────────────────────────────────

describe("createScene", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await createScene("plotnote1", "Opening")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-owner plot note", async () => {
    db.plotNote.findFirst.mockResolvedValueOnce(null)
    const result = await createScene("plotnote1", "Opening")
    expect(result).toEqual({ error: "Not found" })
  })

  it("rejects empty title", async () => {
    db.plotNote.findFirst.mockResolvedValueOnce(PLOT_NOTE)
    const result = await createScene("plotnote1", "   ")
    expect(result).toEqual({ error: "Title is required" })
  })

  it("creates scene and returns it", async () => {
    db.plotNote.findFirst.mockResolvedValueOnce(PLOT_NOTE)
    db.scene.create.mockResolvedValueOnce(SCENE_RESULT)
    const result = await createScene("plotnote1", "Opening")
    expect(result).toEqual({ scene: SCENE_RESULT })
    expect(db.scene.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plotNoteId: "plotnote1",
          title: "Opening",
          order: 2,
        }),
      })
    )
  })
})

// ── updateScene ───────────────────────────────────────────────────────────────

describe("updateScene", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await updateScene("scene1", { title: "New" })
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-owner scene", async () => {
    db.scene.findUnique.mockResolvedValueOnce(null)
    const result = await updateScene("scene1", { title: "New" })
    expect(result).toEqual({ error: "Not found" })
  })

  it("rejects blank title", async () => {
    db.scene.findUnique.mockResolvedValueOnce(SCENE_RAW)
    const result = await updateScene("scene1", { title: "" })
    expect(result).toEqual({ error: "Title cannot be empty" })
  })

  it("updates scene fields", async () => {
    db.scene.findUnique.mockResolvedValueOnce(SCENE_RAW)
    db.scene.update.mockResolvedValueOnce({})
    const result = await updateScene("scene1", { title: "New title", locationId: null })
    expect(result).toEqual({ success: true })
    expect(db.scene.update).toHaveBeenCalledWith({
      where: { id: "scene1" },
      data: { title: "New title", locationId: null },
    })
  })
})

// ── deleteScene ───────────────────────────────────────────────────────────────

describe("deleteScene", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await deleteScene("scene1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-owner scene", async () => {
    db.scene.findUnique.mockResolvedValueOnce(null)
    const result = await deleteScene("scene1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("deletes scene and reorders remaining", async () => {
    db.scene.findUnique.mockResolvedValueOnce(SCENE_RAW)
    db.$transaction.mockResolvedValueOnce([])
    const result = await deleteScene("scene1")
    expect(result).toEqual({ success: true })
    expect(db.$transaction).toHaveBeenCalled()
  })
})

// ── reorderScenes ─────────────────────────────────────────────────────────────

describe("reorderScenes", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await reorderScenes("plotnote1", ["scene1", "scene2"])
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-owner plot note", async () => {
    db.plotNote.findFirst.mockResolvedValueOnce(null)
    const result = await reorderScenes("plotnote1", ["scene1"])
    expect(result).toEqual({ error: "Not found" })
  })

  it("updates order for each scene", async () => {
    db.plotNote.findFirst.mockResolvedValueOnce(PLOT_NOTE)
    db.$transaction.mockResolvedValueOnce([])
    db.scene.update.mockResolvedValue({})
    const result = await reorderScenes("plotnote1", ["scene2", "scene1"])
    expect(result).toEqual({ success: true })
    expect(db.$transaction).toHaveBeenCalled()
  })
})

// ── Timeline fixtures ─────────────────────────────────────────────────────────

const ENTRY = { id: "entry1", bookId: "book1" }

const ENTRY_FULL = {
  id: "entry1",
  title: "The Battle",
  moment: "Day 3",
  description: null,
  color: "#6b3fa0",
  order: 1,
  chapterId: null,
  chapter: null,
}

// ── getTimeline ───────────────────────────────────────────────────────────────

describe("getTimeline", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getTimeline("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getTimeline("book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns entries list ordered by order", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.timelineEntry.findMany.mockResolvedValueOnce([ENTRY_FULL])
    const result = await getTimeline("book1")
    expect(result).toEqual({ entries: [ENTRY_FULL] })
  })
})

// ── createTimelineEntry ───────────────────────────────────────────────────────

describe("createTimelineEntry", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await createTimelineEntry("book1", { title: "X", moment: "Day 1" })
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await createTimelineEntry("book1", { title: "X", moment: "Day 1" })
    expect(result).toEqual({ error: "Not found" })
  })

  it("rejects empty title", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    const result = await createTimelineEntry("book1", { title: "   ", moment: "Day 1" })
    expect(result).toEqual({ error: "Title is required" })
  })

  it("rejects empty moment", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    const result = await createTimelineEntry("book1", { title: "Battle", moment: "  " })
    expect(result).toEqual({ error: "Moment is required" })
  })

  it("creates entry and returns it", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.timelineEntry.count.mockResolvedValueOnce(0)
    db.timelineEntry.create.mockResolvedValueOnce(ENTRY_FULL)
    const result = await createTimelineEntry("book1", { title: "The Battle", moment: "Day 3" })
    expect(result).toEqual({ entry: ENTRY_FULL })
    expect(db.timelineEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookId: "book1",
          title: "The Battle",
          moment: "Day 3",
          order: 1,
        }),
      })
    )
  })

  it("uses provided color and chapterId", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.timelineEntry.count.mockResolvedValueOnce(2)
    db.timelineEntry.create.mockResolvedValueOnce({ ...ENTRY_FULL, color: "#ef4444", chapterId: "ch1", order: 3 })
    const result = await createTimelineEntry("book1", {
      title: "Battle",
      moment: "Day 3",
      color: "#ef4444",
      chapterId: "ch1",
    })
    expect(result).not.toHaveProperty("error")
    expect(db.timelineEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ color: "#ef4444", chapterId: "ch1", order: 3 }),
      })
    )
  })
})

// ── updateTimelineEntry ───────────────────────────────────────────────────────

describe("updateTimelineEntry", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await updateTimelineEntry("entry1", { title: "New" })
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-owner entry", async () => {
    db.timelineEntry.findFirst.mockResolvedValueOnce(null)
    const result = await updateTimelineEntry("entry1", { title: "New" })
    expect(result).toEqual({ error: "Not found" })
  })

  it("rejects blank title", async () => {
    db.timelineEntry.findFirst.mockResolvedValueOnce(ENTRY)
    const result = await updateTimelineEntry("entry1", { title: "" })
    expect(result).toEqual({ error: "Title cannot be empty" })
  })

  it("rejects blank moment", async () => {
    db.timelineEntry.findFirst.mockResolvedValueOnce(ENTRY)
    const result = await updateTimelineEntry("entry1", { moment: "" })
    expect(result).toEqual({ error: "Moment cannot be empty" })
  })

  it("updates entry fields", async () => {
    db.timelineEntry.findFirst.mockResolvedValueOnce(ENTRY)
    db.timelineEntry.update.mockResolvedValueOnce({})
    const result = await updateTimelineEntry("entry1", {
      title: "Updated",
      color: "#3b82f6",
      chapterId: null,
    })
    expect(result).toEqual({ success: true })
    expect(db.timelineEntry.update).toHaveBeenCalledWith({
      where: { id: "entry1" },
      data: { title: "Updated", color: "#3b82f6", chapterId: null, moment: undefined },
    })
  })
})

// ── deleteTimelineEntry ───────────────────────────────────────────────────────

describe("deleteTimelineEntry", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await deleteTimelineEntry("entry1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-owner entry", async () => {
    db.timelineEntry.findFirst.mockResolvedValueOnce(null)
    const result = await deleteTimelineEntry("entry1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("deletes entry and returns success", async () => {
    db.timelineEntry.findFirst.mockResolvedValueOnce(ENTRY)
    db.timelineEntry.delete.mockResolvedValueOnce({})
    const result = await deleteTimelineEntry("entry1")
    expect(result).toEqual({ success: true })
    expect(db.timelineEntry.delete).toHaveBeenCalledWith({ where: { id: "entry1" } })
  })
})

// ── reorderTimelineEntries ────────────────────────────────────────────────────

describe("reorderTimelineEntries", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await reorderTimelineEntries("book1", ["entry1", "entry2"])
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await reorderTimelineEntries("book1", ["entry1"])
    expect(result).toEqual({ error: "Not found" })
  })

  it("reorders entries via transaction", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.$transaction.mockResolvedValueOnce([])
    db.timelineEntry.update.mockResolvedValue({})
    const result = await reorderTimelineEntries("book1", ["entry2", "entry1"])
    expect(result).toEqual({ success: true })
    expect(db.$transaction).toHaveBeenCalled()
  })
})

// ── Board fixtures ────────────────────────────────────────────────────────────

const BOARD = { id: "board1", bookId: "book1", name: "Main" }
const BOARD_ELEMENT = { id: "el1", boardId: "board1", board: { bookId: "book1" } }
const BOARD_ELEMENT_FULL = {
  id: "el1",
  type: "NOTE",
  characterId: null,
  locationId: null,
  posX: 100,
  posY: 200,
  content: { text: "hello", color: "#fef3c7" },
  character: null,
  location: null,
}
const BOARD_CONNECTION = {
  id: "conn1",
  fromElementId: "el1",
  toElementId: "el2",
  label: null,
  color: "#6b3fa0",
  isAutomatic: false,
}

// ── getBoards ─────────────────────────────────────────────────────────────────

describe("getBoards", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getBoards("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author book", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getBoards("book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns boards list", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.board.findMany.mockResolvedValueOnce([BOARD])
    const result = await getBoards("book1")
    expect(result).toEqual({ boards: [BOARD] })
  })
})

// ── createBoard ───────────────────────────────────────────────────────────────

describe("createBoard", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await createBoard("book1", "My Board")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author book", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await createBoard("book1", "My Board")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns error for blank name", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    const result = await createBoard("book1", "  ")
    expect(result).toEqual({ error: "Name is required" })
  })

  it("creates board and returns it", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.board.create.mockResolvedValueOnce(BOARD)
    const result = await createBoard("book1", "Main")
    expect(result).toEqual({ board: BOARD })
    expect(db.board.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Main", bookId: "book1" }) })
    )
  })
})

// ── deleteBoard ───────────────────────────────────────────────────────────────

describe("deleteBoard", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await deleteBoard("board1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if board does not belong to user", async () => {
    db.board.findFirst.mockResolvedValueOnce(null)
    const result = await deleteBoard("board1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("deletes board and returns success", async () => {
    db.board.findFirst.mockResolvedValueOnce(BOARD)
    db.board.delete.mockResolvedValueOnce({})
    const result = await deleteBoard("board1")
    expect(result).toEqual({ success: true })
  })
})

// ── getBoardData ──────────────────────────────────────────────────────────────

describe("getBoardData", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getBoardData("board1", "book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author book", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getBoardData("board1", "book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns not found if board missing", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.board.findFirst.mockResolvedValueOnce(null)
    const result = await getBoardData("board1", "book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns full board data", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.board.findFirst.mockResolvedValueOnce({
      id: "board1",
      name: "Main",
      elements: [BOARD_ELEMENT_FULL],
      connections: [BOARD_CONNECTION],
    })
    db.characterLink.findMany.mockResolvedValueOnce([])
    const result = await getBoardData("board1", "book1")
    expect(result).toMatchObject({
      board: { id: "board1" },
      elements: [expect.objectContaining({ id: "el1" })],
      connections: [BOARD_CONNECTION],
      characterLinks: [],
    })
  })
})

// ── addBoardElement ───────────────────────────────────────────────────────────

describe("addBoardElement", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await addBoardElement("board1", "NOTE")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if board does not belong to user", async () => {
    db.board.findFirst.mockResolvedValueOnce(null)
    const result = await addBoardElement("board1", "NOTE")
    expect(result).toEqual({ error: "Not found" })
  })

  it("creates element and returns it", async () => {
    db.board.findFirst.mockResolvedValueOnce(BOARD_ELEMENT)
    db.boardElement.create.mockResolvedValueOnce({ ...BOARD_ELEMENT_FULL })
    const result = await addBoardElement("board1", "NOTE", null, { text: "hello" }, 100, 200)
    expect(result).toHaveProperty("element")
  })
})

// ── saveBoardElementPosition ──────────────────────────────────────────────────

describe("saveBoardElementPosition", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await saveBoardElementPosition("el1", 10, 20)
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if element not owned", async () => {
    db.boardElement.findFirst.mockResolvedValueOnce(null)
    const result = await saveBoardElementPosition("el1", 10, 20)
    expect(result).toEqual({ error: "Not found" })
  })

  it("updates position and returns success", async () => {
    db.boardElement.findFirst.mockResolvedValueOnce(BOARD_ELEMENT)
    db.boardElement.update.mockResolvedValueOnce({})
    const result = await saveBoardElementPosition("el1", 10, 20)
    expect(result).toEqual({ success: true })
    expect(db.boardElement.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { posX: 10, posY: 20 } })
    )
  })
})

// ── updateBoardElementContent ─────────────────────────────────────────────────

describe("updateBoardElementContent", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await updateBoardElementContent("el1", { text: "hi" })
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if element not owned", async () => {
    db.boardElement.findFirst.mockResolvedValueOnce(null)
    const result = await updateBoardElementContent("el1", { text: "hi" })
    expect(result).toEqual({ error: "Not found" })
  })

  it("updates content and returns success", async () => {
    db.boardElement.findFirst.mockResolvedValueOnce(BOARD_ELEMENT)
    db.boardElement.update.mockResolvedValueOnce({})
    const result = await updateBoardElementContent("el1", { text: "hi" })
    expect(result).toEqual({ success: true })
  })
})

// ── deleteBoardElement ────────────────────────────────────────────────────────

describe("deleteBoardElement", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await deleteBoardElement("el1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if element not owned", async () => {
    db.boardElement.findFirst.mockResolvedValueOnce(null)
    const result = await deleteBoardElement("el1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("deletes element and returns success", async () => {
    db.boardElement.findFirst.mockResolvedValueOnce(BOARD_ELEMENT)
    db.boardElement.delete.mockResolvedValueOnce({})
    const result = await deleteBoardElement("el1")
    expect(result).toEqual({ success: true })
  })
})

// ── addBoardConnection ────────────────────────────────────────────────────────

describe("addBoardConnection", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await addBoardConnection("board1", "el1", "el2")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if board not owned", async () => {
    db.board.findFirst.mockResolvedValueOnce(null)
    const result = await addBoardConnection("board1", "el1", "el2")
    expect(result).toEqual({ error: "Not found" })
  })

  it("creates connection and returns it", async () => {
    db.board.findFirst.mockResolvedValueOnce(BOARD)
    db.boardConnection.create.mockResolvedValueOnce(BOARD_CONNECTION)
    const result = await addBoardConnection("board1", "el1", "el2")
    expect(result).toEqual({ connection: BOARD_CONNECTION })
  })
})

// ── deleteBoardConnection ─────────────────────────────────────────────────────

describe("deleteBoardConnection", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await deleteBoardConnection("conn1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if connection not owned", async () => {
    db.boardConnection.findFirst.mockResolvedValueOnce(null)
    const result = await deleteBoardConnection("conn1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("deletes connection and returns success", async () => {
    db.boardConnection.findFirst.mockResolvedValueOnce({ id: "conn1", board: { bookId: "book1" } })
    db.boardConnection.delete.mockResolvedValueOnce({})
    const result = await deleteBoardConnection("conn1")
    expect(result).toEqual({ success: true })
    expect(db.boardConnection.delete).toHaveBeenCalledWith({ where: { id: "conn1" } })
  })
})

// ── BookNote fixtures ─────────────────────────────────────────────────────────

const NOTE = {
  id: "note1",
  bookId: "book1",
  title: "My Note",
  content: {},
  tags: ["worldbuilding"],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}
const NOTE_OWNED = { id: "note1", bookId: "book1" }

// ── getBookNotes ──────────────────────────────────────────────────────────────

describe("getBookNotes", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await getBookNotes("book1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author book", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await getBookNotes("book1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns notes list", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.bookNote.findMany.mockResolvedValueOnce([NOTE])
    const result = await getBookNotes("book1")
    expect(result).toHaveProperty("notes")
    expect((result as { notes: typeof NOTE[] }).notes[0].id).toBe("note1")
  })
})

// ── createBookNote ────────────────────────────────────────────────────────────

describe("createBookNote", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await createBookNote("book1", "Title")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found for non-author book", async () => {
    db.book.findFirst.mockResolvedValueOnce(null)
    const result = await createBookNote("book1", "Title")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns error for blank title", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    const result = await createBookNote("book1", "   ")
    expect(result).toEqual({ error: "Title is required" })
  })

  it("creates note and returns it", async () => {
    db.book.findFirst.mockResolvedValueOnce(BOOK)
    db.bookNote.create.mockResolvedValueOnce(NOTE)
    const result = await createBookNote("book1", "My Note")
    expect(result).toHaveProperty("note")
    expect((result as { note: typeof NOTE }).note.title).toBe("My Note")
  })
})

// ── updateBookNote ────────────────────────────────────────────────────────────

describe("updateBookNote", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await updateBookNote("note1", { title: "New" })
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if note not owned", async () => {
    db.bookNote.findFirst.mockResolvedValueOnce(null)
    const result = await updateBookNote("note1", { title: "New" })
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns error for blank title", async () => {
    db.bookNote.findFirst.mockResolvedValueOnce(NOTE_OWNED)
    const result = await updateBookNote("note1", { title: "  " })
    expect(result).toEqual({ error: "Title is required" })
  })

  it("updates note and returns success", async () => {
    db.bookNote.findFirst.mockResolvedValueOnce(NOTE_OWNED)
    db.bookNote.update.mockResolvedValueOnce({})
    const result = await updateBookNote("note1", { title: "Updated", tags: ["plot"] })
    expect(result).toEqual({ success: true })
    expect(db.bookNote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "note1" },
        data: expect.objectContaining({ title: "Updated", tags: ["plot"] }),
      })
    )
  })

  it("updates content without title", async () => {
    db.bookNote.findFirst.mockResolvedValueOnce(NOTE_OWNED)
    db.bookNote.update.mockResolvedValueOnce({})
    const content = { type: "doc", content: [] }
    const result = await updateBookNote("note1", { content })
    expect(result).toEqual({ success: true })
  })
})

// ── deleteBookNote ────────────────────────────────────────────────────────────

describe("deleteBookNote", () => {
  it("returns unauthorized without session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    const result = await deleteBookNote("note1")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns not found if note not owned", async () => {
    db.bookNote.findFirst.mockResolvedValueOnce(null)
    const result = await deleteBookNote("note1")
    expect(result).toEqual({ error: "Not found" })
  })

  it("deletes note and returns success", async () => {
    db.bookNote.findFirst.mockResolvedValueOnce(NOTE_OWNED)
    db.bookNote.delete.mockResolvedValueOnce({})
    const result = await deleteBookNote("note1")
    expect(result).toEqual({ success: true })
    expect(db.bookNote.delete).toHaveBeenCalledWith({ where: { id: "note1" } })
  })
})
