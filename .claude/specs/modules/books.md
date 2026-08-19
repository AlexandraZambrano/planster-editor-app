# Module: Books & Chapters

## Book creation
- Fields: title (required), synopsis (max 2000 chars), cover image, genres[], tags[] (max 10), language, bookStatus
- Cover image: JPG/PNG/WEBP, minimum 1600×2400px (2:3 ratio), max 5MB
  - Show a visual size guide in the upload form
  - Upload to Cloudinary under `planster/covers/`
  - Alternative to a manual upload: the in-app **cover designer** (see below)
- On creation, publicationStatus defaults to DRAFT
- When a chapter is added, automatically create its empty PlotNote

## Cover designer

An alternative to uploading a pre-made image, available from a toggle next to the cover
upload box in `BookForm` (`src/components/book/book-form.tsx`), both driving the same
`coverUrl` field:

- **Background**: a preset on-brand gradient (`src/lib/cover-backgrounds.ts`,
  `public/cover-backgrounds/`), the author's own uploaded image, or a free stock photo
  searched via the Unsplash API (`src/actions/cover-design.ts` `searchStockPhotos()` — needs
  the `UNSPLASH_ACCESS_KEY` env var, starts in "Demo" mode at 50 req/hour until Unsplash
  approves production access). Unsplash's API guidelines require two things on every use:
  visible attribution — "Photo by {name} on Unsplash", shown next to the live preview
  whenever a stock background is selected — and a tracking ping to the photo's
  `download_location` at the moment it's picked (`trackStockPhotoUsage()`), not merely when
  shown in search results. Both the photographer's name and profile link are stored on
  `BookCoverDesign` so the credit persists across edits
- **Text**: the cover itself is the editing surface — any number of freely-positioned text
  layers (title, author name, or anything else), each independently draggable, typed
  directly in place, and styled with its own font (one of 6 curated Google Fonts, see
  `src/lib/cover-fonts.ts`, `public/fonts/covers/*.ttf`), color, and size
  (`src/lib/cover-text-layers.ts` `CoverTextLayer`). A new book starts with one title layer
  pre-filled with the book's title; "+ Add text" adds more. Click a layer to select and edit
  its text inline; a small grip handle appears above the selected layer to drag-reposition it
  (`src/components/book/cover-designer/cover-preview.tsx`)
- The server composites the final cover (`src/lib/cover-card.ts`, via `POST
  /api/cover-design`) with `sharp`: each layer is rendered as a stroked "halo" text behind a
  solid fill (legible over any part of any photo, without darkening the image), positioned by
  percentage so it matches the live preview regardless of coordinate space. Always renders at
  exactly 1600×2400px — so a designed cover can never fail the manual-upload path's size
  requirement — and uploads to Cloudinary under the same `planster/covers/` folder
- The chosen recipe (background + all text layers) is saved in `BookCoverDesign` (1:1 with
  `Book`, `textLayers` as `Json`) so reopening the designer later pre-fills it, making
  "design a cover" double as "edit this cover". Switching back to a plain manual upload
  deletes the stale recipe row
- When editing an existing book, "Save cover" persists immediately —
  `updateBookCover()` (`src/actions/books.ts`) updates just `Book.coverUrl` and the
  `BookCoverDesign` recipe on its own, independent of the rest of `BookForm`. This matters
  because the dialog's own save is a small, self-contained step; requiring the writer to
  also submit the whole book form afterward for it to actually take effect would make "Save
  cover" a lie. Creating a brand-new book (no `bookId` yet) still defers to the normal
  create-book submit, since there's no book row to attach the recipe to until then
- Only `Book.coverUrl` (not `BookCoverDesign`) is ever shown to readers as the actual cover
  image — the recipe is a private editing aid for the author. The one exception is the stock
  photo credit: when the background came from Unsplash, `getBookPageData()`
  (`src/actions/discovery.ts`) surfaces `stockPhotographerName`/`stockPhotographerUrl` as
  `coverPhotoCredit`, shown on the public book page right before the synopsis — required by
  Unsplash's attribution policy. The cover designer's "Photos" tab shows a standing notice
  warning the author about this before they pick a stock photo

## Publication status
- `DRAFT` → only the author can see it
- `BETA` → visible only to BetaReaders with APPROVED status
- `PUBLISHED` → visible in the catalogue for all users

## Chapters
- Ordered by the `order` field (integer, starting at 1)
- Reorder with drag & drop → update the `order` field on all affected chapters
- Chapter visibility is independent of the book's status
- When a chapter is created, automatically create its empty `PlotNote`
- When the editor saves, update `chapter.wordCount` and record a `WordCountLog` entry

## Book panel (`/write/[bookId]`)
- List of chapters with their visibility, wordCount, and last edited date
- Buttons: new chapter, reorder, change visibility, delete
- Beta section: access to the beta reader management panel
- Settings section: edit book metadata, change publication status, delete book

## Validations
- Title: max 200 characters
- Tags: max 10, each tag max 30 characters
- Genres: at least 1 required to publish (not required to save as DRAFT)
- Cannot delete a book with approved beta readers without explicit confirmation