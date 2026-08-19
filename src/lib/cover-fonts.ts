export interface CoverFont {
  id: string
  label: string
  family: string
  fileName: string
}

// Curated set spanning the moods a book title needs to signal — dramatic
// serif, classic serif, bold condensed sans, versatile serif, high-impact
// display, and script. All OFL-licensed Google Fonts (free for any use, no
// attribution required), committed under public/fonts/covers/. `family` must
// match each font's real internal family name: the Dockerfile installs these
// same .ttf files as system fonts (via fontconfig) so sharp's SVG rasterizer
// (librsvg/Pango) can resolve them by name — Pango has no support for
// embedding a font directly in the SVG via @font-face, so real font
// installation is the only way that works. The client-side live preview
// (cover-preview.tsx) also references these same names via a normal
// browser @font-face rule pointing at the public .ttf files.
export const COVER_FONTS: CoverFont[] = [
  { id: "playfair-display", label: "Playfair Display", family: "Playfair Display", fileName: "playfair-display.ttf" },
  { id: "cormorant-garamond", label: "Cormorant Garamond", family: "Cormorant Garamond", fileName: "cormorant-garamond.ttf" },
  { id: "oswald", label: "Oswald", family: "Oswald", fileName: "oswald.ttf" },
  { id: "merriweather", label: "Merriweather", family: "Merriweather", fileName: "merriweather.ttf" },
  { id: "bebas-neue", label: "Bebas Neue", family: "Bebas Neue", fileName: "bebas-neue.ttf" },
  { id: "dancing-script", label: "Dancing Script", family: "Dancing Script", fileName: "dancing-script.ttf" },
]

export function getCoverFont(id: string): CoverFont | undefined {
  return COVER_FONTS.find((f) => f.id === id)
}
