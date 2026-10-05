import { describe, it, expect } from "vitest"
import { getSchema } from "@tiptap/core"
import { chapterSchemaExtensions } from "./chapter-extensions"

// A chapter using every formatting option the editor toolbar offers. If the reader's
// schema can't parse this, Tiptap silently swaps in an empty document (blank chapter).
const formattedChapter = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        { type: "text", text: "underlined", marks: [{ type: "underline" }] },
        { type: "text", text: " bold", marks: [{ type: "bold" }, { type: "strike" }] },
        { type: "text", text: " sized", marks: [{ type: "textStyle", attrs: { fontSize: "18px", fontFamily: "Georgia" } }] },
      ],
    },
    { type: "horizontalRule" },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item" }] }] }] },
  ],
}

describe("chapterSchemaExtensions", () => {
  it("parses a chapter that uses every editor format", () => {
    const schema = getSchema(chapterSchemaExtensions)
    const doc = schema.nodeFromJSON(formattedChapter)
    expect(doc.textContent).toContain("underlined bold sized")
  })
})
