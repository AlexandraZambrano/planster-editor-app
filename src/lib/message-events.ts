import { EventEmitter } from "events"

// In-process pub/sub for pushing new chat messages to open SSE connections.
// Kept separate from notification-events.ts on purpose: a flood of chat
// messages should never flood the notification bell, and the two channels
// have different consumers (MessagesBell/thread view vs NotificationBell).
// Sufficient for this app's single-instance deployment (see .claude/specs/cicd.md).
export const messageEmitter = new EventEmitter()
messageEmitter.setMaxListeners(0)

export type EmittedMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string | null
  imageUrl: string | null
  quoteMeta: unknown
  createdAt: Date
}

export function emitMessage(userId: string, message: EmittedMessage) {
  messageEmitter.emit(`message:${userId}`, message)
}
