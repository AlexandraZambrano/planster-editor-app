import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SiteNav } from "@/components/shared/site-nav"
import { MessageThread } from "@/components/messages/message-thread"
import { MessagesSidebar } from "@/components/messages/messages-sidebar"
import { findConversationWithUser } from "@/actions/messages"

interface Props {
  params: Promise<{ username: string }>
}

export const metadata: Metadata = { title: "Messages" }

export default async function NewConversationPage({ params }: Props) {
  const { username } = await params
  const session = await auth()
  if (!session) notFound()

  const otherUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  })
  if (!otherUser || otherUser.id === session.user.id) notFound()

  const { conversationId } = await findConversationWithUser(otherUser.id)
  if (conversationId) redirect(`/messages/${conversationId}`)

  return (
    <>
      <SiteNav />
      <div className="flex md:h-[calc(100vh-4rem)]">
        <MessagesSidebar />
        <MessageThread
          conversationId={null}
          otherUser={otherUser}
          viewerId={session.user.id}
          initialMessages={[]}
          initialStatus={null}
          isInitiator={true}
        />
      </div>
    </>
  )
}
