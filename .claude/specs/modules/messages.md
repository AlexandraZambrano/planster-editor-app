# Module: Direct Messages & Quote Sharing

## Direct messages

- Any authenticated user can message any other user, regardless of follow status in either
  direction
- Every brand-new conversation starts with `status: PENDING` — the recipient must accept or
  decline before the conversation becomes a free-flowing chat. The initiator can keep
  sending messages into a `PENDING` conversation (they queue behind the request); the
  recipient cannot reply until they accept
- Once `ACCEPTED`, both participants message freely
- Once `DECLINED`, the initiator cannot send into that conversation again (same permanence
  convention as a rejected beta request)
- `Conversation` model: `userAId`/`userBId` normalized (lower id first, lexicographically,
  normalized in the server action — not enforced by the DB) so `@@unique([userAId, userBId])`
  guarantees exactly one conversation per pair of users; `initiatorId` tracks who started it
- `Message` model: `content` (text) and/or `imageUrl`/`quoteMeta` (quote-card messages, see
  below); `readAt` set when the recipient opens the thread
- The first message of a new conversation creates a `MESSAGE_REQUEST_RECEIVED` notification
  for the recipient; accepting creates `MESSAGE_REQUEST_ACCEPTED` for the initiator. Every
  message after that relies purely on the SSE/poll channel below — an ongoing chat never
  floods the notification bell with one row per message
- Server actions: `src/actions/messages.ts` — `sendMessage`, `respondToConversation`,
  `getConversations`, `getMessages`, `markConversationRead`, `getUnreadSummary`,
  `findConversationWithUser`

### Real-time delivery

- Separate SSE channel from notifications, on purpose (`src/lib/message-events.ts` +
  `GET /api/messages/stream`) — mirrors the notification SSE pattern
  (`notification-events.ts` + `/api/notifications/stream`) but kept independent so chat
  volume never affects the notification bell
- Client fallback: 30s polling via `getUnreadSummary()`, same pattern as `NotificationBell`

### UI

- `/messages` — inbox: Requests tab (pending, viewer is recipient) + Conversations tab
- `/messages/[conversationId]` — thread view
- `/messages/u/[username]` — starts (or resumes, via redirect) a conversation with a user by
  username; used by the profile page's "Message" button
- Nav: `MessagesBell` (`src/components/messages/messages-bell.tsx`) next to the notification
  bell, badge = pending requests + unread messages

## Quote sharing

Triggered from the chapter reader (`reading-view.tsx`): selecting text on a `PUBLISHED`
chapter shows a "Compartir cita" action (available to any authenticated reader, not gated
to beta readers like the adjacent inline-comment action) that opens `QuoteShareDialog`.

- Background images are **generated on-brand gradients**, not stock photography — see
  `scripts/generate-quote-backgrounds.mjs`, output in `public/quote-backgrounds/`,
  referenced via `src/lib/quote-backgrounds.ts`
- **In-app share**: picks a followed user (`getFollowing()`, see `social.md`) and calls
  `sendMessage(recipientId, { quoteCard: {...} })` — stored in `Message.quoteMeta`, no image
  file generated, rendered client-side in the thread as a styled card
- **External share**: `POST /api/quote-card` takes `{ quote, backgroundId, bookId, chapterId }`
  — book/chapter titles are looked up server-side from the DB (never trusted from the
  client), which doubles as the access check: only a `PUBLISHED` chapter can be turned into
  a share. It composites the quote + background + caption into a PNG (`src/lib/quote-card.ts`,
  using `sharp`), uploads it to Cloudinary (`planster/quote-cards/`) via the existing
  `uploadImage()` helper, and persists a `QuoteShare` row (`bookId`, `chapterId`, `quote`,
  `imageUrl`). The response includes both the raw Cloudinary `url` (used client-side to
  download the actual image bytes as a blob — a plain `<a download>` doesn't work for a
  cross-origin URL) and `shareUrl`, an absolute link to `/share/[shareId]`
  (`src/app/share/[shareId]/page.tsx`) — a public landing page with a real OG image (so link
  previews on WhatsApp/X/etc. show the quote card itself), the quote, and two CTAs: read the
  book (`/books/[bookId]`) or create a free account (`/auth/register`). The Web Share API and
  "copy link" both share this page URL, not the raw image URL — `getQuoteShare()`
  (`src/actions/quote-share.ts`) powers both the page and its `generateMetadata`.
