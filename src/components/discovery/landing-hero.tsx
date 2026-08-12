import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"

export async function LandingHero() {
  const t = await getTranslations("Landing")

  return (
    <section className="bg-white">
      <div className="container mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <div className="flex justify-end gap-2 mb-8">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/explore">{t("startReading")}</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/write/new">{t("startWriting")}</Link>
          </Button>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-2xl">
          {t("headline")}
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mt-5 leading-relaxed">
          {t("subheadline")} <span aria-hidden>✨</span>Planster<span aria-hidden>✨</span>
        </p>

        <div className="flex gap-3 mt-8">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/explore">{t("seeNow")}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
