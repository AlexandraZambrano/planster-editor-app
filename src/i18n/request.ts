import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { DEFAULT_LOCALE, isLocale } from "./locales"

export const LOCALE_COOKIE = "locale"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = cookieValue && isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
