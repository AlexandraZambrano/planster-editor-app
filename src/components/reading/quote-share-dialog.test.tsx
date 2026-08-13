import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuoteShareDialog } from "./quote-share-dialog"
import { getFollowing } from "@/actions/follow"
import { sendMessage } from "@/actions/messages"

vi.mock("@/actions/follow", () => ({ getFollowing: vi.fn() }))
vi.mock("@/actions/messages", () => ({ sendMessage: vi.fn() }))

const BASE_PROPS = {
  open: true,
  onOpenChange: () => {},
  quote: "Hello world",
  bookId: "book-1",
  bookTitle: "Book",
  chapterId: "chapter-1",
  chapterTitle: "Chapter",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getFollowing).mockResolvedValue({ users: [] })
})

describe("QuoteShareDialog", () => {
  it("renders the selected quote and caption when open", () => {
    render(<QuoteShareDialog {...BASE_PROPS} quote="A quote worth sharing" />)
    expect(screen.getByText(/A quote worth sharing/)).toBeInTheDocument()
    expect(screen.getByText(/Chapter/)).toBeInTheDocument()
    expect(screen.getByText(/Book/)).toBeInTheDocument()
  })

  it("shows a message when the viewer follows nobody yet", async () => {
    render(<QuoteShareDialog {...BASE_PROPS} />)
    await waitFor(() => {
      expect(screen.getByText("You're not following anyone yet")).toBeInTheDocument()
    })
  })

  it("sends the quote card to a followed friend", async () => {
    vi.mocked(getFollowing).mockResolvedValue({
      users: [{ id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null }],
    })
    vi.mocked(sendMessage).mockResolvedValue({ success: true, conversationId: "conv-1" })

    render(<QuoteShareDialog {...BASE_PROPS} />)

    const sendButton = await screen.findByRole("button", { name: "Send" })
    await userEvent.click(sendButton)

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        "user-2",
        expect.objectContaining({
          quoteCard: expect.objectContaining({ quote: "Hello world", bookTitle: "Book" }),
        })
      )
    })
  })

  it("generates a shareable image and page link on the external tab", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://res.cloudinary.com/demo/quote-card.png",
        shareUrl: "https://planster.app/share/share-1",
      }),
    }) as unknown as typeof fetch

    render(<QuoteShareDialog {...BASE_PROPS} />)

    await userEvent.click(screen.getByRole("tab", { name: "Share outside Planster" }))
    await userEvent.click(screen.getByRole("button", { name: "Generate image" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/quote-card",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            quote: "Hello world",
            bookId: "book-1",
            chapterId: "chapter-1",
            backgroundId: "bg-1",
          }),
        })
      )
    })

    expect(await screen.findByRole("button", { name: "Download" })).toBeInTheDocument()
  })

  it("downloads the generated image as a real file instead of opening a new tab", async () => {
    const blob = new Blob(["fake-png-bytes"], { type: "image/png" })
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: "https://res.cloudinary.com/demo/quote-card.png",
          shareUrl: "https://planster.app/share/share-1",
        }),
      })
      .mockResolvedValueOnce({ blob: async () => blob }) as unknown as typeof fetch

    const createObjectURL = vi.fn(() => "blob:mock-url")
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    render(<QuoteShareDialog {...BASE_PROPS} />)

    await userEvent.click(screen.getByRole("tab", { name: "Share outside Planster" }))
    await userEvent.click(screen.getByRole("button", { name: "Generate image" }))
    const downloadButton = await screen.findByRole("button", { name: "Download" })

    await userEvent.click(downloadButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith("https://res.cloudinary.com/demo/quote-card.png")
      expect(createObjectURL).toHaveBeenCalledWith(blob)
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
    })
  })
})
