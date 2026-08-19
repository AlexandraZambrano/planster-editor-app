"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { getConversations, type ConversationSummary } from "@/actions/messages"
import { cn } from "@/lib/utils"

interface MessagesSidebarProps {
  activeConversationId?: string | null
}

export function MessagesSidebar({ activeConversationId = null }: MessagesSidebarProps) {
  const t = useTranslations("Messages")
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)

  useEffect(() => {
    getConversations().then((result) => setConversations(result.active ?? []))
  }, [])

  return (
    <aside className="hidden md:flex md:w-72 lg:w-80 shrink-0 border-r flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
        <Link
          href="/messages"
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={t("backToInbox")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">{t("title")}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations === null ? null : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">{t("noConversations")}</p>
        ) : (
          <ul className="divide-y">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                    c.id === activeConversationId && "bg-muted"
                  )}
                >
                  <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                    {c.otherUser.avatarUrl ? (
                      <Image
                        src={c.otherUser.avatarUrl}
                        alt={c.otherUser.displayName}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82] text-white text-xs font-bold">
                        {c.otherUser.displayName[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.otherUser.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.lastMessage?.content ?? (c.lastMessage?.quoteMeta ? "🔖" : "")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
