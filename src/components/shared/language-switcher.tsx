"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Globe } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setLocale } from "@/actions/locale"
import { LOCALES, LOCALE_LABELS } from "@/i18n/locales"

export function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations("Language")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleChange(next: string) {
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className="h-9 w-9 justify-center border-none bg-transparent p-0 [&>svg:last-child]:hidden"
        aria-label={t("label")}
      >
        <Globe className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
