"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { respondToConversation, type ConversationSummary } from "@/actions/messages"

interface InboxListProps {
  requests: ConversationSummary[]
  active: ConversationSummary[]
}

export function InboxList({ requests, active }: InboxListProps) {
  const t = useTranslations("Messages")
  const [reqList, setReqList] = useState(requests)
  const [activeList, setActiveList] = useState(active)

  async function handleRespond(conversation: ConversationSummary, status: "ACCEPTED" | "DECLINED") {
    const result = await respondToConversation(conversation.id, status)
    if (result.error) return
    setReqList((prev) => prev.filter((c) => c.id !== conversation.id))
    if (status === "ACCEPTED") setActiveList((prev) => [{ ...conversation, status: "ACCEPTED" }, ...prev])
  }

  return (
    <Tabs defaultValue="conversations" className="w-full">
      <TabsList>
        <TabsTrigger value="conversations">{t("conversationsTab")}</TabsTrigger>
        <TabsTrigger value="requests">
          {t("requestsTab")}
          {reqList.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{reqList.length}</span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="conversations" className="mt-4">
        {activeList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("noConversations")}</p>
        ) : (
          <ul className="divide-y">
            {activeList.map((c) => (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2">
                  <Avatar user={c.otherUser} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.otherUser.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.lastMessage?.content ?? (c.lastMessage?.quoteMeta ? "🔖" : "")}
                    </p>
                  </div>
                  {c.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(c.lastMessage.createdAt))}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="requests" className="mt-4">
        {reqList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("noRequests")}</p>
        ) : (
          <ul className="divide-y">
            {reqList.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 px-2">
                <Avatar user={c.otherUser} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.otherUser.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMessage?.content}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleRespond(c, "DECLINED")}>
                    {t("decline")}
                  </Button>
                  <Button size="sm" onClick={() => handleRespond(c, "ACCEPTED")}>
                    {t("accept")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  )
}

function Avatar({ user }: { user: ConversationSummary["otherUser"] }) {
  return (
    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" sizes="40px" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82] text-white text-sm font-bold">
          {user.displayName[0]?.toUpperCase()}
        </div>
      )}
    </div>
  )
}

