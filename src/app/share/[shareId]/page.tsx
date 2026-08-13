import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { SiteNav } from "@/components/shared/site-nav"
import { Button } from "@/components/ui/button"
import { getQuoteShare } from "@/actions/quote-share"

interface Props {
  params: Promise<{ shareId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params
  const { share } = await getQuoteShare(shareId)
  if (!share) return {}

  const title = share.book.title
  const description = share.quote.length > 150 ? `${share.quote.slice(0, 150)}…` : share.quote

  return {
    title,
    description,
    openGraph: { title, description, images: [share.imageUrl] },
    twitter: { card: "summary_large_image", title, description, images: [share.imageUrl] },
  }
}

export default async function QuoteSharePage({ params }: Props) {
  const { shareId } = await params
  const [{ share }, t] = await Promise.all([getQuoteShare(shareId), getTranslations("ShareLanding")])

  if (!share) notFound()

  return (
    <>
      <SiteNav />
      <main className="bg-white min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto py-10 px-4 max-w-lg">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden border shadow-sm">
            <Image
              src={share.imageUrl}
              alt={share.quote}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
              priority
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3 text-center">
            {share.chapter.title} · {share.book.title}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href={`/books/${share.book.id}`}>{t("readBook")}</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("joinPrompt")}{" "}
              <Link href="/auth/register" className="underline font-medium text-foreground">
                {t("joinCta")}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
