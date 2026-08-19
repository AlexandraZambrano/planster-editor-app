"use client"

import { formatDistanceToNow } from "date-fns"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useDateLocale } from "@/lib/date-locale"
import type { MyInlineComment } from "@/actions/beta"

interface MyCommentsPanelProps {
  comments: MyInlineComment[] | null
  onClose: () => void
  onJump: (commentId: string) => void
}

export function MyCommentsPanel({ comments, onClose, onJump }: MyCommentsPanelProps) {
  const t = useTranslations("Reading")
  const dateLocale = useDateLocale()

  return (
    <aside className="fixed inset-y-0 right-0 top-[45px] w-80 border-l bg-background shadow-lg z-30 flex flex-col">
      <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
        <span className="text-sm font-semibold">{t("myCommentsTitle")}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {comments === null ? null : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMyComments")}</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <button
                key={comment.id}
                type="button"
                onClick={() => onJump(comment.id)}
                className="w-full text-left rounded-lg border p-3 space-y-1.5 hover:border-foreground/30 transition-colors"
                data-testid="my-comment"
              >
                <p className="text-xs italic text-muted-foreground border-l-2 pl-2 line-clamp-2">
                  &ldquo;{comment.selectedText}&rdquo;
                </p>
                <p className="text-sm">{comment.content}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateLocale })}
                </p>

                {comment.replies.length > 0 && (
                  <div className="space-y-1 pl-3 border-l">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="text-xs">
                        <span className="font-medium">@{reply.author.username}</span>{" "}
                        <span className="text-muted-foreground">{reply.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
