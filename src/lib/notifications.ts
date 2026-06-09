import { prisma } from "./prisma"
import type { NotificationType, Prisma } from "@prisma/client"

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue },
    })
  } catch (err) {
    console.error("[createNotification] failed:", err)
  }
}
