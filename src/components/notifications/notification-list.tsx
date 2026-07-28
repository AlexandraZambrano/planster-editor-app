"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { NotificationItem } from "./notification-item"
import { markAllNotificationsAsRead, type NotificationItem as NotificationItemType } from "@/actions/notifications"
import { Button } from "@/components/ui/button"

interface NotificationListProps {
  initialNotifications: NotificationItemType[]
}

export function NotificationList({ initialNotifications }: NotificationListProps) {
  const t = useTranslations("Notifications")
  const [notifications, setNotifications] = useState(initialNotifications)
  const [, startTransition] = useTransition()

  const unreadCount = notifications.filter((n) => !n.read).length

  function handleRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(async () => {
      await markAllNotificationsAsRead()
    })
  }

  if (notifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">{t("empty")}</p>
    )
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleMarkAllRead}>
            {t("markAllAsRead")}
          </Button>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onRead={handleRead} />
        ))}
      </div>
    </div>
  )
}
