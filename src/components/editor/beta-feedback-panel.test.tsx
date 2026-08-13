import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BetaFeedbackPanel } from "./beta-feedback-panel"
import { getChapterComments, getChapterReviews, resolveInlineComment, replyToComment } from "@/actions/beta"

vi.mock("@/actions/beta", () => ({
  getChapterComments: vi.fn(),
  getChapterReviews: vi.fn(),
  resolveInlineComment: vi.fn(),
  replyToComment: vi.fn(),
}))

const COMMENT = {
  id: "comment-1",
  selectedText: "the old house creaked",
  fromPos: 1,
  toPos: 20,
  content: "Love this line!",
  resolved: false,
  createdAt: new Date(),
  betaReader: { id: "br-1", user: { username: "reader1", displayName: "Reader One", avatarUrl: null } },
  replies: [],
}

const REVIEW = {
  id: "review-1",
  content: "Great opening chapter.",
  createdAt: new Date(),
  betaReader: { id: "br-1", user: { username: "reader1", displayName: "Reader One", avatarUrl: null } },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("BetaFeedbackPanel", () => {
  it("shows empty states when there is no feedback yet", async () => {
    vi.mocked(getChapterComments).mockResolvedValue({ comments: [] })
    vi.mocked(getChapterReviews).mockResolvedValue({ reviews: [] })

    render(<BetaFeedbackPanel chapterId="ch-1" onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText("No comments yet")).toBeInTheDocument()
      expect(screen.getByText("No reviews yet")).toBeInTheDocument()
    })
  })

  it("renders comments and reviews from the author's private feed", async () => {
    vi.mocked(getChapterComments).mockResolvedValue({ comments: [COMMENT] })
    vi.mocked(getChapterReviews).mockResolvedValue({ reviews: [REVIEW] })

    render(<BetaFeedbackPanel chapterId="ch-1" onClose={() => {}} />)

    expect(await screen.findByText("Love this line!")).toBeInTheDocument()
    expect(screen.getByText(/the old house creaked/)).toBeInTheDocument()
    expect(screen.getByText("Great opening chapter.")).toBeInTheDocument()
  })

  it("resolves a comment and notifies the parent via onChange", async () => {
    vi.mocked(getChapterComments).mockResolvedValue({ comments: [COMMENT] })
    vi.mocked(getChapterReviews).mockResolvedValue({ reviews: [] })
    vi.mocked(resolveInlineComment).mockResolvedValue({ success: true })
    const onChange = vi.fn()

    render(<BetaFeedbackPanel chapterId="ch-1" onClose={() => {}} onChange={onChange} />)

    const resolveButton = await screen.findByText("Mark resolved")
    await userEvent.click(resolveButton)

    await waitFor(() => {
      expect(resolveInlineComment).toHaveBeenCalledWith("comment-1")
      expect(onChange).toHaveBeenCalled()
    })
    // Resolved comments are hidden by default, per beta-system.md
    expect(screen.getByText("Show resolved (1)")).toBeInTheDocument()
  })

  it("submits a reply to a comment", async () => {
    vi.mocked(getChapterComments).mockResolvedValue({ comments: [COMMENT] })
    vi.mocked(getChapterReviews).mockResolvedValue({ reviews: [] })
    vi.mocked(replyToComment).mockResolvedValue({ success: true })

    render(<BetaFeedbackPanel chapterId="ch-1" onClose={() => {}} />)

    const replyButton = await screen.findByText("Reply")
    await userEvent.click(replyButton)
    const textarea = screen.getByPlaceholderText("Write a reply…")
    await userEvent.type(textarea, "Thanks for the note!")
    await userEvent.click(screen.getByText("Send"))

    await waitFor(() => {
      expect(replyToComment).toHaveBeenCalledWith("comment-1", "Thanks for the note!")
    })
  })
})
