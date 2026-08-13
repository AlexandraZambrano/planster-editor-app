import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { SiteNav } from "@/components/shared/site-nav"
import { MessageThread } from "@/components/messages/message-thread"
import { MessagesSidebar } from "@/components/messages/messages-sidebar"
import { getMessages } from "@/actions/messages"

interface Props {
  params: Promise<{ conversationId: string }>
}

export const metadata: Metadata = { title: "Messages" }

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params
  const session = await auth()
  if (!session) notFound()

  const { error, conversation, messages } = await getMessages(conversationId)
  if (error || !conversation) notFound()

  return (
    <>
      <SiteNav />
      <div className="flex md:h-[calc(100vh-4rem)]">
        <MessagesSidebar activeConversationId={conversation.id} />
        <MessageThread
          conversationId={conversation.id}
          otherUser={conversation.otherUser}
          viewerId={session.user.id}
          initialMessages={messages ?? []}
          initialStatus={conversation.status}
          isInitiator={conversation.isInitiator}
        />
      </div>
    </>
  )
}
