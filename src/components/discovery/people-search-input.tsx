"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"

const SEARCH_DEBOUNCE_MS = 300

export function PeopleSearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("People")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "")
  }, [searchParams])

  function handleChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) params.set("q", value.trim())
      else params.delete("q")
      router.push(`/explore/people?${params.toString()}`)
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="relative max-w-sm mb-6">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={searchInput}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="pl-8 h-9 text-sm"
        data-testid="people-search"
      />
    </div>
  )
}
