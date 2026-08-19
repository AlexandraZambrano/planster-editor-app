import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export interface CommentRange {
  id: string
  from: number
  to: number
}

export const CommentHighlight = Extension.create<{ comments: CommentRange[] }>({
  name: "commentHighlight",

  addOptions() {
    return { comments: [] }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: new PluginKey("commentHighlight"),
        props: {
          decorations(state) {
            const docSize = state.doc.content.size
            const decorations = options.comments
              .filter((c) => c.from >= 0 && c.to <= docSize && c.from < c.to)
              .map((c) =>
                Decoration.inline(c.from, c.to, {
                  class: "bg-amber-200/60 rounded-sm transition-colors",
                  "data-comment-id": c.id,
                })
              )
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
