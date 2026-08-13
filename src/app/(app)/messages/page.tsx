import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { SiteNav } from "@/components/shared/site-nav"
import { InboxList } from "@/components/messages/inbox-list"
import { getConversations } from "@/actions/messages"

export const metadata: Metadata = { title: "Messages" }

export default async function MessagesPage() {
  const [{ requests, active }, t] = await Promise.all([getConversations(), getTranslations("Messages")])

  return (
    <>
      <SiteNav />
      <main className="bg-white min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto py-10 px-4 max-w-2xl">
          <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
          <InboxList requests={requests ?? []} active={active ?? []} />
        </div>
      </main>
    </>
  )
}
