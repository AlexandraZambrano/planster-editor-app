# Module: Discovery

## Home (`/`)
- "Featured" section: manually selected books (a `featured` field on Book, hardcoded for now)
- "Most recent" section: last 8 published books ordered by `updatedAt`
- "Popular" section: 8 books with the best average rating (minimum 3 ratings)
- Genre grid with links to `/explore?genre=...`

## Explore (`/explore`)
### Available filters
- Genre (multi-select)
- Language (select)
- Book status: In progress / Complete / Paused
- Minimum rating: 0, 1, 2, 3, 4

### Search
- Text field that searches across: book title, author username, tags
- Search with 300ms debounce
- Updates the URL with query params so the result is shareable

### Results
- Card grid with: cover, title, author, average rating, number of chapters, status, genres
- Pagination: 20 books per page

## Book page (`/books/[bookId]`)
- Large cover image
- Title, author (link to profile), genre badges, language, status
- Average rating with number of ratings
- Full synopsis
- List of published chapters (title and wordCount)
- "Save to library" button (if the user is authenticated and does not already have it)
- "Apply to be a beta reader" button (if the book is BETA or PUBLISHED, the user is authenticated, and is not already a beta reader)