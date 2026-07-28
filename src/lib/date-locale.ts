import { useLocale } from "next-intl"
import { es, ca, pt, fr, type Locale } from "date-fns/locale"

const DATE_FNS_LOCALES: Record<string, Locale> = { es, ca, pt, fr }

export function useDateLocale(): Locale | undefined {
  const locale = useLocale()
  return DATE_FNS_LOCALES[locale]
}
