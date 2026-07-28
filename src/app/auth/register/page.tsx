import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = { title: "Create account" }

export default async function RegisterPage() {
  const t = await getTranslations("Auth")

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("joinUs")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("registerSubtitle")}</p>
      </div>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/auth/login" className="font-medium text-foreground hover:underline">
          {t("loginHere")}
        </Link>
      </p>
    </>
  )
}
