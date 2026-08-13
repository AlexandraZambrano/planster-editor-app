# Module: Social (Follow + Public Chapter Comments & Ratings)

## Follow

- Any authenticated user can follow/unfollow any other user (no approval needed — unlike
  messaging, see `messages.md`)
- `Follow` model: `followerId` + `followingId`, unique pair
- Following someone creates a `NEW_FOLLOWER` notification for the followed user
- The public profile (`/@[username]`) shows follower/following counts and a Follow/Unfollow
  button (hidden on your own profile)
- Server actions: `src/actions/follow.ts` — `followUser`, `unfollowUser`, `getFollowState`,
  `getFollowing` (used by the quote-share "send to a friend" picker, see `messages.md`)

## Public chapter comments & ratings

- Distinct from the private beta system (`InlineComment`/`ChapterReview` in
  `beta-system.md`) — those stay exactly as they are, private, beta-reader-to-author only.
  This is a separate, additive, fully public layer.
- Available on any chapter with `visibility === "PUBLISHED"`, to any authenticated reader
  who is not the chapter's author
- `ChapterComment`: free-text comment, max 1000 characters, deletable only by its author
- `ChapterRating`: 0–5 stars with half-star support (same convention as `Library.rating`),
  one rating per user per chapter (upsert), average computed at query time
- Posting a comment creates a `NEW_CHAPTER_COMMENT` notification for the chapter's author.
  Rating does **not** notify — matches the existing precedent that `Library.rating` changes
  don't notify either
- Server actions: `src/actions/chapter-social.ts` — `postChapterComment`,
  `deleteChapterComment`, `rateChapter`, `getChapterSocial`
- UI: `src/components/reading/chapter-social.tsx`, rendered below the chapter text in
  `src/app/(app)/read/[bookId]/[chapterId]/reading-view.tsx`, visually separate from the
  beta-only review section above it

## Discovering people (`/explore/people`)

- A "Personas"/"People" tab next to the book catalogue (`ExploreTabs`, shared between
  `/explore` and `/explore/people`)
- **Search**: by username or display name (case-insensitive substring match), same
  URL-param + 300ms-debounce pattern as book search (`src/actions/people.ts`
  `searchUsers()`) — excludes the viewer from their own results
- **Follow suggestions ("people you may know")**: shown when the search box is empty.
  Ranked by second-degree connections — users followed by people the viewer already
  follows, excluding the viewer and anyone already followed (`getFollowSuggestions()`,
  a `Follow` self-join grouped by candidate and ordered by connection count). Each
  suggestion shows which of the viewer's follows connects them ("Followed by X")
- Both use the same `PersonCard` component and the existing `FollowButton`
  (`src/components/profile/follow-button.tsx`)

## Critical rule

Public comments/ratings are gated server-side on `chapter.visibility === "PUBLISHED"` and
`viewer !== chapter.book.authorId` in every action — never trust a UI-level gate alone.
