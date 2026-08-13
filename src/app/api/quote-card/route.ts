import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderQuoteCard } from "@/lib/quote-card"
import { uploadImage } from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const { quote, backgroundId, bookId, chapterId } = body ?? {}

  if (
    typeof quote !== "string" ||
    !quote.trim() ||
    typeof backgroundId !== "string" ||
    typeof bookId !== "string" ||
    typeof chapterId !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 })
  }

  // Titles are derived server-side from the chapter/book rows rather than
  // trusted from the client — also doubles as the access check: only a
  // PUBLISHED chapter can be turned into a public share.
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { title: true, visibility: true, bookId: true, book: { select: { id: true, title: true } } },
  })
  if (!chapter || chapter.bookId !== bookId || chapter.visibility !== "PUBLISHED") {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 })
  }

  try {
    const pngBuffer = await renderQuoteCard({
      quote,
      bookTitle: chapter.book.title,
      chapterTitle: chapter.title,
      backgroundId,
    })
    const file = new File([new Uint8Array(pngBuffer)], "quote-card.png", { type: "image/png" })
    const imageUrl = await uploadImage(file, "planster/quote-cards")

    const share = await prisma.quoteShare.create({
      data: { bookId, chapterId, quote: quote.trim(), imageUrl },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    return NextResponse.json({ url: imageUrl, shareUrl: `${appUrl}/share/${share.id}` })
  } catch (err) {
    console.error("[quote-card] generation failed:", err)
    return NextResponse.json({ error: "Failed to generate quote card" }, { status: 500 })
  }
}
