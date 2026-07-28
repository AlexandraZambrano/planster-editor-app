import { describe, it, expect } from "vitest"
import { createTranslator } from "next-intl"
import { getNotificationText, getNotificationLink, type NotificationPayload } from "./notification-format"
import messages from "@/messages/en.json"

const t = createTranslator({ locale: "en", messages, namespace: "Notifications" })

const BASE: NotificationPayload = {
  bookId: "book-1",
  bookTitle: "My Book",
  actorName: "alice",
  actorAvatarUrl: null,
  chapterId: "chapter-1",
  chapterTitle: "Chapter One",
  commentId: "comment-1",
}

describe("getNotificationText", () => {
  it("describes a beta request received", () => {
    expect(getNotificationText("BETA_REQUEST_RECEIVED", BASE, t)).toContain("alice")
    expect(getNotificationText("BETA_REQUEST_RECEIVED", BASE, t)).toContain("My Book")
  })

  it("describes an approved beta request", () => {
    expect(getNotificationText("BETA_REQUEST_APPROVED", BASE, t)).toContain("approved")
  })

  it("describes a new inline comment referencing the chapter", () => {
    expect(getNotificationText("NEW_INLINE_COMMENT", BASE, t)).toContain("Chapter One")
  })

  it("falls back to a generic message for unknown types", () => {
    expect(getNotificationText("UNKNOWN" as never, BASE, t)).toBe("New notification")
  })
})

describe("getNotificationLink", () => {
  it("links BOOK_SAVED and BETA_REQUEST_RECEIVED to the author's book panel", () => {
    expect(getNotificationLink("BOOK_SAVED", BASE)).toBe("/write/book-1")
    expect(getNotificationLink("BETA_REQUEST_RECEIVED", BASE)).toBe("/write/book-1")
  })

  it("links beta approval/rejection to the public book page", () => {
    expect(getNotificationLink("BETA_REQUEST_APPROVED", BASE)).toBe("/books/book-1")
    expect(getNotificationLink("BETA_REQUEST_REJECTED", BASE)).toBe("/books/book-1")
  })

  it("links inline comments and reviews to the editor", () => {
    expect(getNotificationLink("NEW_INLINE_COMMENT", BASE)).toBe("/write/book-1/editor/chapter-1")
    expect(getNotificationLink("NEW_CHAPTER_REVIEW", BASE)).toBe("/write/book-1/editor/chapter-1")
  })

  it("links new chapters and comment replies to the reading view", () => {
    expect(getNotificationLink("NEW_CHAPTER_PUBLISHED", BASE)).toBe("/read/book-1/chapter-1")
    expect(getNotificationLink("COMMENT_REPLY", BASE)).toBe("/read/book-1/chapter-1")
  })

  it("falls back to the notifications page for unknown types", () => {
    expect(getNotificationLink("UNKNOWN" as never, BASE)).toBe("/notifications")
  })
})
