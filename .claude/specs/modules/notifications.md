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
| `NEW_FOLLOWER` | Followed user | Someone follows them (see modules/social.md) |
| `NEW_CHAPTER_COMMENT` | Author | A reader posts a public comment on a PUBLISHED chapter (see modules/social.md) |
| `MESSAGE_REQUEST_RECEIVED` | Recipient | Someone sends them a first message (see modules/messages.md) |
| `MESSAGE_REQUEST_ACCEPTED` | Initiator | Their message request was accepted (see modules/messages.md) |

## JSON payload per type
- All include: `actorName`, `actorAvatarUrl`, `bookId`, `bookTitle` (`bookId`/`bookTitle`
  are empty strings for the follow/message types, which have no associated book)
- `NEW_INLINE_COMMENT`, `COMMENT_REPLY`, and `NEW_CHAPTER_COMMENT` also include: `chapterId`, `chapterTitle`, `commentId` (comment types only)
- `NEW_CHAPTER_PUBLISHED` also includes: `chapterId`, `chapterTitle`
- `MESSAGE_REQUEST_RECEIVED` and `MESSAGE_REQUEST_ACCEPTED` also include: `conversationId`

## Note on chat messages
Ongoing chat messages (after the first one in a conversation) do **not** create
`Notification` rows — see modules/messages.md for the separate SSE channel used instead.
This keeps the notification bell reserved for discrete events, not continuous activity.

## UI
- Bell icon in the navbar
- Red badge with the number of unread notifications (max "99+")
- Click → dropdown or `/notifications` page
- Each notification: actor avatar, descriptive text, relative time, unread indicator
- Actions: click on notification → navigate to relevant context and mark as read
- "Mark all as read" button
- Notifications ordered by `createdAt` descending