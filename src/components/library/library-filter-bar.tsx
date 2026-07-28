"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BOOK_GENRES, BOOK_STATUS_LABELS } from "@/lib/constants"
import type { ShelfWithCount } from "@/actions/library"

interface LibraryFilterBarProps {
  shelves: ShelfWithCount[]
}

export function LibraryFilterBar({ shelves }: LibraryFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("Library")
  const tCommon = useTranslations("Common")

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/library?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Select value={searchParams.get("shelf") ?? "all"} onValueChange={(v) => updateParam("shelf", v)}>
        <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="shelf-filter">
          <SelectValue placeholder={t("allShelves")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allShelves")}</SelectItem>
          {shelves.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("genre") ?? "all"} onValueChange={(v) => updateParam("genre", v)}>
        <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="genre-filter">
          <SelectValue placeholder={t("allGenres")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allGenres")}</SelectItem>
          {BOOK_GENRES.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-[150px] h-8 text-xs" data-testid="status-filter">
          <SelectValue placeholder={t("allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          {Object.keys(BOOK_STATUS_LABELS).map((value) => (
            <SelectItem key={value} value={value}>
              {tCommon(`bookStatus.${value}` as "bookStatus.IN_PROGRESS")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("sort") ?? "addedAt"} onValueChange={(v) => updateParam("sort", v)}>
        <SelectTrigger className="w-[150px] h-8 text-xs" data-testid="sort-select">
          <SelectValue placeholder={t("sortBy")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="addedAt">{t("dateSaved")}</SelectItem>
          <SelectItem value="rating">{t("rating")}</SelectItem>
          <SelectItem value="title">{t("titleLabel")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
