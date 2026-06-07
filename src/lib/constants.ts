export const BOOK_GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Thriller",
  "Mystery",
  "Horror",
  "Literary Fiction",
  "Historical Fiction",
  "Young Adult",
  "Contemporary",
  "Adventure",
  "Crime",
  "Dystopian",
  "Paranormal",
  "Non-Fiction",
  "Biography",
  "Self-Help",
  "Graphic Novel",
  "Poetry",
  "Children's",
] as const

export type BookGenre = (typeof BOOK_GENRES)[number]

export const LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "en", label: "English" },
  { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "de", label: "German" },
  { code: "nl", label: "Dutch" },
  { code: "ca", label: "Catalan" },
] as const

export const BOOK_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  PAUSED: "Paused",
}

export const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  BETA: "Beta",
  PUBLISHED: "Published",
}
