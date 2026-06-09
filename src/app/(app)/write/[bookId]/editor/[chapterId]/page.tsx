import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TiptapEditor } from "@/components/editor/tiptap-editor"

interface Props {
  params: Promise<{ bookId: string; chapterId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapterId } = await params
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { title: true },
  })
  return { title: chapter?.title ?? "Editor" }
}

export default async function EditorPage({ params }: Props) {
  const { bookId, chapterId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      content: true,
      wordCount: true,
      bookId: true,
      book: {
        select: {
          id: true,
          title: true,
          authorId: true,
        },
      },
    },
  })

  if (!chapter || chapter.bookId !== bookId || chapter.book.authorId !== session.user.id) {
    notFound()
  }

  return (
    <TiptapEditor
      chapterId={chapter.id}
      bookId={bookId}
      chapterTitle={chapter.title}
      bookTitle={chapter.book.title}
      initialContent={chapter.content as object}
    />
  )
}
