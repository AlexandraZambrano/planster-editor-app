import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { renderCoverCard } from "@/lib/cover-card"
import { uploadImage } from "@/lib/cloudinary"
import type { CoverTextLayer } from "@/lib/cover-text-layers"

function isValidTextLayer(layer: unknown): layer is CoverTextLayer {
  if (!layer || typeof layer !== "object") return false
  const l = layer as Record<string, unknown>
  return (
    typeof l.id === "string" &&
    typeof l.text === "string" &&
    typeof l.xPercent === "number" &&
    typeof l.yPercent === "number" &&
    typeof l.fontId === "string" &&
    typeof l.color === "string" &&
    typeof l.fontSize === "number"
  )
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const { backgroundType, backgroundValue, textLayers } = body ?? {}

  if (
    (backgroundType !== "PRESET" && backgroundType !== "UPLOAD" && backgroundType !== "STOCK") ||
    typeof backgroundValue !== "string" ||
    !backgroundValue.trim() ||
    !Array.isArray(textLayers) ||
    !textLayers.every(isValidTextLayer)
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 })
  }

  try {
    const jpegBuffer = await renderCoverCard({ backgroundType, backgroundValue, textLayers })
    const file = new File([new Uint8Array(jpegBuffer)], "cover.jpg", { type: "image/jpeg" })
    const coverUrl = await uploadImage(file, "planster/covers")

    return NextResponse.json({ coverUrl })
  } catch (err) {
    console.error("[cover-design] generation failed:", err)
    return NextResponse.json({ error: "Failed to generate cover" }, { status: 500 })
  }
}
