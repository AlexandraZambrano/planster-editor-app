import { cn } from "@/lib/utils"
import { BookGridCard } from "./book-grid-card"
import type { DiscoveryBookCard } from "@/actions/discovery"

interface BookSectionProps {
  id?: string
  title: string
  titleClassName?: string
  books: DiscoveryBookCard[]
}

export function BookSection({ id, title, titleClassName, books }: BookSectionProps) {
  if (books.length === 0) return null

  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className={cn("text-lg font-semibold mb-4", titleClassName)}>{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-5">
        {books.map((book) => (
          <BookGridCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  )
}
