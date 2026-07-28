import { prisma } from "./prisma"
import { emitNotification } from "./notification-events"
import type { NotificationType, Prisma } from "@prisma/client"

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue },
    })
    emitNotification(userId, notification)
  } catch (err) {
    console.error("[createNotification] failed:", err)
  }
}
