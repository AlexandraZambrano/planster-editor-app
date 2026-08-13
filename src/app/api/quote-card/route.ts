import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { renderQuoteCard } from "@/lib/quote-card"
import { uploadImage } from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const { quote, bookTitle, chapterTitle, backgroundId } = body ?? {}

  if (
    typeof quote !== "string" ||
    !quote.trim() ||
    typeof bookTitle !== "string" ||
    typeof chapterTitle !== "string" ||
    typeof backgroundId !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 })
  }

  try {
    const pngBuffer = await renderQuoteCard({ quote, bookTitle, chapterTitle, backgroundId })
    const file = new File([new Uint8Array(pngBuffer)], "quote-card.png", { type: "image/png" })
    const url = await uploadImage(file, "planster/quote-cards")
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: "Failed to generate quote card" }, { status: 500 })
  }
}
