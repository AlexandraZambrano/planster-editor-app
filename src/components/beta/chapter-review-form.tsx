"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createChapterReview } from "@/actions/beta"

const MAX_CHARS = 1000

type Props = {
  chapterId: string
  existingReview: string | null
}

export function ChapterReviewForm({ chapterId, existingReview }: Props) {
  const t = useTranslations("Beta")
  const [content, setContent] = useState(existingReview ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(!!existingReview)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createChapterReview(chapterId, content)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {t("yourReview")}
        </p>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("reviewSubmittedHint")}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {t("yourReviewOfChapter")}
        </p>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("reviewPlaceholder")}
          rows={5}
          maxLength={MAX_CHARS}
          data-testid="review-textarea"
        />
        <p className="text-xs text-muted-foreground text-right mt-1">
          {content.length}/{MAX_CHARS}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="sm" disabled={loading || !content.trim()}>
        {loading ? t("submitting") : t("submitReview")}
      </Button>
    </form>
  )
}
