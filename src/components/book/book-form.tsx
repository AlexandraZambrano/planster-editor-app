"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CoverUpload } from "./cover-upload"
import { TagInput } from "./tag-input"
import { GenreSelect } from "./genre-select"
import { createBook, updateBook } from "@/actions/books"
import { LANGUAGES, BOOK_STATUS_LABELS, BOOK_LICENSES } from "@/lib/constants"

interface BookFormProps {
  bookId?: string
  defaultValues?: Partial<FormData>
  onSuccess?: () => void
}

type FormData = {
  title: string
  synopsis?: string
  coverUrl?: string
  genres: string[]
  tags: string[]
  language: string
  bookStatus: "IN_PROGRESS" | "COMPLETE" | "PAUSED"
  license: "ALL_RIGHTS_RESERVED" | "CC_BY" | "CC_BY_NC" | "CC_BY_NC_ND" | "PUBLIC_DOMAIN"
}

export function BookForm({ bookId, defaultValues, onSuccess }: BookFormProps) {
  const router = useRouter()
  const t = useTranslations("Write")
  const tCommon = useTranslations("Common")
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!bookId

  const formSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("titleRequired")).max(200, t("titleTooLong")),
        synopsis: z.string().max(2000, t("synopsisTooLong")).optional(),
        coverUrl: z.string().optional(),
        genres: z.array(z.string()),
        tags: z.array(z.string().max(30)).max(10),
        language: z.string(),
        bookStatus: z.enum(["IN_PROGRESS", "COMPLETE", "PAUSED"]),
        license: z.enum(["ALL_RIGHTS_RESERVED", "CC_BY", "CC_BY_NC", "CC_BY_NC_ND", "PUBLIC_DOMAIN"]),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      synopsis: "",
      coverUrl: "",
      genres: [],
      tags: [],
      language: "es",
      bookStatus: "IN_PROGRESS",
      license: "ALL_RIGHTS_RESERVED",
      ...defaultValues,
    },
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const result = isEditing
      ? await updateBook(bookId, data)
      : await createBook(data)

    if ("error" in result && result.error) {
      setError(result.error)
      return
    }

    if (!isEditing && "bookId" in result && result.bookId) {
      router.push(`/write/${result.bookId}`)
    } else {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-6 items-start">
        <Controller
          name="coverUrl"
          control={control}
          render={({ field }) => (
            <CoverUpload value={field.value} onChange={field.onChange} />
          )}
        />

        <div className="flex-1 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("titleField")} *</Label>
            <Input id="title" {...register("title")} data-testid="title-input" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="synopsis">{t("synopsis")}</Label>
            <Textarea
              id="synopsis"
              rows={4}
              placeholder={t("synopsisPlaceholder")}
              {...register("synopsis")}
            />
            {errors.synopsis && (
              <p className="text-sm text-destructive">{errors.synopsis.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("genres")}</Label>
        <Controller
          name="genres"
          control={control}
          render={({ field }) => (
            <GenreSelect value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("tags")}</Label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput
              value={field.value}
              onChange={field.onChange}
              placeholder={t("tagsPlaceholder")}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
        {errors.tags && <p className="text-sm text-destructive">{errors.tags.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="language">{t("language")}</Label>
          <Controller
            name="language"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bookStatus">{t("writingStatus")}</Label>
          <Controller
            name="bookStatus"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="bookStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(BOOK_STATUS_LABELS).map((value) => (
                    <SelectItem key={value} value={value}>
                      {tCommon(`bookStatus.${value}` as "bookStatus.IN_PROGRESS")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="license">{t("license")}</Label>
        <Controller
          name="license"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="license">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOK_LICENSES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {tCommon(`bookLicense.${l.code}` as "bookLicense.ALL_RIGHTS_RESERVED")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">{t("licenseHint")}</p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting} data-testid="submit-button">
          {isSubmitting
            ? isEditing
              ? t("saving")
              : t("creating")
            : isEditing
              ? t("saveChanges")
              : t("createBook")}
        </Button>
      </div>
    </form>
  )
}
