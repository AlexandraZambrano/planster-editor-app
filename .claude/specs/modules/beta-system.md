# Module: Beta Reader System

## Beta request
- Available on the public book page (`/books/[bookId]`) if the book is in BETA or PUBLISHED status
- Any authenticated user can request if they are not already a beta reader or the author
- Form: motivation message field (max 500 chars, required)
- On submit: create `BetaReader` with PENDING status and notify the author

## Direct invitation by the author
- From the book panel, the author can search for a user by username or email
- If the user exists, create `BetaReader` with APPROVED status directly
- The invited user receives an approval notification

## Beta management panel (author)
- Three tabs: Pending / Approved / Rejected
- Each request shows: avatar, username, motivation message, date
- Actions on Pending: Approve / Reject
- Actions on Approved: Revoke access
- On approval: notify the reader
- On rejection: notify the reader

## Chapter visibility for betas
- Betas only see chapters where `visibility === 'BETA'` or `'PUBLISHED'`
- The beta reading view is the same as the regular reader view, plus the comment panel

## Beta reading experience (`/read/[bookId]/[chapterId]`)
- Clean view: only the chapter text, without the editor toolbar
- Minimal top bar: book title, chapter title, prev/next navigation
- Beta can select text → tooltip "Comment" appears → popover opens to write a comment
- At the end of the chapter: "Your review of this chapter" section (textarea, max 1000 chars, one submit per chapter per beta reader)
- A beta reader's comments are NOT visible to other betas
- On publishing a comment or review: notify the author

## Critical privacy rule
- Inline comments and reviews are ALWAYS private
- Only the author (`book.authorId`) can see them
- No endpoint should return comments to users who are not the book's author