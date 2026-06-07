import { prisma } from "./prisma"
import type { NotificationType } from "@prisma/client"

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, payload } })
  } catch (err) {
    console.error("[createNotification] failed:", err)
  }
}
