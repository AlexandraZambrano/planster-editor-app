"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BOOK_GENRES, LANGUAGES, BOOK_STATUS_LABELS } from "@/lib/constants"

const SEARCH_DEBOUNCE_MS = 300
const MIN_RATINGS = [0, 1, 2, 3, 4]

export function ExploreFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("Explore")
  const tCommon = useTranslations("Common")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedGenres = searchParams.getAll("genre")
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "")
  }, [searchParams])

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete("page")
    router.push(`/explore?${params.toString()}`)
  }

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams((params) => {
        if (value.trim()) params.set("q", value.trim())
        else params.delete("q")
      })
    }, SEARCH_DEBOUNCE_MS)
  }

  function toggleGenre(genre: string, checked: boolean) {
    pushParams((params) => {
      params.delete("genre")
      const next = checked ? [...selectedGenres, genre] : selectedGenres.filter((g) => g !== genre)
      next.forEach((g) => params.append("genre", g))
    })
  }

  function updateParam(key: string, value: string, emptyValue = "all") {
    pushParams((params) => {
      if (value === emptyValue) params.delete(key)
      else params.set(key, value)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-8 h-8 text-sm"
          data-testid="explore-search"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid="genre-filter-trigger">
            {t("genres")}{selectedGenres.length > 0 ? ` (${selectedGenres.length})` : ""}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 max-h-72 overflow-y-auto" align="start">
          <div className="space-y-2">
            {BOOK_GENRES.map((genre) => (
              <div key={genre} className="flex items-center gap-2">
                <Checkbox
                  id={`genre-${genre}`}
                  checked={selectedGenres.includes(genre)}
                  onCheckedChange={(checked) => toggleGenre(genre, checked === true)}
                />
                <Label htmlFor={`genre-${genre}`} className="text-sm font-normal cursor-pointer">
                  {genre}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Select value={searchParams.get("language") ?? "all"} onValueChange={(v) => updateParam("language", v)}>
        <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="language-filter">
          <SelectValue placeholder={t("language")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allLanguages")}</SelectItem>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-[150px] h-8 text-xs" data-testid="status-filter">
          <SelectValue placeholder={t("status")} />
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

      <Select
        value={searchParams.get("minRating") ?? "0"}
        onValueChange={(v) => updateParam("minRating", v, "0")}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="rating-filter">
          <SelectValue placeholder={t("minRating")} />
        </SelectTrigger>
        <SelectContent>
          {MIN_RATINGS.map((r) => (
            <SelectItem key={r} value={String(r)}>
              {r === 0 ? t("anyRating") : t("minRatingStars", { count: r })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
