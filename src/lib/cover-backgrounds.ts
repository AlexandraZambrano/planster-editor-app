export interface CoverBackground {
  id: string
  url: string
}

export const COVER_BACKGROUNDS: CoverBackground[] = [
  { id: "bg-1", url: "/cover-backgrounds/bg-1.jpg" },
  { id: "bg-2", url: "/cover-backgrounds/bg-2.jpg" },
  { id: "bg-3", url: "/cover-backgrounds/bg-3.jpg" },
  { id: "bg-4", url: "/cover-backgrounds/bg-4.jpg" },
  { id: "bg-5", url: "/cover-backgrounds/bg-5.jpg" },
  { id: "bg-6", url: "/cover-backgrounds/bg-6.jpg" },
  { id: "bg-7", url: "/cover-backgrounds/bg-7.jpg" },
  { id: "bg-8", url: "/cover-backgrounds/bg-8.jpg" },
]

export function getCoverBackground(id: string): CoverBackground | undefined {
  return COVER_BACKGROUNDS.find((bg) => bg.id === id)
}
