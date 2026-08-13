# Routes — Planster

## Public routes (no authentication required)

| Route | File | Description |
|---|---|---|
| `/` | `src/app/(public)/page.tsx` | Home: featured books, recent, genres |
| `/explore` | `src/app/(public)/explore/page.tsx` | Catalogue with filters and search |
| `/explore/people` | `src/app/explore/people/page.tsx` | Search for users by name/username, and follow suggestions ("people you may know") |
| `/books/[bookId]` | `src/app/(public)/books/[bookId]/page.tsx` | Public book page |
| `/@[username]` | `src/app/profile/[username]/page.tsx` (via rewrite — `@folder` is reserved for Next.js parallel routes and can't itself produce a URL) | User public profile |
| `/auth/login` | `src/app/(auth)/login/page.tsx` | Login |
| `/auth/register` | `src/app/(auth)/register/page.tsx` | Register |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy Policy (GDPR-oriented, linked from registration and the home footer) |
| `/share/[shareId]` | `src/app/share/[shareId]/page.tsx` | Public landing page for an externally-shared quote card — real OG image for link previews, "read this book" / "join Planster" CTAs |

## Authenticated routes (session required)

| Route | File | Description |
|---|---|---|
| `/library` | `src/app/(app)/library/page.tsx` | Personal library |
| `/library/shelves` | `src/app/(app)/library/shelves/page.tsx` | Shelf management |
| `/notifications` | `src/app/(app)/notifications/page.tsx` | Notification centre |
| `/settings` | `src/app/(app)/settings/page.tsx` | Profile settings |
| `/messages` | `src/app/(app)/messages/page.tsx` | Message inbox — conversations + pending requests |
| `/messages/[conversationId]` | `src/app/(app)/messages/[conversationId]/page.tsx` | Message thread |
| `/messages/u/[username]` | `src/app/(app)/messages/u/[username]/page.tsx` | Start (or resume) a conversation with a user by username |

## Writer routes

| Route | File | Description |
|---|---|---|
| `/write` | `src/app/(app)/write/page.tsx` | Dashboard: my books + global writing goals |
| `/write/new` | `src/app/(app)/write/new/page.tsx` | Create new book |
| `/write/[bookId]` | `src/app/(app)/write/[bookId]/page.tsx` | Book panel: chapters, betas, settings |
| `/write/[bookId]/editor/[chapterId]` | `src/app/(app)/write/[bookId]/editor/[chapterId]/page.tsx` | Chapter editor |
| `/write/[bookId]/goals` | `src/app/(app)/write/[bookId]/goals/page.tsx` | Writing Goals + charts |

## Writer's Studio routes

| Route | File | Description |
|---|---|---|
| `/write/[bookId]/studio` | `src/app/(app)/write/[bookId]/studio/page.tsx` | Studio hub |
| `/write/[bookId]/studio/plotting` | `.../studio/plotting/page.tsx` | Chapter-by-chapter plotting |
| `/write/[bookId]/studio/timeline` | `.../studio/timeline/page.tsx` | Story timeline |
| `/write/[bookId]/studio/characters` | `.../studio/characters/page.tsx` | Character list |
| `/write/[bookId]/studio/characters/[characterId]` | `.../studio/characters/[characterId]/page.tsx` | Character sheet |
| `/write/[bookId]/studio/worldbuilding` | `.../studio/worldbuilding/page.tsx` | Location list |
| `/write/[bookId]/studio/worldbuilding/[locationId]` | `.../studio/worldbuilding/[locationId]/page.tsx` | Location sheet |
| `/write/[bookId]/studio/board` | `.../studio/board/page.tsx` | Interactive board (React Flow) |
| `/write/[bookId]/studio/notes` | `.../studio/notes/page.tsx` | Free notes |

## Reading routes

| Route | File | Description |
|---|---|---|
| `/read/[bookId]/[chapterId]` | `src/app/(app)/read/[bookId]/[chapterId]/page.tsx` | Reading view (reader or beta) |

## API Routes

| Route | Description |
|---|---|
| `/auth/callback` | Supabase OAuth redirect handler (Google sign-in) |
| `/api/notifications/stream` | SSE notification stream |
| `/api/messages/stream` | SSE chat message stream (separate channel from notifications) |
| `/api/upload` | Cloudinary image upload endpoint |
| `/api/quote-card` | Generates a quote-card PNG (background + quote + caption) and uploads it to Cloudinary |

## Access notes

- Routes under `/write/[bookId]/**` verify that the authenticated user is the book's author
- `/read/[bookId]/[chapterId]` verifies chapter visibility based on the user's role
- The Writer's Studio is only accessible by the author; any other user receives a 403
- `/messages/**` requires authentication (in `PROTECTED_PREFIXES`); `/messages/[conversationId]`
  verifies the viewer is one of the two participants