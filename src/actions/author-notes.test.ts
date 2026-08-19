import { describe, it, expect, vi, beforeEach } from "vitest"
import { createAuthorNote, getAuthorNotes, deleteAuthorNote } from "./author-notes"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const mp = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

const SESSION = {
  user: { id: "author-1", email: "a@test.com", username: "author1", avatarUrl: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("createAuthorNote", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await createAuthorNote("ch-1", "text", 1, 5, "note")
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error for empty content", async () => {
    const result = await createAuthorNote("ch-1", "text", 1, 5, "   ")
    expect(result.error).toBe("Note cannot be empty")
  })

  it("returns error when the viewer is not the chapter's author", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "other" } })
    const result = await createAuthorNote("ch-1", "text", 1, 5, "note")
    expect(result.error).toBe("Not found")
  })

  it("creates the note on success", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "author-1" } })
    mp.authorNote.create.mockResolvedValue({ id: "note-1" })

    const result = await createAuthorNote("ch-1", "selected text", 10, 22, "Fix this pacing")
    expect(result.success).toBe(true)
    expect(result.noteId).toBe("note-1")
    expect(mp.authorNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          chapterId: "ch-1",
          selectedText: "selected text",
          fromPos: 10,
          toPos: 22,
          content: "Fix this pacing",
        },
      })
    )
  })
})

describe("getAuthorNotes", () => {
  it("returns error when the viewer is not the chapter's author", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "other" } })
    const result = await getAuthorNotes("ch-1")
    expect(result.error).toBe("Not found")
  })

  it("returns notes ordered by position", async () => {
    mp.chapter.findUnique.mockResolvedValue({ book: { authorId: "author-1" } })
    mp.authorNote.findMany.mockResolvedValue([
      {
        id: "note-1",
        selectedText: "text",
        fromPos: 5,
        toPos: 9,
        content: "note",
        createdAt: new Date(),
      },
    ])

    const result = await getAuthorNotes("ch-1")
    expect(result.notes).toHaveLength(1)
    expect(mp.authorNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { chapterId: "ch-1" } })
    )
  })
})

describe("deleteAuthorNote", () => {
  it("returns error when the viewer is not the chapter's author", async () => {
    mp.authorNote.findUnique.mockResolvedValue({ chapter: { book: { authorId: "other" } } })
    const result = await deleteAuthorNote("note-1")
    expect(result.error).toBe("Not found")
  })

  it("deletes the note on success", async () => {
    mp.authorNote.findUnique.mockResolvedValue({ chapter: { book: { authorId: "author-1" } } })
    mp.authorNote.delete.mockResolvedValue({})

    const result = await deleteAuthorNote("note-1")
    expect(result.success).toBe(true)
    expect(mp.authorNote.delete).toHaveBeenCalledWith({ where: { id: "note-1" } })
  })
})
