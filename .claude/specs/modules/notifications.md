# Module: Notifications

## Technical implementation
- SSE (Server-Sent Events) via `GET /api/notifications/stream`
- The client connects when the notification bell component mounts and keeps the connection open
- Fallback: if SSE fails, poll every 30 seconds at `GET /api/notifications`

## Types and triggers

| Type | Recipient | Trigger |
|---|---|---|
| `BETA_REQUEST_RECEIVED` | Author | Someone submits a beta request |
| `BETA_REQUEST_APPROVED` | Reader | The author approves their request |
| `BETA_REQUEST_REJECTED` | Reader | The author rejects their request |
| `NEW_INLINE_COMMENT` | Author | A beta reader leaves an inline comment |
| `NEW_CHAPTER_REVIEW` | Author | A beta reader leaves a chapter review |
| `BOOK_SAVED` | Author | Someone saves their book to their library |
| `NEW_CHAPTER_PUBLISHED` | Reader | A chapter is published in a book in their library |
| `COMMENT_REPLY` | Beta reader | The author replies to their comment |

## JSON payload per type
- All include: `actorName`, `actorAvatarUrl`, `bookId`, `bookTitle`
- `NEW_INLINE_COMMENT` and `COMMENT_REPLY` also include: `chapterId`, `chapterTitle`, `commentId`
- `NEW_CHAPTER_PUBLISHED` also includes: `chapterId`, `chapterTitle`

## UI
- Bell icon in the navbar
- Red badge with the number of unread notifications (max "99+")
- Click → dropdown or `/notifications` page
- Each notification: actor avatar, descriptive text, relative time, unread indicator
- Actions: click on notification → navigate to relevant context and mark as read
- "Mark all as read" button
- Notifications ordered by `createdAt` descending