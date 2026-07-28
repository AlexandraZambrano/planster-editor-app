import type { NotificationType } from "@prisma/client"

export interface NotificationPayload {
  bookId: string
  bookTitle: string
  actorName: string
  actorAvatarUrl: string | null
  chapterId?: string
  chapterTitle?: string
  commentId?: string
}

export type NotificationTranslator = (key: string, values?: Record<string, string>) => string

export function getNotificationText(
  type: NotificationType,
  payload: NotificationPayload,
  t: NotificationTranslator
): string {
  switch (type) {
    case "BETA_REQUEST_RECEIVED":
      return t("betaRequestReceived", { actorName: payload.actorName, bookTitle: payload.bookTitle })
    case "BETA_REQUEST_APPROVED":
      return t("betaRequestApproved", { bookTitle: payload.bookTitle })
    case "BETA_REQUEST_REJECTED":
      return t("betaRequestRejected", { bookTitle: payload.bookTitle })
    case "NEW_INLINE_COMMENT":
      return t("newInlineComment", { actorName: payload.actorName, chapterTitle: payload.chapterTitle ?? "" })
    case "NEW_CHAPTER_REVIEW":
      return t("newChapterReview", { actorName: payload.actorName, chapterTitle: payload.chapterTitle ?? "" })
    case "BOOK_SAVED":
      return t("bookSaved", { actorName: payload.actorName, bookTitle: payload.bookTitle })
    case "NEW_CHAPTER_PUBLISHED":
      return t("newChapterPublished", {
        chapterTitle: payload.chapterTitle ?? "",
        bookTitle: payload.bookTitle,
      })
    case "COMMENT_REPLY":
      return t("commentReply", { actorName: payload.actorName, chapterTitle: payload.chapterTitle ?? "" })
    default:
      return t("default")
  }
}

export function getNotificationLink(type: NotificationType, payload: NotificationPayload): string {
  switch (type) {
    case "BETA_REQUEST_RECEIVED":
    case "BOOK_SAVED":
      return `/write/${payload.bookId}`
    case "BETA_REQUEST_APPROVED":
    case "BETA_REQUEST_REJECTED":
      return `/books/${payload.bookId}`
    case "NEW_INLINE_COMMENT":
    case "NEW_CHAPTER_REVIEW":
      return `/write/${payload.bookId}/editor/${payload.chapterId}`
    case "NEW_CHAPTER_PUBLISHED":
    case "COMMENT_REPLY":
      return `/read/${payload.bookId}/${payload.chapterId}`
    default:
      return "/notifications"
  }
}
