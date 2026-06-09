import { Mark, mergeAttributes, getMarkAttributes } from "@tiptap/core"

// Use a unique key to avoid conflict with @tiptap/extension-text-style's
// `textStyle` declaration which only has `removeEmptyTextStyle`.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customTextStyle: {
      setFontFamily: (fontFamily: string) => ReturnType
      unsetFontFamily: () => ReturnType
      setFontSize: (fontSize: string) => ReturnType
      unsetFontSize: () => ReturnType
      removeEmptyTextStyle: () => ReturnType
    }
  }
}

// Single custom TextStyle mark that owns fontFamily and fontSize directly in
// addAttributes. Using addGlobalAttributes on a separate extension does NOT
// register them in the ProseMirror mark schema, so Mark.fromJSON drops them on
// load. Defining them in addAttributes ensures they survive JSON round-trips.
export const TextStyle = Mark.create({
  name: "textStyle",

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element) => element.style.fontFamily || null,
        renderHTML: (attributes) => {
          if (!attributes.fontFamily) return {}
          return { style: `font-family: ${attributes.fontFamily}` }
        },
      },
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => {
          const hasStyles = (element as HTMLElement).getAttribute("style")
          if (!hasStyles) return false
          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { fontFamily }).run(),

      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain()
            .setMark(this.name, { fontFamily: null })
            .removeEmptyTextStyle()
            .run(),

      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { fontSize }).run(),

      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark(this.name, { fontSize: null })
            .removeEmptyTextStyle()
            .run(),

      removeEmptyTextStyle:
        () =>
        ({ state, commands }) => {
          const type = state.schema.marks[this.name]
          if (!type) return true
          const attributes = getMarkAttributes(state, type)
          const hasStyles = Object.entries(attributes).some(([, value]) => !!value)
          if (hasStyles) return true
          return commands.unsetMark(this.name)
        },
    }
  },
})

export const FONT_SIZES = ["10", "12", "14", "16", "18", "20", "24", "28", "36"] as const
export const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
] as const
