"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  sendMessage,
  respondToConversation,
  markConversationRead,
  type MessageItem,
  type ConversationSummary,
} from "@/actions/messages"
import type { EmittedMessage } from "@/lib/message-events"
import type { QuoteCardInput } from "@/actions/messages"

interface MessageThreadProps {
  conversationId: string | null
  otherUser: { id: string; username: string; displayName: string; avatarUrl: string | null }
  viewerId: string
  initialMessages: MessageItem[]
  initialStatus: ConversationSummary["status"] | null
  isInitiator: boolean
}

export function MessageThread({
  conversationId,
  otherUser,
  viewerId,
  initialMessages,
  initialStatus,
  isInitiator,
}: MessageThreadProps) {
  const t = useTranslations("Messages")
  const router = useRouter()
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages)
  const [status, setStatus] = useState(initialStatus)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  useEffect(() => {
    if (conversationId) markConversationRead(conversationId)
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    const es = new EventSource("/api/messages/stream")
    es.onmessage = (event) => {
      const message = JSON.parse(event.data) as EmittedMessage
      if (message.conversationId !== conversationId) return
      setMessages((prev) => [
        ...prev,
        {
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          imageUrl: message.imageUrl,
          quoteMeta: message.quoteMeta,
          createdAt: new Date(message.createdAt),
        },
      ])
      markConversationRead(conversationId)
    }
    return () => es.close()
  }, [conversationId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    const result = await sendMessage(otherUser.id, { content })
    setSending(false)
    if (result.error) return
    setText("")

    if (!conversationId && result.conversationId) {
      router.replace(`/messages/${result.conversationId}`)
      return
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        senderId: viewerId,
        content,
        imageUrl: null,
        quoteMeta: null,
        createdAt: new Date(),
      },
    ])
    if (status === null) setStatus("PENDING")
  }

  async function handleRespond(next: "ACCEPTED" | "DECLINED") {
    if (!conversationId) return
    const result = await respondToConversation(conversationId, next)
    if (!result.error) setStatus(next)
  }

  const showAcceptBanner = status === "PENDING" && !isInitiator
  const canReply = status !== "DECLINED" && !showAcceptBanner

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
          {otherUser.avatarUrl ? (
            <Image src={otherUser.avatarUrl} alt={otherUser.displayName} fill className="object-cover" sizes="36px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82] text-white text-sm font-bold">
              {otherUser.displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{otherUser.displayName}</p>
          <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">{t("emptyThread")}</p>}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.senderId === viewerId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {showAcceptBanner && (
        <div className="border-t px-4 py-3 flex items-center justify-between gap-3 bg-muted">
          <span className="text-sm">
            <span className="font-medium">{otherUser.displayName}</span> {t("requestFrom")}
          </span>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => handleRespond("DECLINED")}>
              {t("decline")}
            </Button>
            <Button size="sm" onClick={() => handleRespond("ACCEPTED")}>
              {t("accept")}
            </Button>
          </div>
        </div>
      )}

      {status === "PENDING" && isInitiator && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          {t("waitingForAccept", { name: otherUser.displayName })}
        </p>
      )}

      {canReply && (
        <form onSubmit={handleSend} className="border-t p-3 flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("typePlaceholder")}
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label={t("send")}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  )
}

function MessageBubble({ message, isOwn }: { message: MessageItem; isOwn: boolean }) {
  const t = useTranslations("Messages")
  const quote = message.quoteMeta as QuoteCardInput | null

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
          isOwn ? "bg-foreground text-white" : "bg-muted text-foreground"
        )}
      >
        {quote ? (
          <div className="space-y-1">
            <p className="italic">&ldquo;{quote.quote}&rdquo;</p>
            <p className={cn("text-xs", isOwn ? "text-white/70" : "text-muted-foreground")}>
              {t("quoteCardLabel", { bookTitle: quote.bookTitle })} · {quote.chapterTitle}
            </p>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>
    </div>
  )
}
