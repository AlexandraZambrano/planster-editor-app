"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { getUnreadSummary } from "@/actions/messages"
import type { EmittedMessage } from "@/lib/message-events"

const POLL_INTERVAL_MS = 30_000

export function MessagesBell() {
  const t = useTranslations("Messages")
  const [count, setCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSummary = useCallback(async () => {
    const result = await getUnreadSummary()
    if (!result.error) {
      setCount((result.pendingRequestCount ?? 0) + (result.unreadMessageCount ?? 0))
    }
  }, [])

  useEffect(() => {
    fetchSummary()

    const es = new EventSource("/api/messages/stream")

    es.onmessage = (event) => {
      JSON.parse(event.data) as EmittedMessage
      setCount((prev) => prev + 1)
    }

    es.onerror = () => {
      es.close()
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchSummary, POLL_INTERVAL_MS)
      }
    }

    return () => {
      es.close()
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [fetchSummary])

  const badgeLabel = count > 99 ? "99+" : String(count)

  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label={t("ariaLabel")}>
      <Link href="/messages">
        <MessageCircle className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {badgeLabel}
          </span>
        )}
      </Link>
    </Button>
  )
}
