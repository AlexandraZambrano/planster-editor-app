"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { emitMessage } from "@/lib/message-events"
import type { ConversationStatus } from "@prisma/client"

export type QuoteCardInput = {
  quote: string
  bookTitle: string
  chapterTitle: string
  backgroundId: string
}

function normalizePair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA]
}

export async function sendMessage(
  recipientId: string,
  input: { content?: string; quoteCard?: QuoteCardInput }
): Promise<{ error?: string; success?: boolean; conversationId?: string }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }
  if (recipientId === session.user.id) return { error: "You cannot message yourself" }

  const content = input.content?.trim() || null
  if (!content && !input.quoteCard) return { error: "Message cannot be empty" }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } })
  if (!recipient) return { error: "User not found" }

  const [userAId, userBId] = normalizePair(session.user.id, recipientId)

  let conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  })
  let isNewConversation = false

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userAId, userBId, initiatorId: session.user.id, status: "PENDING" },
    })
    isNewConversation = true
  } else if (conversation.status === "DECLINED") {
    return { error: "This user is not accepting messages from you" }
  } else if (conversation.status === "PENDING" && conversation.initiatorId !== session.user.id) {
    return { error: "Accept or decline this conversation before replying" }
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      content,
      quoteMeta: input.quoteCard ?? undefined,
    },
  })

  emitMessage(recipientId, {
    id: message.id,
    conversationId: conversation.id,
    senderId: session.user.id,
    content: message.content,
    imageUrl: message.imageUrl,
    quoteMeta: message.quoteMeta,
    createdAt: message.createdAt,
  })

  if (isNewConversation) {
    // Only the first message of a brand-new conversation creates a discrete
    // notification — every message after that relies on the SSE/poll channel,
    // so an ongoing chat never floods the notification bell.
    await createNotification(recipientId, "MESSAGE_REQUEST_RECEIVED", {
      bookId: "",
      bookTitle: "",
      actorName: session.user.username,
      actorAvatarUrl: session.user.avatarUrl ?? null,
      conversationId: conversation.id,
    })
  }

  revalidatePath(`/messages/${conversation.id}`)
  return { success: true, conversationId: conversation.id }
}

export async function respondToConversation(
  conversationId: string,
  status: Extract<ConversationStatus, "ACCEPTED" | "DECLINED">
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) return { error: "Not found" }

  const isRecipient =
    (conversation.userAId === session.user.id || conversation.userBId === session.user.id) &&
    conversation.initiatorId !== session.user.id
  if (!isRecipient) return { error: "Not found" }
  if (conversation.status !== "PENDING") return { error: "This request was already resolved" }

  await prisma.conversation.update({ where: { id: conversationId }, data: { status } })

  if (status === "ACCEPTED") {
    await createNotification(conversation.initiatorId, "MESSAGE_REQUEST_ACCEPTED", {
      bookId: "",
      bookTitle: "",
      actorName: session.user.username,
      actorAvatarUrl: session.user.avatarUrl ?? null,
      conversationId,
    })
  }

  revalidatePath("/messages")
  revalidatePath(`/messages/${conversationId}`)
  return { success: true }
}

export type ConversationSummary = {
  id: string
  status: ConversationStatus
  isInitiator: boolean
  otherUser: { id: string; username: string; displayName: string; avatarUrl: string | null }
  lastMessage: { content: string | null; quoteMeta: unknown; createdAt: Date; senderId: string } | null
  updatedAt: Date
}

export async function getConversations(): Promise<{
  error?: string
  requests?: ConversationSummary[]
  active?: ConversationSummary[]
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: session.user.id }, { userBId: session.user.id }] },
    include: {
      userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  })

  const summaries: ConversationSummary[] = conversations.map((c) => {
    const otherUser = c.userAId === session.user.id ? c.userB : c.userA
    const last = c.messages[0]
    return {
      id: c.id,
      status: c.status,
      isInitiator: c.initiatorId === session.user.id,
      otherUser,
      lastMessage: last
        ? { content: last.content, quoteMeta: last.quoteMeta, createdAt: last.createdAt, senderId: last.senderId }
        : null,
      updatedAt: c.updatedAt,
    }
  })

  return {
    requests: summaries.filter((c) => c.status === "PENDING" && !c.isInitiator),
    active: summaries.filter((c) => c.status === "ACCEPTED" || (c.status === "PENDING" && c.isInitiator)),
  }
}

export async function findConversationWithUser(
  otherUserId: string
): Promise<{ error?: string; conversationId?: string | null }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const [userAId, userBId] = normalizePair(session.user.id, otherUserId)
  const conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  })

  return { conversationId: conversation?.id ?? null }
}

export async function markConversationRead(
  conversationId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) return { error: "Not found" }
  if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
    return { error: "Not found" }
  }

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: session.user.id }, readAt: null },
    data: { readAt: new Date() },
  })

  return { success: true }
}

export async function getUnreadSummary(): Promise<{
  error?: string
  pendingRequestCount?: number
  unreadMessageCount?: number
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const [pendingRequestCount, unreadMessageCount] = await Promise.all([
    prisma.conversation.count({
      where: {
        status: "PENDING",
        initiatorId: { not: session.user.id },
        OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
      },
    }),
    prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: session.user.id },
        conversation: { OR: [{ userAId: session.user.id }, { userBId: session.user.id }] },
      },
    }),
  ])

  return { pendingRequestCount, unreadMessageCount }
}

export type MessageItem = {
  id: string
  senderId: string
  content: string | null
  imageUrl: string | null
  quoteMeta: unknown
  createdAt: Date
}

export async function getMessages(conversationId: string): Promise<{
  error?: string
  conversation?: ConversationSummary
  messages?: MessageItem[]
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  })
  if (!conversation) return { error: "Not found" }
  if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
    return { error: "Not found" }
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderId: true, content: true, imageUrl: true, quoteMeta: true, createdAt: true },
  })

  const otherUser = conversation.userAId === session.user.id ? conversation.userB : conversation.userA

  return {
    conversation: {
      id: conversation.id,
      status: conversation.status,
      isInitiator: conversation.initiatorId === session.user.id,
      otherUser,
      lastMessage: null,
      updatedAt: conversation.updatedAt,
    },
    messages,
  }
}
