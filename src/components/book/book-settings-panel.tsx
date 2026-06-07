"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { BookForm } from "./book-form"
import { updateBookPublicationStatus, deleteBook } from "@/actions/books"
import { PUBLICATION_STATUS_LABELS } from "@/lib/constants"
import type { Book } from "@prisma/client"

interface BookSettingsPanelProps {
  book: Pick<
    Book,
    | "id"
    | "title"
    | "synopsis"
    | "coverUrl"
    | "genres"
    | "tags"
    | "language"
    | "bookStatus"
    | "publicationStatus"
  >
}

export function BookSettingsPanel({ book }: BookSettingsPanelProps) {
  const router = useRouter()
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<"idle" | "betaWarning">("idle")

  function handleStatusChange(newStatus: string) {
    setStatusError(null)
    startTransition(async () => {
      const result = await updateBookPublicationStatus(book.id, newStatus as any)
      if (result.error) setStatusError(result.error)
    })
  }

  async function handleDelete(force = false) {
    startTransition(async () => {
      const result = await deleteBook(book.id, force)
      if (result.requiresConfirmation) {
        setDeleteConfirmStep("betaWarning")
        return
      }
      if (result.error) return
      router.push("/write")
    })
  }

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Book metadata */}
      <section>
        <h3 className="text-base font-semibold mb-4">Book details</h3>
        <BookForm
          bookId={book.id}
          defaultValues={{
            title: book.title,
            synopsis: book.synopsis ?? "",
            coverUrl: book.coverUrl ?? "",
            genres: book.genres,
            tags: book.tags,
            language: book.language,
            bookStatus: book.bookStatus as any,
          }}
          onSuccess={() => {}}
        />
      </section>

      <Separator />

      {/* Publication status */}
      <section>
        <h3 className="text-base font-semibold mb-1">Publication status</h3>
        <p className="text-sm text-muted-foreground mb-4">
          <strong>Draft:</strong> only you can see it.{" "}
          <strong>Beta:</strong> approved beta readers can access it.{" "}
          <strong>Published:</strong> visible in the catalogue to all readers.
        </p>
        {statusError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{statusError}</AlertDescription>
          </Alert>
        )}
        <Select
          value={book.publicationStatus}
          onValueChange={handleStatusChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PUBLICATION_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <Separator />

      {/* Danger zone */}
      <section>
        <h3 className="text-base font-semibold text-destructive mb-1">Danger zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete this book and all its chapters, comments, and data.
        </p>

        {deleteConfirmStep === "betaWarning" ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              This book has approved beta readers. Deleting it will revoke their access. Are you sure?
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(true)}
                  disabled={isPending}
                >
                  Yes, delete anyway
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteConfirmStep("idle")}
                >
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete book
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{book.title}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All chapters, plot notes, studio content, and beta
                  reader data will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => handleDelete(false)}
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </section>
    </div>
  )
}
