"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

interface PaginationControlsProps {
  page: number
  totalPages: number
}

export function PaginationControls({ page, totalPages }: PaginationControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("Common")

  if (totalPages <= 1) return null

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(nextPage))
    router.push(`/explore?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("previous")}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("pageOf", { page, totalPages })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => goTo(page + 1)}
      >
        {t("next")}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}
