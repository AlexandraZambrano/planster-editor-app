"use server"

import { prisma } from "@/lib/prisma"

export type QuoteShareData = {
  id: string
  quote: string
  imageUrl: string
  book: { id: string; title: string }
  chapter: { id: string; title: string }
}

export async function getQuoteShare(id: string): Promise<{ error?: string; share?: QuoteShareData }> {
  const share = await prisma.quoteShare.findUnique({
    where: { id },
    select: {
      id: true,
      quote: true,
      imageUrl: true,
      book: { select: { id: true, title: true } },
      chapter: { select: { id: true, title: true } },
    },
  })
  if (!share) return { error: "Not found" }

  return { share }
}
