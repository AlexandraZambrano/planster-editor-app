"use client"

import Link from "next/link"
import { useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { useTranslations } from "next-intl"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getNotificationText, getNotificationLink, type NotificationPayload } from "@/lib/notification-format"
import { markNotificationAsRead, type NotificationItem as NotificationItemType } from "@/actions/notifications"
import { cn } from "@/lib/utils"
import { useDateLocale } from "@/lib/date-locale"

interface NotificationItemProps {
  notification: NotificationItemType
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const [, startTransition] = useTransition()
  const t = useTranslations("Notifications")
  const dateLocale = useDateLocale()
  const payload = notification.payload as unknown as NotificationPayload
  const text = getNotificationText(notification.type, payload, t)
  const href = getNotificationLink(notification.type, payload)

  function handleClick() {
    if (notification.read) return
    onRead(notification.id)
    startTransition(async () => {
      await markNotificationAsRead(notification.id)
    })
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-start gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0",
        !notification.read && "bg-muted/30"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={payload.actorAvatarUrl ?? undefined} alt={payload.actorName} />
        <AvatarFallback className="text-xs">
          {payload.actorName?.[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="leading-snug">{text}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: dateLocale })}
        </p>
      </div>

      {!notification.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
    </Link>
  )
}
