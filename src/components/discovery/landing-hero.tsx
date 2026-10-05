import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PopularReadsStack } from "./popular-reads-stack"
import type { DiscoveryBookCard } from "@/actions/discovery"

export async function LandingHero({ books }: { books: DiscoveryBookCard[] }) {
  const t = await getTranslations("Landing")

  return (
    <section className="relative overflow-hidden">
      {/* Decorative glow — purely visual */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-highlight/20 blur-3xl" />

      <div className="relative container mx-auto max-w-6xl px-4 py-14 sm:py-20 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05]">
            {t("headline")}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mt-6 leading-relaxed">
            {t("subheadline")} <span aria-hidden>✨</span>Planster<span aria-hidden>✨</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button asChild size="lg">
              <Link href="/write/new">
                {t("startWriting")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/explore">{t("startReading")}</Link>
            </Button>
          </div>
        </div>

        {books.length > 0 && <PopularReadsStack books={books} />}
      </div>
    </section>
  )
}
