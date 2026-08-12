import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { getSettings } from "@/actions/settings"
import { SiteNav } from "@/components/shared/site-nav"
import { ProfileForm } from "@/components/settings/profile-form"
import { PrivacyToggles } from "@/components/settings/privacy-toggles"
import { ChangePasswordForm } from "@/components/settings/change-password-form"

export const metadata: Metadata = { title: "Profile" }

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/auth/login")

  const [{ settings, error }, t] = await Promise.all([getSettings(), getTranslations("Settings")])
  if (error || !settings) redirect("/auth/login")

  return (
    <>
      <SiteNav />
      <main className="bg-white min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto py-10 px-4 max-w-2xl space-y-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{t("title")}</h1>

          <section className="bg-muted rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{t("profile")}</h2>
            <ProfileForm initial={settings} />
          </section>

          <section className="bg-muted rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{t("privacy")}</h2>
            <PrivacyToggles initial={settings} />
          </section>

          <section className="bg-muted rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{t("password")}</h2>
            <ChangePasswordForm />
          </section>
        </div>
      </main>
    </>
  )
}
