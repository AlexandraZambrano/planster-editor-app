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

## Beta inline comments
- Visible only when the author reviews their own chapter
- Commented text fragments are highlighted in light yellow
- Right side panel: list of comments ordered by position in the text
- Each comment shows: beta reader name, selected text, comment, date
- Author actions: "Mark as resolved" (archives the comment), "Reply" (opens a thread)
- Resolved comments are hidden by default (toggle to show them)
- Beta readers do NOT have access to the full editor; they read at `/read/[bookId]/[chapterId]`

## Access
- Only the book's author can access the editor
- Verify in the page's Server Component that `session.user.id === book.authorId`