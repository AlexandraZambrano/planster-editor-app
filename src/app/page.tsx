import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { getHomeData } from "@/actions/discovery"
import { SiteNav } from "@/components/shared/site-nav"
import { LandingHero } from "@/components/discovery/landing-hero"
import { HowItWorks } from "@/components/discovery/how-it-works"
import { AuthenticatedHome } from "@/components/discovery/authenticated-home"
import { PopularReadsStack } from "@/components/discovery/popular-reads-stack"
import { PopularCarousel } from "@/components/discovery/popular-carousel"
import { BookSection } from "@/components/discovery/book-section"
import { GenreGrid } from "@/components/discovery/genre-grid"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Discover stories" }

export default async function Home() {
  const [session, { featured, recent, popular }, t] = await Promise.all([
    auth(),
    getHomeData(),
    getTranslations("Home"),
  ])

  return (
    <>
      <SiteNav active="home" />

      {session ? (
        <>
          <AuthenticatedHome displayName={session.user.username} />

          <main className="container mx-auto py-14 px-4 max-w-6xl">
            <section className="mb-14">
              <h2 className="text-2xl font-bold text-center mb-8">{t("bestReads")}</h2>
              {popular.length > 0 ? (
                <PopularCarousel books={popular} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">{t("noRatedBooks")}</p>
              )}
            </section>

            <BookSection title={t("featured")} books={featured} />
            <BookSection title={t("mostRecent")} books={recent} />

            <section>
              <h2 className="text-lg font-semibold mb-4">{t("browseByGenre")}</h2>
              <GenreGrid />
            </section>
          </main>
        </>
      ) : (
        <>
          <LandingHero />
          <HowItWorks />

          <section className="bg-muted py-16 text-center">
            <h2 className="text-3xl font-extrabold mb-8">{t("mostPopularReads")}</h2>

            {popular.length > 0 ? (
              <>
                <PopularReadsStack books={popular} />
                <Button asChild size="lg" className="rounded-full mt-10">
                  <Link href="/explore">{t("seeNow")}</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noRatedBooks")}</p>
            )}
          </section>
        </>
      )}
    </>
  )
}
