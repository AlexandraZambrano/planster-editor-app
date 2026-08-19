export interface CoverFont {
  id: string
  label: string
  family: string
  fileName: string
}

// Curated set spanning the moods a book title needs to signal — dramatic
// serif, classic serif, bold condensed sans, versatile serif, high-impact
// display, and script. All OFL-licensed Google Fonts (free for any use, no
// attribution required), committed under public/fonts/covers/ since sharp's
// SVG rasterizer can't rely on fontconfig being installed on the Alpine
// runner — see src/lib/cover-card.ts for how each is embedded as base64.
export const COVER_FONTS: CoverFont[] = [
  { id: "playfair-display", label: "Playfair Display", family: "Cover Playfair Display", fileName: "playfair-display.ttf" },
  { id: "cormorant-garamond", label: "Cormorant Garamond", family: "Cover Cormorant Garamond", fileName: "cormorant-garamond.ttf" },
  { id: "oswald", label: "Oswald", family: "Cover Oswald", fileName: "oswald.ttf" },
  { id: "merriweather", label: "Merriweather", family: "Cover Merriweather", fileName: "merriweather.ttf" },
  { id: "bebas-neue", label: "Bebas Neue", family: "Cover Bebas Neue", fileName: "bebas-neue.ttf" },
  { id: "dancing-script", label: "Dancing Script", family: "Cover Dancing Script", fileName: "dancing-script.ttf" },
]

export function getCoverFont(id: string): CoverFont | undefined {
  return COVER_FONTS.find((f) => f.id === id)
}
