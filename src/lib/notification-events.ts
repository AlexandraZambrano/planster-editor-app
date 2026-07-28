import { EventEmitter } from "events"

// In-process pub/sub for pushing new notifications to open SSE connections.
// Sufficient for this app's single-instance deployment (see .claude/specs/cicd.md).
export const notificationEmitter = new EventEmitter()
notificationEmitter.setMaxListeners(0)

export type EmittedNotification = {
  id: string
  type: string
  payload: unknown
  read: boolean
  createdAt: Date
}

export function emitNotification(userId: string, notification: EmittedNotification) {
  notificationEmitter.emit(`notification:${userId}`, notification)
}
