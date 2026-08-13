export interface QuoteBackground {
  id: string
  url: string
}

export const QUOTE_BACKGROUNDS: QuoteBackground[] = [
  { id: "bg-1", url: "/quote-backgrounds/bg-1.jpg" },
  { id: "bg-2", url: "/quote-backgrounds/bg-2.jpg" },
  { id: "bg-3", url: "/quote-backgrounds/bg-3.jpg" },
  { id: "bg-4", url: "/quote-backgrounds/bg-4.jpg" },
  { id: "bg-5", url: "/quote-backgrounds/bg-5.jpg" },
  { id: "bg-6", url: "/quote-backgrounds/bg-6.jpg" },
  { id: "bg-7", url: "/quote-backgrounds/bg-7.jpg" },
  { id: "bg-8", url: "/quote-backgrounds/bg-8.jpg" },
]

export function getQuoteBackground(id: string): QuoteBackground | undefined {
  return QUOTE_BACKGROUNDS.find((bg) => bg.id === id)
}
