"use client"

import { useEffect, useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StarRating } from "@/components/library/star-rating"
import { useDateLocale } from "@/lib/date-locale"
import {
  getChapterSocial,
  postChapterComment,
  deleteChapterComment,
  rateChapter,
  type ChapterSocialComment,
} from "@/actions/chapter-social"

interface ChapterSocialProps {
  chapterId: string
  viewerId: string
}

export function ChapterSocial({ chapterId, viewerId }: ChapterSocialProps) {
  const t = useTranslations("Comments")
  const dateLocale = useDateLocale()

  const [comments, setComments] = useState<ChapterSocialComment[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [viewerRating, setViewerRating] = useState<number | null>(null)
  const [commentText, setCommentText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getChapterSocial(chapterId).then((result) => {
      setComments(result.comments ?? [])
      setAverageRating(result.averageRating ?? null)
      setRatingCount(result.ratingCount ?? 0)
      setViewerRating(result.viewerRating ?? null)
      setLoaded(true)
    })
  }, [chapterId])

  function handleRate(rating: number) {
    const prev = viewerRating
    setViewerRating(rating)
    startTransition(async () => {
      const result = await rateChapter(chapterId, rating)
      if (result.error) {
        setViewerRating(prev)
        setError(result.error)
      } else {
        getChapterSocial(chapterId).then((r) => {
          setAverageRating(r.averageRating ?? null)
          setRatingCount(r.ratingCount ?? 0)
        })
      }
    })
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    const text = commentText.trim()
    if (!text) return
    setError(null)
    startTransition(async () => {
      const result = await postChapterComment(chapterId, text)
      if (result.error) {
        setError(result.error)
        return
      }
      setCommentText("")
      const r = await getChapterSocial(chapterId)
      setComments(r.comments ?? [])
    })
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const result = await deleteChapterComment(commentId)
      if (!result.error) setComments((prev) => prev.filter((c) => c.id !== commentId))
    })
  }

  if (!loaded) return null

  return (
    <div className="mx-auto w-[816px] max-w-full mt-8 pb-12">
      <div className="border-t pt-8 space-y-6">
        <div>
          <p className="text-sm font-medium mb-2">{t("ratingLabel")}</p>
          <div className="flex items-center gap-3">
            <StarRating value={viewerRating} onChange={handleRate} />
            <span className="text-xs text-muted-foreground">
              {ratingCount > 0
                ? t("averageRating", { rating: (averageRating ?? 0).toFixed(1), count: ratingCount })
                : t("noRatingsYet")}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold mb-3">{t("title")}</h3>

          <form onSubmit={handleSubmitComment} className="space-y-2 mb-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t("placeholder")}
              rows={3}
              maxLength={1000}
              data-testid="chapter-comment-textarea"
            />
            {error && (
              <Alert variant="destructive" className="py-1.5">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isPending || !commentText.trim()}>
                {t("post")}
              </Button>
            </div>
          </form>

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{comment.user.displayName}</span>{" "}
                      <span className="text-muted-foreground">@{comment.user.username}</span>
                    </p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                  {comment.userId === viewerId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label={t("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
