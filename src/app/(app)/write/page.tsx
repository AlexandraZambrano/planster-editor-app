import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { PlusIcon, BookOpen } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { BookCard } from "@/components/book/book-card"

export const metadata: Metadata = { title: "My books" }

export default async function WritePage() {
  const session = await auth()
  if (!session) redirect("/auth/login")

  const books = await prisma.book.findMany({
    where: { authorId: session.user.id },
    select: {
      id: true,
      title: true,
      coverUrl: true,
      publicationStatus: true,
      updatedAt: true,
      _count: { select: { chapters: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <main className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My books</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {session.user.name ?? session.user.username}
          </p>
        </div>
        <Button asChild>
          <Link href="/write/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New book
          </Link>
        </Button>
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">No books yet</p>
          <p className="text-sm mb-6">Start writing your story today.</p>
          <Button asChild>
            <Link href="/write/new">Create your first book</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              chapterCount={book._count.chapters}
            />
          ))}
        </div>
      )}
    </main>
  )
}
