import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { BookForm } from "@/components/book/book-form"

export const metadata: Metadata = { title: "New book" }

export default async function NewBookPage() {
  const session = await auth()
  if (!session) redirect("/auth/login")

  return (
    <main className="container mx-auto py-10 px-4 max-w-2xl">
      <Link
        href="/write"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to my books
      </Link>

      <h1 className="text-2xl font-bold mb-8">Create a new book</h1>

      <BookForm />
    </main>
  )
}
