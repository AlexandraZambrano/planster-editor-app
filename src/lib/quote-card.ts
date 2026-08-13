import sharp from "sharp"
import { readFile } from "fs/promises"
import { join } from "path"
import { getQuoteBackground } from "./quote-backgrounds"

const SIZE = 1080

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

export interface QuoteCardInput {
  quote: string
  bookTitle: string
  chapterTitle: string
  backgroundId: string
}

export async function renderQuoteCard({
  quote,
  bookTitle,
  chapterTitle,
  backgroundId,
}: QuoteCardInput): Promise<Buffer> {
  const background = getQuoteBackground(backgroundId)
  if (!background) throw new Error("Unknown background")

  const backgroundPath = join(process.cwd(), "public", background.url)
  const backgroundBuffer = await readFile(backgroundPath)

  const quoteLines = wrapText(quote.trim(), 34).slice(0, 8)
  const lineHeight = 56
  const quoteFontSize = 42
  const captionFontSize = 24

  const totalQuoteHeight = quoteLines.length * lineHeight
  const startY = SIZE / 2 - totalQuoteHeight / 2

  const quoteTspans = quoteLines
    .map(
      (line, i) =>
        `<tspan x="50%" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("")

  const caption = `${chapterTitle} · ${bookTitle}`

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" fill="black" opacity="0.18" />
    <text
      text-anchor="middle"
      font-family="Georgia, 'Times New Roman', serif"
      font-size="${quoteFontSize}"
      font-style="italic"
      fill="#FFFFFF"
    >${quoteTspans}</text>
    <text
      x="50%"
      y="${startY + totalQuoteHeight + 48}"
      text-anchor="middle"
      font-family="Arial, sans-serif"
      font-size="${captionFontSize}"
      fill="#FFFFFF"
      opacity="0.85"
    >${escapeXml(caption)}</text>
  </svg>`

  return sharp(backgroundBuffer)
    .resize(SIZE, SIZE)
    .composite([{ input: Buffer.from(overlaySvg) }])
    .png()
    .toBuffer()
}
