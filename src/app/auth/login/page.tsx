import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Sign in" }

interface Props {
  searchParams: Promise<{ reset?: string; passwordChanged?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Auth")])

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("welcomeBack")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("signInSubtitle")}</p>
      </div>

      {params.reset === "success" && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {t("resetSuccess")}
        </div>
      )}

      {params.passwordChanged === "true" && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {t("passwordChangedSignInAgain")}
        </div>
      )}

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/auth/register" className="font-medium text-foreground hover:underline">
          {t("signUpHere")}
        </Link>
      </p>
    </>
  )
}
