"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { NotificationItem } from "./notification-item"
import { markAllNotificationsAsRead, type NotificationItem as NotificationItemType } from "@/actions/notifications"

const POLL_INTERVAL_MS = 30_000
const MAX_NOTIFICATIONS = 50

export function NotificationBell() {
  const t = useTranslations("Notifications")
  const [notifications, setNotifications] = useState<NotificationItemType[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // ignore — next poll/reconnect will retry
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const es = new EventSource("/api/notifications/stream")

    es.onmessage = (event) => {
      const notification = JSON.parse(event.data) as NotificationItemType
      setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS))
      setUnreadCount((prev) => prev + 1)
    }

    es.onerror = () => {
      es.close()
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS)
      }
    }

    return () => {
      es.close()
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [fetchNotifications])

  function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    markAllNotificationsAsRead()
  }

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("title")}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {badgeLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">{t("title")}</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("markAllAsRead")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground text-center">{t("empty")}</p>
          ) : (
            notifications.map((n) => <NotificationItem key={n.id} notification={n} onRead={handleMarkRead} />)
          )}
        </div>
        <Link
          href="/notifications"
          className="block text-center text-xs text-muted-foreground hover:text-foreground py-2 border-t"
        >
          {t("viewAll")}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
