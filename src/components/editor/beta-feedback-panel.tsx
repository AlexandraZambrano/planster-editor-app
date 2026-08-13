"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { X, Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useDateLocale } from "@/lib/date-locale"
import {
  getChapterComments,
  getChapterReviews,
  resolveInlineComment,
  replyToComment,
  type CommentWithReplies,
  type ChapterReviewEntry,
} from "@/actions/beta"

interface BetaFeedbackPanelProps {
  chapterId: string
  onClose: () => void
  onChange?: () => void
}

function Avatar({ user }: { user: { displayName: string; avatarUrl: string | null } }) {
  return (
    <div className="relative h-7 w-7 rounded-full overflow-hidden bg-muted shrink-0">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" sizes="28px" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82] text-white text-[10px] font-bold">
          {user.displayName[0]?.toUpperCase()}
        </div>
      )}
    </div>
  )
}

export function BetaFeedbackPanel({ chapterId, onClose, onChange }: BetaFeedbackPanelProps) {
  const t = useTranslations("Editor")
  const dateLocale = useDateLocale()
  const [comments, setComments] = useState<CommentWithReplies[] | null>(null)
  const [reviews, setReviews] = useState<ChapterReviewEntry[] | null>(null)
  const [showResolved, setShowResolved] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  function reload() {
    getChapterComments(chapterId).then((r) => setComments(r.comments ?? []))
    getChapterReviews(chapterId).then((r) => setReviews(r.reviews ?? []))
  }

  useEffect(reload, [chapterId])

  async function handleResolve(commentId: string) {
    setComments((prev) => prev?.map((c) => (c.id === commentId ? { ...c, resolved: true } : c)) ?? null)
    await resolveInlineComment(commentId)
    onChange?.()
  }

  async function handleReply(commentId: string) {
    const text = replyText.trim()
    if (!text) return
    const result = await replyToComment(commentId, text)
    if (!result.error) {
      setReplyText("")
      setReplyingTo(null)
      reload()
    }
  }

  const unresolved = comments?.filter((c) => !c.resolved) ?? []
  const resolved = comments?.filter((c) => c.resolved) ?? []
  const visibleComments = showResolved ? [...unresolved, ...resolved] : unresolved

  return (
    <aside className="w-96 shrink-0 border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
        <span className="text-sm font-semibold">{t("panelTitle")}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("closePanel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3">{t("commentsSection")}</h3>

          {comments === null ? null : visibleComments.length === 0 && resolved.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noComments")}</p>
          ) : (
            <div className="space-y-4">
              {visibleComments.map((comment) => (
                <div key={comment.id} className="rounded-lg border p-3 space-y-2" data-testid="beta-comment">
                  <div className="flex items-center gap-2">
                    <Avatar user={comment.betaReader.user} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{comment.betaReader.user.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateLocale })}
                      </p>
                    </div>
                    {comment.resolved && (
                      <span className="ml-auto text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        {t("resolvedBadge")}
                      </span>
                    )}
                  </div>

                  <p className="text-xs italic text-muted-foreground border-l-2 pl-2 line-clamp-2">
                    &ldquo;{comment.selectedText}&rdquo;
                  </p>
                  <p className="text-sm">{comment.content}</p>

                  {comment.replies.length > 0 && (
                    <div className="space-y-1.5 pl-3 border-l">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="text-xs">
                          <span className="font-medium">@{reply.author.username}</span>{" "}
                          <span className="text-muted-foreground">{reply.content}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingTo === comment.id ? (
                    <div className="space-y-1.5">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t("replyPlaceholder")}
                        rows={2}
                        className="text-xs"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => {
                            setReplyingTo(null)
                            setReplyText("")
                          }}
                        >
                          {t("cancel")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 text-xs"
                          disabled={!replyText.trim()}
                          onClick={() => handleReply(comment.id)}
                        >
                          {t("send")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setReplyingTo(comment.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t("reply")}
                      </button>
                      {!comment.resolved && (
                        <button
                          type="button"
                          onClick={() => handleResolve(comment.id)}
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          {t("markResolved")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
            >
              {showResolved ? t("hideResolved") : t("showResolved", { count: resolved.length })}
            </button>
          )}
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3">{t("reviewsSection")}</h3>
          {reviews === null ? null : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border p-3 space-y-1.5" data-testid="beta-review">
                  <div className="flex items-center gap-2">
                    <Avatar user={review.betaReader.user} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{review.betaReader.user.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{review.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
