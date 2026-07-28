import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { SiteNav } from "@/components/shared/site-nav"

export const metadata: Metadata = { title: "Privacy Policy" }

const SECTION_KEYS = [
  "intro",
  "dataWeCollect",
  "howWeUseIt",
  "legalBasis",
  "cookies",
  "thirdParty",
  "sharing",
  "retention",
  "rights",
  "transfers",
  "children",
  "changes",
  "contact",
] as const

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("Privacy")

  return (
    <>
      <SiteNav />
      <main className="container mx-auto py-10 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-1">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("lastUpdated")}</p>

        <div className="space-y-8">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold mb-2">{t(`${key}Title` as "introTitle")}</h2>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {t(`${key}Body` as "introBody")}
              </p>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
