import sharp from "sharp"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const standard = readFileSync(join(__dirname, "icon-source.svg"))
const maskable = readFileSync(join(__dirname, "icon-source-maskable.svg"))

const jobs = [
  { src: standard, out: "public/icons/icon-192.png", size: 192 },
  { src: standard, out: "public/icons/icon-512.png", size: 512 },
  { src: maskable, out: "public/icons/icon-maskable-512.png", size: 512 },
  { src: standard, out: "public/icons/apple-touch-icon.png", size: 180 },
  { src: standard, out: "src/app/icon.png", size: 256 },
  { src: standard, out: "src/app/apple-icon.png", size: 180 },
]

for (const job of jobs) {
  await sharp(job.src).resize(job.size, job.size).png().toFile(join(root, job.out))
  console.log(`wrote ${job.out} (${job.size}x${job.size})`)
}
