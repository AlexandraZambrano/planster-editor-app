import sharp from "sharp"
import { mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const outDir = join(root, "public/cover-backgrounds")
mkdirSync(outDir, { recursive: true })

const WIDTH = 1600
const HEIGHT = 2400

// On-brand, generated gradients for the cover designer's "Colores" tab — same
// technique as scripts/generate-quote-backgrounds.mjs, re-rendered at the
// book cover's 2:3 ratio instead of a square. Kept as its own duplicated
// config (not shared with the quote-card script) since it's 8 short lines.
const backgrounds = [
  { id: "bg-1", angle: 135, stops: ["#FFCF9C", "#FF8C6B"] },
  { id: "bg-2", angle: 135, stops: ["#FF8C6B", "#E8543F"] },
  { id: "bg-3", angle: 160, stops: ["#E8543F", "#7C3F82"] },
  { id: "bg-4", angle: 135, stops: ["#7C3F82", "#2C2153"] },
  { id: "bg-5", angle: 45, stops: ["#2C2153", "#7C3F82", "#E8543F"] },
  { id: "bg-6", angle: 90, stops: ["#FFCF9C", "#E8543F", "#2C2153"] },
  { id: "bg-7", angle: 200, stops: ["#2C2153", "#FF8C6B"] },
  { id: "bg-8", angle: 110, stops: ["#7C3F82", "#FFCF9C"] },
]

function gradientSvg({ angle, stops }) {
  const rad = (angle * Math.PI) / 180
  const x1 = 50 - Math.cos(rad) * 50
  const y1 = 50 - Math.sin(rad) * 50
  const x2 = 50 + Math.cos(rad) * 50
  const y2 = 50 + Math.sin(rad) * 50
  const stopEls = stops
    .map((color, i) => `<stop offset="${(i / (stops.length - 1)) * 100}%" stop-color="${color}" />`)
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        ${stopEls}
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)" />
  </svg>`
}

for (const bg of backgrounds) {
  const svg = Buffer.from(gradientSvg(bg))
  const out = join(outDir, `${bg.id}.jpg`)
  await sharp(svg).jpeg({ quality: 90 }).toFile(out)
  console.log(`wrote ${out}`)
}
