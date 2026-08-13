import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MessagesSidebar } from "./messages-sidebar"
import { getConversations } from "@/actions/messages"

vi.mock("@/actions/messages", () => ({ getConversations: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
})

const CONVERSATION = {
  id: "conv-1",
  status: "ACCEPTED" as const,
  isInitiator: true,
  otherUser: { id: "user-2", username: "bob", displayName: "Bob", avatarUrl: null },
  lastMessage: { content: "Hey there", quoteMeta: null, createdAt: new Date(), senderId: "user-2" },
  updatedAt: new Date(),
}

describe("MessagesSidebar", () => {
  it("has a back link to the inbox", async () => {
    vi.mocked(getConversations).mockResolvedValue({ requests: [], active: [] })
    render(<MessagesSidebar />)
    const backLink = screen.getByRole("link", { name: "Back to messages" })
    expect(backLink).toHaveAttribute("href", "/messages")
  })

  it("shows an empty state when there are no conversations", async () => {
    vi.mocked(getConversations).mockResolvedValue({ requests: [], active: [] })
    render(<MessagesSidebar />)
    await waitFor(() => {
      expect(screen.getByText("No conversations yet")).toBeInTheDocument()
    })
  })

  it("lists conversations and links each to its thread", async () => {
    vi.mocked(getConversations).mockResolvedValue({ requests: [], active: [CONVERSATION] })
    render(<MessagesSidebar />)

    const conversationLink = await screen.findByRole("link", { name: /Bob/ })
    expect(conversationLink).toHaveAttribute("href", "/messages/conv-1")
  })

  it("highlights the active conversation", async () => {
    vi.mocked(getConversations).mockResolvedValue({ requests: [], active: [CONVERSATION] })
    render(<MessagesSidebar activeConversationId="conv-1" />)

    const conversationLink = await screen.findByRole("link", { name: /Bob/ })
    expect(conversationLink.className).toContain("bg-muted")
  })
})
