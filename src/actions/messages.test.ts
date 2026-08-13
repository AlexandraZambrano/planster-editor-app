import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  sendMessage,
  respondToConversation,
  markConversationRead,
  getUnreadSummary,
  findConversationWithUser,
} from "./messages"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import { emitMessage } from "@/lib/message-events"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }))
vi.mock("@/lib/message-events", () => ({ emitMessage: vi.fn() }))

const mp = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

const SESSION = {
  user: { id: "user-1", email: "a@test.com", username: "alice", avatarUrl: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("sendMessage", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await sendMessage("user-2", { content: "hi" })
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error when messaging yourself", async () => {
    const result = await sendMessage("user-1", { content: "hi" })
    expect(result.error).toContain("yourself")
  })

  it("returns error when message is empty and no quote card", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2" })
    const result = await sendMessage("user-2", { content: "   " })
    expect(result.error).toContain("empty")
  })

  it("returns error when recipient not found", async () => {
    mp.user.findUnique.mockResolvedValue(null)
    const result = await sendMessage("user-2", { content: "hi" })
    expect(result.error).toBe("User not found")
  })

  it("creates a new PENDING conversation and notifies the recipient", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2" })
    mp.conversation.findUnique.mockResolvedValue(null)
    mp.conversation.create.mockResolvedValue({
      id: "conv-1",
      userAId: "user-1",
      userBId: "user-2",
      initiatorId: "user-1",
      status: "PENDING",
    })
    mp.message.create.mockResolvedValue({
      id: "msg-1",
      content: "hi",
      imageUrl: null,
      quoteMeta: null,
      createdAt: new Date(),
    })

    const result = await sendMessage("user-2", { content: "hi" })
    expect(result.success).toBe(true)
    expect(mp.conversation.create).toHaveBeenCalledWith({
      data: { userAId: "user-1", userBId: "user-2", initiatorId: "user-1", status: "PENDING" },
    })
    expect(createNotification).toHaveBeenCalledWith(
      "user-2",
      "MESSAGE_REQUEST_RECEIVED",
      expect.objectContaining({ conversationId: "conv-1" })
    )
    expect(emitMessage).toHaveBeenCalledWith("user-2", expect.objectContaining({ conversationId: "conv-1" }))
  })

  it("does not re-notify on a second message in an already-pending conversation (initiator)", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2" })
    mp.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userAId: "user-1",
      userBId: "user-2",
      initiatorId: "user-1",
      status: "PENDING",
    })
    mp.message.create.mockResolvedValue({
      id: "msg-2",
      content: "still there?",
      imageUrl: null,
      quoteMeta: null,
      createdAt: new Date(),
    })

    const result = await sendMessage("user-2", { content: "still there?" })
    expect(result.success).toBe(true)
    expect(createNotification).not.toHaveBeenCalled()
  })

  it("blocks the recipient from replying before accepting", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2" })
    mp.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userAId: "user-1",
      userBId: "user-2",
      initiatorId: "user-2",
      status: "PENDING",
    })
    const result = await sendMessage("user-2", { content: "hi" })
    expect(result.error).toContain("Accept or decline")
    expect(mp.message.create).not.toHaveBeenCalled()
  })

  it("blocks sending into a DECLINED conversation", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2" })
    mp.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userAId: "user-1",
      userBId: "user-2",
      initiatorId: "user-1",
      status: "DECLINED",
    })
    const result = await sendMessage("user-2", { content: "hi again" })
    expect(result.error).toContain("not accepting messages")
  })

  it("allows free messaging once ACCEPTED", async () => {
    mp.user.findUnique.mockResolvedValue({ id: "user-2" })
    mp.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userAId: "user-1",
      userBId: "user-2",
      initiatorId: "user-2",
      status: "ACCEPTED",
    })
    mp.message.create.mockResolvedValue({
      id: "msg-3",
      content: "hello!",
      imageUrl: null,
      quoteMeta: null,
      createdAt: new Date(),
    })
    const result = await sendMessage("user-2", { content: "hello!" })
    expect(result.success).toBe(true)
  })
})

describe("respondToConversation", () => {
  it("returns error when the viewer is the initiator", async () => {
    mp.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userAId: "user-1",
      userBId: "user-2",
      initiatorId: "user-1",
      status: "PENDING",
    })
    const result = await respondToConversation("conv-1", "ACCEPTED")
    expect(result.error).toBe("Not found")
  })

  it("accepts and notifies the initiator", async () => {
    mp.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userAId: "user-2",
      userBId: "user-1",
      initiatorId: "user-2",
      status: "PENDING",
    })
    const result = await respondToConversation("conv-1", "ACCEPTED")
    expect(result.success).toBe(true)
    expect(mp.conversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { status: "ACCEPTED" },
    })
    expect(createNotification).toHaveBeenCalledWith(
      "user-2",
      "MESSAGE_REQUEST_ACCEPTED",
      expect.objectContaining({ conversationId: "conv-1" })
    )
  })

  it("returns error when already resolved", async () => {
    mp.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userAId: "user-2",
      userBId: "user-1",
      initiatorId: "user-2",
      status: "ACCEPTED",
    })
    const result = await respondToConversation("conv-1", "DECLINED")
    expect(result.error).toContain("already resolved")
  })
})

describe("markConversationRead", () => {
  it("marks messages from the other participant as read", async () => {
    mp.conversation.findUnique.mockResolvedValue({ id: "conv-1", userAId: "user-1", userBId: "user-2" })
    const result = await markConversationRead("conv-1")
    expect(result.success).toBe(true)
    expect(mp.message.updateMany).toHaveBeenCalledWith({
      where: { conversationId: "conv-1", senderId: { not: "user-1" }, readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })
})

describe("getUnreadSummary", () => {
  it("returns pending request and unread message counts", async () => {
    mp.conversation.count.mockResolvedValue(2)
    mp.message.count.mockResolvedValue(7)
    const result = await getUnreadSummary()
    expect(result.pendingRequestCount).toBe(2)
    expect(result.unreadMessageCount).toBe(7)
  })
})

describe("findConversationWithUser", () => {
  it("returns null when no conversation exists", async () => {
    mp.conversation.findUnique.mockResolvedValue(null)
    const result = await findConversationWithUser("user-2")
    expect(result.conversationId).toBeNull()
  })

  it("returns the conversation id when one exists", async () => {
    mp.conversation.findUnique.mockResolvedValue({ id: "conv-1" })
    const result = await findConversationWithUser("user-2")
    expect(result.conversationId).toBe("conv-1")
  })
})
