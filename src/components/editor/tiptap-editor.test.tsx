import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TiptapEditor } from "./tiptap-editor"
import * as chaptersActions from "@/actions/chapters"

vi.mock("@/actions/chapters", () => ({
  saveChapterContent: vi.fn().mockResolvedValue({ success: true }),
  createChapter: vi.fn(),
  updateChapterTitle: vi.fn(),
  updateChapterVisibility: vi.fn(),
  deleteChapter: vi.fn(),
  reorderChapters: vi.fn(),
}))

vi.mock("@/actions/beta", () => ({
  getChapterComments: vi.fn().mockResolvedValue({ comments: [] }),
  getChapterReviews: vi.fn().mockResolvedValue({ reviews: [] }),
  resolveInlineComment: vi.fn(),
  replyToComment: vi.fn(),
}))

vi.mock("@/actions/author-notes", () => ({
  getAuthorNotes: vi.fn().mockResolvedValue({ notes: [] }),
  createAuthorNote: vi.fn(),
  deleteAuthorNote: vi.fn(),
}))

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const DEFAULT_PROPS = {
  chapterId: "chap-1",
  bookId: "book-1",
  chapterTitle: "Chapter One",
  bookTitle: "My Novel",
  initialContent: null,
}

describe("TiptapEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders top bar with book title link and chapter title", () => {
    render(<TiptapEditor {...DEFAULT_PROPS} />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/write/book-1")
    expect(link.textContent).toContain("My Novel")
    expect(screen.getByText("Chapter One")).toBeInTheDocument()
  })

  it("renders bottom bar with word count and save status", () => {
    render(<TiptapEditor {...DEFAULT_PROPS} />)
    expect(screen.getByText(/words?/i)).toBeInTheDocument()
    expect(screen.getByText("Saved ✓")).toBeInTheDocument()
  })

  it("toggles focus mode and hides top bar", () => {
    render(<TiptapEditor {...DEFAULT_PROPS} />)

    expect(screen.getByRole("link")).toBeInTheDocument()

    // ToolbarButton fires onClick via onPointerDown; fireEvent.pointerDown is synchronous
    fireEvent.pointerDown(screen.getByTitle("Focus mode"))

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByTitle("Exit focus mode")).toBeInTheDocument()
  })

  it("does not call saveChapterContent on mount (no changes)", async () => {
    render(<TiptapEditor {...DEFAULT_PROPS} />)
    vi.advanceTimersByTime(100)
    expect(chaptersActions.saveChapterContent).not.toHaveBeenCalled()
  })
})
