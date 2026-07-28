import Link from "next/link"
import Image from "next/image"
import { BookOpen } from "lucide-react"
import type { DiscoveryBookCard } from "@/actions/discovery"

const OFFSETS = [
  { x: -160, y: 24, rotate: -8, z: 1 },
  { x: -80, y: -8, rotate: -4, z: 2 },
  { x: 0, y: 12, rotate: 0, z: 3 },
  { x: 80, y: -8, rotate: 4, z: 2 },
  { x: 160, y: 24, rotate: 8, z: 1 },
]

interface PopularReadsStackProps {
  books: DiscoveryBookCard[]
}

export function PopularReadsStack({ books }: PopularReadsStackProps) {
  const shown = books.slice(0, OFFSETS.length)

  return (
    <div className="relative mx-auto" style={{ height: 280, maxWidth: 560 }}>
      {shown.map((book, i) => {
        const offset = OFFSETS[i]
        return (
          <Link
            key={book.id}
            href={`/books/${book.id}`}
            className="absolute top-0 left-1/2 w-32 sm:w-36 aspect-[2/3] rounded-lg overflow-hidden border shadow-md bg-muted transition-transform hover:-translate-y-2 hover:z-10"
            style={{
              transform: `translateX(calc(-50% + ${offset.x}px)) translateY(${offset.y}px) rotate(${offset.rotate}deg)`,
              zIndex: offset.z,
            }}
          >
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-400 to-violet-700">
                <span className="text-4xl font-bold text-white select-none">
                  {book.title[0]?.toUpperCase() ?? <BookOpen />}
                </span>
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
