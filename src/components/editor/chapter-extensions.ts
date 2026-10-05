import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "./font-size"

// Every extension that defines the *schema* of chapter content (its nodes and marks).
// The writer's editor and the reader must both load exactly this list: if the reader
// doesn't know a mark the editor saved (e.g. underline), Tiptap rejects the whole
// document and the chapter renders blank. Decoration-only plugins (note/comment
// highlights) are added per screen on top of this.
export const chapterSchemaExtensions = [
  StarterKit,
  TextStyle,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
]
