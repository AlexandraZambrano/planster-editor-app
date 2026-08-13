import { describe, it, expect, vi, beforeEach } from "vitest"
import { getQuoteShare } from "./quote-share"
import { prisma } from "@/lib/prisma"

const mp = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getQuoteShare", () => {
  it("returns error when the share does not exist", async () => {
    mp.quoteShare.findUnique.mockResolvedValue(null)
    const result = await getQuoteShare("missing")
    expect(result.error).toBe("Not found")
  })

  it("returns the share with its book and chapter", async () => {
    mp.quoteShare.findUnique.mockResolvedValue({
      id: "share-1",
      quote: "A memorable line",
      imageUrl: "https://res.cloudinary.com/demo/quote-card.png",
      book: { id: "book-1", title: "My Book" },
      chapter: { id: "chapter-1", title: "Chapter One" },
    })
    const result = await getQuoteShare("share-1")
    expect(result.share).toEqual({
      id: "share-1",
      quote: "A memorable line",
      imageUrl: "https://res.cloudinary.com/demo/quote-card.png",
      book: { id: "book-1", title: "My Book" },
      chapter: { id: "chapter-1", title: "Chapter One" },
    })
  })
})
