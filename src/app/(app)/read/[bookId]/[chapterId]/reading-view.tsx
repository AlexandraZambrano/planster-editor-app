"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@/components/editor/font-size"
import { ChevronLeft, ChevronRight, MessageSquarePlus, MessageSquareText, Share2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChapterReviewForm } from "@/components/beta/chapter-review-form"
import { ChapterSocial } from "@/components/reading/chapter-social"
import { QuoteShareDialog } from "@/components/reading/quote-share-dialog"
import { MyCommentsPanel } from "@/components/reading/my-comments-panel"
import { CommentHighlight } from "@/components/reading/comment-highlight-extension"
import { createInlineComment, getMyInlineComments, type MyInlineComment } from "@/actions/beta"
import { logReadingActivity } from "@/actions/reading"

interface Props {
  bookId: string
  chapterId: string
  bookTitle: string
  chapterTitle: string
  content: object
  isAuthor: boolean
  isBeta: boolean
  betaReaderId: string | null
  prevChapterId: string | null
  nextChapterId: string | null
  existingReview: string | null
  showChapterSocial: boolean
  canShareQuote: boolean
  viewerId: string
}

type SelectionState = {
  from: number
  to: number
  text: string
  rect: { top: number; left: number; width: number }
} | null

export function ReadingView({
  bookId,
  chapterId,
  bookTitle,
  chapterTitle,
  content,
  isAuthor,
  isBeta,
  prevChapterId,
  nextChapterId,
  existingReview,
  showChapterSocial,
  canShareQuote,
  viewerId,
}: Props) {
  const t = useTranslations("Reading")
  const tShare = useTranslations("Share")
  const [selection, setSelection] = useState<SelectionState>(null)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [commentSuccess, setCommentSuccess] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [myComments, setMyComments] = useState<MyInlineComment[] | null>(null)
  const [showMyComments, setShowMyComments] = useState(false)

  useEffect(() => {
    logReadingActivity(bookId, chapterId)
  }, [bookId, chapterId])

  useEffect(() => {
    if (!isBeta) return
    getMyInlineComments(chapterId).then((r) => setMyComments(r.comments ?? []))
  }, [isBeta, chapterId])

  const savedSelectionRef = useRef<SelectionState>(null)

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: false,
      extensions: [
        StarterKit,
        TextStyle,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        CommentHighlight.configure({
          comments: (myComments ?? []).map((c) => ({ id: c.id, from: c.fromPos, to: c.toPos })),
        }),
      ],
      content: content && Object.keys(content).length > 0 ? content : undefined,
      editorProps: {
        attributes: {
          class: "focus:outline-none",
          style: "padding: 40px 56px;",
        },
      },
      onSelectionUpdate({ editor: ed }) {
        if (!isBeta && !canShareQuote) return
        const { from, to } = ed.state.selection
        if (from === to) {
          if (!showCommentForm) setSelection(null)
          return
        }
        const text = ed.state.doc.textBetween(from, to, " ")
        if (!text.trim()) {
          setSelection(null)
          return
        }
        const nativeSel = window.getSelection()
        if (!nativeSel || nativeSel.rangeCount === 0) return
        const range = nativeSel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const newSel: SelectionState = {
          from,
          to,
          text: text.trim(),
          rect: {
            top: rect.top + window.scrollY,
            left: rect.left + rect.width / 2,
            width: rect.width,
          },
        }
        setSelection(newSel)
        savedSelectionRef.current = newSel
      },
    },
    [myComments]
  )

  const [shareQuoteText, setShareQuoteText] = useState("")

  function openShareDialog() {
    if (!selection) return
    setShareQuoteText(selection.text)
    setShowShareDialog(true)
  }

  function openCommentForm() {
    if (!selection) return
    savedSelectionRef.current = selection
    setShowCommentForm(true)
    setCommentText("")
    setCommentError(null)
    setCommentSuccess(false)
  }

  function closeCommentForm() {
    setShowCommentForm(false)
    setSelection(null)
    savedSelectionRef.current = null
    setCommentText("")
    setCommentError(null)
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    const sel = savedSelectionRef.current
    if (!sel) return
    setCommentLoading(true)
    setCommentError(null)

    const result = await createInlineComment(
      chapterId,
      sel.text,
      sel.from,
      sel.to,
      commentText
    )
    setCommentLoading(false)

    if (result.error) {
      setCommentError(result.error)
    } else {
      setCommentSuccess(true)
      setTimeout(closeCommentForm, 1000)
    }
  }

  function jumpToComment(commentId: string) {
    const target = document.querySelector(`[data-comment-id="${commentId}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "center" })
    target.classList.add("!bg-amber-400/70")
    setTimeout(() => target.classList.remove("!bg-amber-400/70"), 1200)
  }

  // Dismiss comment form when clicking outside
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showCommentForm) return
    function onMouseDown(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        closeCommentForm()
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [showCommentForm])

  const activeSel = showCommentForm ? savedSelectionRef.current : selection

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-2.5 flex items-center gap-3 text-sm">
        <Link
          href={isAuthor ? `/write/${bookId}` : `/books/${bookId}`}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {bookTitle}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium truncate">{chapterTitle}</span>

        {isAuthor && (
          <Link
            href={`/write/${bookId}/editor/${chapterId}`}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {t("editChapter")}
          </Link>
        )}

        {isBeta && (
          <Button
            type="button"
            size="sm"
            variant={showMyComments ? "secondary" : "ghost"}
            className={`h-7 gap-1.5 text-xs relative shrink-0 ${isAuthor ? "" : "ml-auto"}`}
            onClick={() => setShowMyComments((v) => !v)}
            data-testid="my-comments-toggle"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            {t("myComments")}
            {myComments && myComments.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {myComments.length > 99 ? "99+" : myComments.length}
              </span>
            )}
          </Button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto w-[816px] max-w-full bg-white shadow-sm rounded-sm border border-gray-100 relative">
          <EditorContent editor={editor} />

          {/* Floating selection toolbar: comment (beta only) + share quote (any reader on a PUBLISHED chapter) */}
          {selection && !showCommentForm && !showShareDialog && (isBeta || canShareQuote) && (
            <div
              className="fixed z-20 -translate-x-1/2 flex gap-1.5"
              style={{ top: selection.rect.top - 44, left: selection.rect.left }}
            >
              {isBeta && (
                <Button
                  size="sm"
                  onClick={openCommentForm}
                  className="shadow-md gap-1.5"
                  data-testid="comment-btn"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  {t("comment")}
                </Button>
              )}
              {canShareQuote && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={openShareDialog}
                  className="shadow-md gap-1.5"
                  data-testid="share-quote-btn"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {tShare("shareQuote")}
                </Button>
              )}
            </div>
          )}

          {/* Inline comment form */}
          {isBeta && showCommentForm && activeSel && (
            <div
              ref={formRef}
              className="fixed z-20 w-72 bg-popover border rounded-lg shadow-lg p-3"
              style={{
                top: activeSel.rect.top - 8,
                left: Math.min(
                  activeSel.rect.left - 144,
                  (typeof window !== "undefined" ? window.innerWidth : 1000) - 300
                ),
              }}
              data-testid="comment-form"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground line-clamp-2">
                  &ldquo;{activeSel.text.slice(0, 80)}{activeSel.text.length > 80 ? "…" : ""}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={closeCommentForm}
                  className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
                  aria-label={t("close")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <form onSubmit={submitComment} className="space-y-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t("addCommentPlaceholder")}
                  rows={3}
                  autoFocus
                  data-testid="comment-textarea"
                />

                {commentError && (
                  <Alert variant="destructive" className="py-1.5">
                    <AlertDescription className="text-xs">{commentError}</AlertDescription>
                  </Alert>
                )}

                {commentSuccess && (
                  <p className="text-xs text-green-600">{t("commentSubmitted")}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeCommentForm}
                    className="h-7 text-xs"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={commentLoading || !commentText.trim()}
                    className="h-7 text-xs"
                  >
                    {commentLoading ? "…" : t("submit")}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Chapter review section (beta readers only) */}
        {isBeta && (
          <div className="mx-auto w-[816px] max-w-full mt-8 pb-12">
            <div className="border-t pt-8">
              <ChapterReviewForm chapterId={chapterId} existingReview={existingReview} />
            </div>
          </div>
        )}

        {/* Public comments + rating (any reader, PUBLISHED chapters only — distinct
            from the private beta review section above) */}
        {showChapterSocial && <ChapterSocial chapterId={chapterId} viewerId={viewerId} />}
      </main>

      {canShareQuote && (
        <QuoteShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          quote={shareQuoteText}
          bookId={bookId}
          bookTitle={bookTitle}
          chapterId={chapterId}
          chapterTitle={chapterTitle}
        />
      )}

      {isBeta && showMyComments && (
        <MyCommentsPanel
          comments={myComments}
          onClose={() => setShowMyComments(false)}
          onJump={jumpToComment}
        />
      )}

      {/* Prev / Next navigation */}
      <footer className="sticky bottom-0 bg-background border-t px-4 py-2 flex items-center justify-between text-sm">
        {prevChapterId ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/read/${bookId}/${prevChapterId}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("previousChapter")}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {nextChapterId ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/read/${bookId}/${nextChapterId}`}>
              {t("nextChapter")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">{t("endOfChapter")}</span>
        )}
      </footer>
    </div>
  )
}
