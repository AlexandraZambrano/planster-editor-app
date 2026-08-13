import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { SiteNav } from "@/components/shared/site-nav"
import { MessageThread } from "@/components/messages/message-thread"
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
      <MessageThread
        conversationId={conversation.id}
        otherUser={conversation.otherUser}
        viewerId={session.user.id}
        initialMessages={messages ?? []}
        initialStatus={conversation.status}
        isInitiator={conversation.isInitiator}
      />
    </>
  )
}
