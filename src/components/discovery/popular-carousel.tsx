"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { BookGridCard } from "./book-grid-card"
import type { DiscoveryBookCard } from "@/actions/discovery"

interface PopularCarouselProps {
  books: DiscoveryBookCard[]
}

export function PopularCarousel({ books }: PopularCarouselProps) {
  const t = useTranslations("Common")
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  function scrollToIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, books.length - 1))
    cardRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
    setActiveIndex(clamped)
  }

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    let closest = 0
    let closestDistance = Infinity
    cardRefs.current.forEach((card, i) => {
      if (!card) return
      const distance = Math.abs(card.offsetLeft - track.scrollLeft)
      if (distance < closestDistance) {
        closestDistance = distance
        closest = i
      }
    })
    setActiveIndex(closest)
  }

  if (books.length === 0) return null

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {books.map((book, i) => (
          <div
            key={book.id}
            ref={(el) => {
              cardRefs.current[i] = el
            }}
            className="w-40 sm:w-44 shrink-0 snap-start"
          >
            <BookGridCard book={book} />
          </div>
        ))}
      </div>

      {books.length > 1 && (
        <>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label={t("previous")}
              className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {books.map((book, i) => (
                <button
                  key={book.id}
                  type="button"
                  aria-label={t("goToItem", { title: book.title })}
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    i === activeIndex ? "bg-foreground" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex === books.length - 1}
              aria-label={t("next")}
              className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
