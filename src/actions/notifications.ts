"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@prisma/client"

const NOTIFICATIONS_LIMIT = 50

export type NotificationItem = {
  id: string
  type: NotificationType
  payload: Record<string, unknown>
  read: boolean
  createdAt: Date
}

export async function getNotifications(): Promise<{
  error?: string
  notifications?: NotificationItem[]
  unreadCount?: number
}> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATIONS_LIMIT,
    }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
  ])

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      payload: n.payload as Record<string, unknown>,
      read: n.read,
      createdAt: n.createdAt,
    })),
    unreadCount,
  }
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  })
  if (!notification || notification.userId !== session.user.id) return { error: "Not found" }

  await prisma.notification.update({ where: { id: notificationId }, data: { read: true } })

  revalidatePath("/notifications")
  return { success: true }
}

export async function markAllNotificationsAsRead(): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  revalidatePath("/notifications")
  return { success: true }
}
