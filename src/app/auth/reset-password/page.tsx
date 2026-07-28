import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = { title: "Reset password" }

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Auth")])

  if (!params.token) {
    redirect("/auth/forgot-password")
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("setNewPasswordTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("setNewPasswordSubtitle")}</p>
      </div>

      <ResetPasswordForm token={params.token} />
    </>
  )
}
