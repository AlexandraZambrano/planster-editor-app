# Module: Writer's Studio

**Absolute privacy:** ALL Studio content is visible only to the book's author. No endpoint, page, or component should expose this data to other users.

## Studio hub (`/write/[bookId]/studio`)
- Entry page with cards linking to the 6 modules
- Quick stats: number of characters, locations, timeline entries, and notes

---

## 1. Plotting

### Board view
- Displays all book chapters as cards in columns (kanban-style)
- Each chapter card shows: title, order, and its scenes
- Click on a card → opens that chapter's plotting sheet

### Chapter plotting sheet
- Notes field (full Tiptap editor, smaller than the writing editor)
- Scene list:
  - Add scene with: title (required), optional description, characters (multi-select from the cast), location (select from world building)
  - Drag & drop to reorder scenes
  - Edit and delete scenes inline

---

## 2. Timeline

### View
- Horizontal timeline with scroll
- Each entry is a card: title, temporal moment, description, colour
- If the entry is linked to a chapter, the chapter title is shown as a badge
- Zoom in/out (at least 3 zoom levels)

### Entry management
- Add entry: modal with fields title, description, moment (free text), colour, optional chapter link
- Edit entry: click the card → inline editing or modal
- Delete: confirmation required
- Reorder: drag & drop along the timeline

---

## 3. Characters

### Character list
- Grid of cards with circular photo, name, storyRole
- "New character" button
- Click on a card → character sheet

### Character sheet (`/write/[bookId]/studio/characters/[characterId]`)
Organised in tabs or collapsible sections:

**Visual identity**
- Upload main image (Cloudinary: `planster/characters/`)
- Additional image gallery (max 10): multi-upload, reorderable, deletable
- Full name, nickname, age, date of birth

**Physical description**
- Fields with descriptive labels (short text inputs):
  - Height | Weight | Build
  - Eye colour | Hair colour | Hair style
  - Notable facial features | Tattoos / scars / marks
  - Usual clothing style
- Textarea for additional physical notes

**Story**
- StoryRole select (PROTAGONIST / ANTAGONIST / SECONDARY / TERTIARY / OTHER) + free-text note field
- Textarea: Short term goals (what the character wants in the short term)
- Textarea: Long term goals (what the character wants long term)

**Backstory**
- Full Tiptap editor for the character's past

**Links — bonds with other characters**
- List of existing links: other character's photo, name, relationship type, note
- "Add link" button: modal with character select, relationship type select, note field
- Links are bidirectional: creating A→B also appears on B's sheet
- Delete link with confirmation
- Types: FRIEND / ENEMY / LOVER / FAMILY / MENTOR / RIVAL / UNKNOWN / OTHER

---

## 4. World Building

### Location list
- Hierarchical tree (parent location → sub-locations)
- Each item shows name and thumbnail image
- "New location" button

### Location sheet
- Name (required)
- Parent location select (optional, for sub-locations)
- Tiptap editor for description
- Image gallery (Cloudinary: `planster/locations/`)
- Associated characters: multi-select from the book's cast + link note
- Sub-location list (cards with links to their sheets)

---

## 5. Board

### Canvas (React Flow)
- Infinite canvas with panning and zoom (ctrl+scroll or pinch)
- Left-side toolbar with buttons to add elements:
  - Character: opens modal to select from cast → creates CHARACTER node
  - Location: opens modal to select → creates LOCATION node
  - Note: creates NOTE node with editable textarea and colour selector
  - Image: opens file picker → uploads to Cloudinary → creates IMAGE node

### Character nodes
- Shows: circular photo, name, storyRole badge
- Automatic connections (CharacterLink) are rendered as edges with the relationship type as label
- Edge colour by type: red=ENEMY, pink=LOVER, blue=FRIEND/FAMILY, etc.

### Location nodes
- Shows: thumbnail image, name

### Note nodes
- Editable post-it with selectable background colour

### Interactions
- Drag & drop all nodes
- Click on a character node → link to character sheet (new tab)
- Click on a location node → link to location sheet (new tab)
- Create manual connection: drag from a node handle to another
- Delete node: select + Delete key or contextual toolbar button
- Delete manual connection: select + Delete

### Persistence
- Node position (x, y) is saved in `BoardElement.posX` and `posY`
- Manual connections are saved in `BoardConnection` with `isAutomatic: false`
- Automatic connections (CharacterLink) are regenerated on each load

### Multiple boards
- The author can have multiple boards per book (e.g. "Characters", "World map")
- A board selector at the top of the page

---

## 6. Free Notes

- List of notes with title, content preview, and tags
- Search by title and tags
- Create note: title + Tiptap editor + tag selector (free-text input)
- Notes auto-save with a 2-second debounce
- Delete note with confirmation