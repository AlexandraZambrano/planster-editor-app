import { COVER_FONTS } from "./cover-fonts"

// A single freely-positioned piece of text on a designed cover — the title,
// the author's name, or any other text the writer wants to add. Position is
// stored as percentages of the cover's own width/height so it stays correct
// regardless of the coordinate space it's rendered in (the small CSS
// preview vs. the full 1600x2400 server render).
export interface CoverTextLayer {
  id: string
  text: string
  xPercent: number // 0-100, horizontal center of the text
  yPercent: number // 0-100, vertical center of the text
  fontId: string
  color: string
  fontSize: number // in the 1600x2400 render's coordinate space
}

export function createTextLayer(overrides: Partial<CoverTextLayer> = {}): CoverTextLayer {
  return {
    id: crypto.randomUUID(),
    text: "",
    xPercent: 50,
    yPercent: 50,
    fontId: COVER_FONTS[0].id,
    color: "#FFFFFF",
    fontSize: 92,
    ...overrides,
  }
}

export function createTitleLayer(titleText: string): CoverTextLayer {
  return createTextLayer({ text: titleText, yPercent: 78, fontSize: 92 })
}
