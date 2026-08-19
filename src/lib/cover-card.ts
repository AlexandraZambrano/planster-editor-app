import sharp from "sharp"
import { readFile } from "fs/promises"
import { join } from "path"
import { getCoverBackground } from "./cover-backgrounds"
import { getCoverFont } from "./cover-fonts"
import type { CoverTextLayer } from "./cover-text-layers"

const WIDTH = 1600
const HEIGHT = 2400

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

export interface CoverCardInput {
  backgroundType: "PRESET" | "UPLOAD" | "STOCK"
  backgroundValue: string
  textLayers: CoverTextLayer[]
}

async function resolveBackgroundBuffer(
  backgroundType: CoverCardInput["backgroundType"],
  backgroundValue: string
): Promise<Buffer> {
  if (backgroundType === "PRESET") {
    const background = getCoverBackground(backgroundValue)
    if (!background) throw new Error("Unknown background")
    const backgroundPath = join(process.cwd(), "public", background.url)
    return readFile(backgroundPath)
  }

  // UPLOAD / STOCK — backgroundValue is already a Cloudinary or Unsplash URL
  const res = await fetch(backgroundValue)
  if (!res.ok) throw new Error("Failed to fetch background image")
  return Buffer.from(await res.arrayBuffer())
}

// Renders one layer as two stacked <text> blocks: a dark stroked "halo" copy
// behind a solid fill copy on top. This keeps text legible over any part of
// any photo without darkening the image itself — unlike the old single fixed
// bottom-gradient overlay, layers can now sit anywhere on the cover.
function renderLayerSvg(layer: CoverTextLayer, family: string): string {
  const maxCharsPerLine = Math.max(6, Math.round(2200 / layer.fontSize))
  const lines = wrapText(layer.text.trim(), maxCharsPerLine).slice(0, 8)
  if (lines.length === 0) return ""

  const lineHeight = layer.fontSize * 1.15
  const cx = (layer.xPercent / 100) * WIDTH
  const cy = (layer.yPercent / 100) * HEIGHT
  const totalHeight = (lines.length - 1) * lineHeight
  const startY = cy - totalHeight / 2

  const tspans = lines
    .map((line, i) => `<tspan x="${cx}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("")

  const commonAttrs = `text-anchor="middle" font-family="${family}" font-size="${layer.fontSize}"`

  return `
    <text ${commonAttrs} fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="${layer.fontSize * 0.06}" stroke-linejoin="round">${tspans}</text>
    <text ${commonAttrs} fill="${escapeXml(layer.color)}">${tspans}</text>
  `
}

export async function renderCoverCard({
  backgroundType,
  backgroundValue,
  textLayers,
}: CoverCardInput): Promise<Buffer> {
  // Fonts are resolved by name against the real system fonts the Dockerfile
  // installs (via fontconfig) — sharp's SVG rasterizer (librsvg/Pango) has no
  // support for embedding a font directly in the SVG, so there's no file to
  // read here; only the family name needs to match.
  const layersSvg = textLayers
    .map((layer) => {
      const font = getCoverFont(layer.fontId)
      if (!font) throw new Error("Unknown font")
      return renderLayerSvg(layer, font.family)
    })
    .join("")

  const backgroundBuffer = await resolveBackgroundBuffer(backgroundType, backgroundValue)

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    ${layersSvg}
  </svg>`

  return sharp(backgroundBuffer)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .composite([{ input: Buffer.from(overlaySvg) }])
    .jpeg({ quality: 92 })
    .toBuffer()
}
