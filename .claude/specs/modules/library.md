# Module: Library & Shelves

## Saving a book
- Available on the public page of any PUBLISHED book
- On save: create a record in `Library`
- On save: notify the book's author
- The button changes to "Saved ✓" if the book is already in the library

## Rating
- The user can rate a book from 0 to 5 (half stars allowed: 0, 0.5, 1, 1.5... 5)
- Only books in the user's library can be rated
- The rating updates `Library.rating`
- The book's average rating is calculated at query time (AVG of all non-null ratings)

## Library view
- Cover grid with: title, author, user rating, shelf indicator(s)
- Filters: by shelf, by genre, by book status
- Sort by: date saved, rating, title

## System shelves (isSystem: true, cannot be deleted)
- "Reading now"
- "Want to read"
- "Read"
- Created automatically when the user registers

## Custom shelves
- The user can create, rename, and delete custom shelves
- Name: max 50 characters
- A book can be in multiple shelves simultaneously
- Private by default; the user can make them public (visible on their profile)

## Adding a book to a shelf
- From the library or from the book page
- Modal with checkboxes for all the user's shelves
- When adding to "Reading now": automatically remove from "Want to read" if present
- When adding to "Read": automatically remove from "Reading now" if present