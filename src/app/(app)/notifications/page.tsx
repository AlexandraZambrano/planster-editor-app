import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { getNotifications } from "@/actions/notifications"
import { NotificationList } from "@/components/notifications/notification-list"
import { SiteNav } from "@/components/shared/site-nav"

export const metadata: Metadata = { title: "Notifications" }

export default async function NotificationsPage() {
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [{ notifications = [] }, t] = await Promise.all([
    getNotifications(),
    getTranslations("Notifications"),
  ])

  return (
    <>
      <SiteNav />
      <main className="container mx-auto py-10 px-4 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
        <NotificationList initialNotifications={notifications} />
      </main>
    </>
  )
}
