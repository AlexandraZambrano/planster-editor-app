"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"
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
import type { Book, PublicationStatus } from "@prisma/client"

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
    | "license"
  >
}

export function BookSettingsPanel({ book }: BookSettingsPanelProps) {
  const router = useRouter()
  const t = useTranslations("Write")
  const tCommon = useTranslations("Common")
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<"idle" | "betaWarning">("idle")

  function handleStatusChange(newStatus: PublicationStatus) {
    setStatusError(null)
    startTransition(async () => {
      const result = await updateBookPublicationStatus(book.id, newStatus)
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
        <h3 className="text-base font-semibold mb-4">{t("bookDetails")}</h3>
        <BookForm
          bookId={book.id}
          defaultValues={{
            title: book.title,
            synopsis: book.synopsis ?? "",
            coverUrl: book.coverUrl ?? "",
            genres: book.genres,
            tags: book.tags,
            language: book.language,
            bookStatus: book.bookStatus,
            license: book.license,
          }}
          onSuccess={() => {}}
        />
      </section>

      <Separator />

      {/* Publication status */}
      <section>
        <h3 className="text-base font-semibold mb-1">{t("publicationStatusTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          <strong>{tCommon("publicationStatus.DRAFT")}:</strong> {t("draftHint")}{" "}
          <strong>{tCommon("publicationStatus.BETA")}:</strong> {t("betaHint")}{" "}
          <strong>{tCommon("publicationStatus.PUBLISHED")}:</strong> {t("publishedHint")}
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
            <SelectItem value="DRAFT">{tCommon("publicationStatus.DRAFT")}</SelectItem>
            <SelectItem value="BETA">{tCommon("publicationStatus.BETA")}</SelectItem>
            <SelectItem value="PUBLISHED">{tCommon("publicationStatus.PUBLISHED")}</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <Separator />

      {/* Danger zone */}
      <section>
        <h3 className="text-base font-semibold text-destructive mb-1">{t("dangerZone")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("dangerZoneHint")}</p>

        {deleteConfirmStep === "betaWarning" ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {t("betaWarning")}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(true)}
                  disabled={isPending}
                >
                  {t("yesDeleteAnyway")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteConfirmStep("idle")}
                >
                  {t("cancel")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                {t("deleteBook")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteBookConfirmTitle", { title: book.title })}</AlertDialogTitle>
                <AlertDialogDescription>{t("deleteBookConfirmDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => handleDelete(false)}
                >
                  {t("deletePermanently")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </section>
    </div>
  )
}
