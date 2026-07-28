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

// Preset license badge the author can pick for a book — a display-only notice,
// not a rights-management system. `url` links to the human-readable deed for
// Creative Commons options; null for licenses with no external reference page.
export const BOOK_LICENSES = [
  { code: "ALL_RIGHTS_RESERVED", url: null },
  { code: "CC_BY", url: "https://creativecommons.org/licenses/by/4.0/" },
  { code: "CC_BY_NC", url: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { code: "CC_BY_NC_ND", url: "https://creativecommons.org/licenses/by-nc-nd/4.0/" },
  { code: "PUBLIC_DOMAIN", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
] as const

export type BookLicenseCode = (typeof BOOK_LICENSES)[number]["code"]
