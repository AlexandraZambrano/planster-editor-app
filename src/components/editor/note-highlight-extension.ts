import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export interface NoteRange {
  id: string
  from: number
  to: number
}

// Keyed so callers can push updated ranges via a transaction meta
// (`editor.view.dispatch(editor.state.tr.setMeta(noteHighlightKey, ranges))`)
// without recreating the editor — recreating it would drop the writer's
// cursor position, selection, and undo history mid-edit.
export const noteHighlightKey = new PluginKey<DecorationSet>("noteHighlight")

export const NoteHighlight = Extension.create({
  name: "noteHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: noteHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(noteHighlightKey) as NoteRange[] | undefined
            if (meta) {
              const docSize = tr.doc.content.size
              const decorations = meta
                .filter((n) => n.from >= 0 && n.to <= docSize && n.from < n.to)
                .map((n) =>
                  Decoration.inline(n.from, n.to, {
                    class: "bg-violet-200/50 rounded-sm transition-colors",
                    "data-note-id": n.id,
                  })
                )
              return DecorationSet.create(tr.doc, decorations)
            }
            return old.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return noteHighlightKey.getState(state)
          },
        },
      }),
    ]
  },
})
