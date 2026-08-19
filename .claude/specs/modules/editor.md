# Module: Text Editor

## Technology
- Tiptap with StarterKit (already in the repo)
- Additional extensions needed: `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-font-family`, `@tiptap/extension-font-size`, `@tiptap/extension-horizontal-rule`

## Editor layout
- Background: light gray `#F9FBFD`
- Page: white, 816px wide, subtle shadow, 56px horizontal / 40px vertical padding
- Toolbar: fixed at the top, above the page

## Toolbar
- Bold, italic, underline, strikethrough
- Font family selector (list: Georgia, Arial, Times New Roman, Courier New)
- Font size selector (10, 12, 14, 16, 18, 20, 24, 28, 36)
- Alignment: left, centre, right, justified
- Ordered list, unordered list
- Insert horizontal rule
- Undo / redo
- Visual separators between button groups

## Auto-save
- 2-second debounce after the last keystroke
- Explicit save every 30 seconds
- Status indicator in the bottom bar: "Saved ✓" | "Saving..." | "Error saving"
- On save: update `chapter.content`, `chapter.wordCount`, and record a `WordCountLog` entry

## Word counter
- Shown in the bottom-left bar in real time
- Count words from plain text (no HTML/markdown)

## Focus mode
- Toggle in the toolbar (fullscreen icon)
- Hides: navbar, sidebar, side panel
- The editor fills the entire screen with only the toolbar visible

## Private author notes

- The author can select text in their own chapter and leave a private note on it — visible
  only to them, never to beta readers or public readers. Distinct from the beta system's
  `InlineComment` (beta-reader-to-author, see beta-system.md) and from `BookNote` (freeform
  Writer's Studio notes, not tied to a text position)
- `AuthorNote` model: `chapterId`, `selectedText`, `fromPos`, `toPos`, `content`
- Server actions: `src/actions/author-notes.ts` — `createAuthorNote`, `getAuthorNotes`,
  `deleteAuthorNote` — all gated on `session.user.id === chapter.book.authorId`
- UI: selecting text shows a "Private note" floating action (same selection mechanic as the
  beta reader's inline-comment button in the reading view); a "My notes" toggle in the
  editor's top bar opens a panel listing all notes on the chapter, click-to-jump highlights
  the passage. Highlighting is implemented as a ProseMirror decoration plugin
  (`src/components/editor/note-highlight-extension.ts`) updated via transaction meta so the
  editor is never recreated mid-edit (which would drop cursor position and undo history)

## Beta inline comments & reviews (author view)
- A "Beta feedback" button in the editor's top bar (badge = unresolved comments +
  reviews) opens a right side panel — `src/components/editor/beta-feedback-panel.tsx`,
  data via `getChapterComments()` / `getChapterReviews()` in `src/actions/beta.ts`
- Comments section: list ordered by position in the text, each showing beta reader
  name, the quoted selected text, the comment, and date
- Author actions: "Mark as resolved" (hides the comment from the default view),
  "Reply" (opens a thread, visible to that beta reader)
- Resolved comments are hidden by default, with a "Show resolved (N)" toggle
- Reviews section: full-chapter reviews from beta readers, read-only for the author
- Not yet implemented: highlighting the commented text fragment inline in the editor
  itself (the panel is the only way to see *which* passage a comment refers to,
  via its quoted `selectedText` — there's no in-document highlight yet)
- Beta readers do NOT have access to the full editor; they read at `/read/[bookId]/[chapterId]`

## Access
- Only the book's author can access the editor
- Verify in the page's Server Component that `session.user.id === book.authorId`