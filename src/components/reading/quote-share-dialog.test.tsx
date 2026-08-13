import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuoteShareDialog } from "./quote-share-dialog"
import { getFollowing } from "@/actions/follow"
import { sendMessage } from "@/actions/messages"

vi.mock("@/actions/follow", () => ({ getFollowing: vi.fn() }))
vi.mock("@/actions/messages", () => ({ sendMessage: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getFollowing).mockResolvedValue({ users: [] })
})

describe("QuoteShareDialog", () => {
  it("renders the selected quote and caption when open", () => {
    render(
      <QuoteShareDialog
        open
        onOpenChange={() => {}}
        quote="A quote worth sharing"
        bookTitle="My Book"
        chapterTitle="Chapter One"
      />
    )
    expect(screen.getByText(/A quote worth sharing/)).toBeInTheDocument()
    expect(screen.getByText(/Chapter One/)).toBeInTheDocument()
    expect(screen.getByText(/My Book/)).toBeInTheDocument()
  })

  it("shows a message when the viewer follows nobody yet", async () => {
    render(
      <QuoteShareDialog
        open
        onOpenChange={() => {}}
        quote="Hello"
        bookTitle="Book"
        chapterTitle="Chapter"
      />
    )
    await waitFor(() => {
      expect(screen.getByText("You're not following anyone yet")).toBeInTheDocument()
    })
  })

  it("sends the quote card to a followed friend", async () => {
    vi.mocked(getFollowing).mockResolvedValue({
      users: [{ id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null }],
    })
    vi.mocked(sendMessage).mockResolvedValue({ success: true, conversationId: "conv-1" })

    render(
      <QuoteShareDialog
        open
        onOpenChange={() => {}}
        quote="Hello world"
        bookTitle="Book"
        chapterTitle="Chapter"
      />
    )

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

  it("switches to the external tab and generates a shareable image", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.example.com/quote-card.png" }),
    }) as unknown as typeof fetch

    render(
      <QuoteShareDialog
        open
        onOpenChange={() => {}}
        quote="Hello"
        bookTitle="Book"
        chapterTitle="Chapter"
      />
    )

    await userEvent.click(screen.getByRole("tab", { name: "Share outside Planster" }))
    await userEvent.click(screen.getByRole("button", { name: "Generate image" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/quote-card",
        expect.objectContaining({ method: "POST" })
      )
    })
    expect(await screen.findByRole("link", { name: "Download" })).toBeInTheDocument()
  })
})
