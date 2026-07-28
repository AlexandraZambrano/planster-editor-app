"use server"

import { cookies } from "next/headers"
import { isLocale } from "@/i18n/locales"
import { LOCALE_COOKIE } from "@/i18n/request"

export async function setLocale(locale: string): Promise<{ error?: string; success?: boolean }> {
  if (!isLocale(locale)) return { error: "Unsupported locale" }

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  })

  return { success: true }
}
