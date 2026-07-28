# Module: Books & Chapters

## Book creation
- Fields: title (required), synopsis (max 2000 chars), cover image, genres[], tags[] (max 10), language, bookStatus
- Cover image: JPG/PNG/WEBP, minimum 1600×2400px (2:3 ratio), max 5MB
  - Show a visual size guide in the upload form
  - Upload to Cloudinary under `planster/covers/`
- On creation, publicationStatus defaults to DRAFT
- When a chapter is added, automatically create its empty PlotNote

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