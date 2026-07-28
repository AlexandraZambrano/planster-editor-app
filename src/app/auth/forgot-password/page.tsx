import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = { title: "Forgot password" }

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth")

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("forgotPasswordTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("forgotPasswordSubtitle")}</p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium text-foreground hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  )
}
