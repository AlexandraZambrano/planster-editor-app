"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PasswordInput } from "@/components/ui/password-input"
import { GoogleButton } from "@/components/auth/google-button"
import { createClient } from "@/lib/supabase/client"
import { getEmailForIdentifier } from "@/actions/auth"

export function LoginForm() {
  const router = useRouter()
  const t = useTranslations("Auth")
  const [error, setError] = useState<string | null>(null)

  const loginSchema = useMemo(
    () =>
      z.object({
        identifier: z.string().min(1, t("identifierRequired")),
        password: z.string().min(1, t("passwordRequired")),
      }),
    [t]
  )

  type LoginFormData = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setError(null)

    const { email, error: identifierError } = await getEmailForIdentifier(data.identifier)
    if (identifierError || !email) {
      setError(t("invalidCredentials"))
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    })

    if (signInError) {
      setError(t("invalidCredentials"))
      return
    }

    router.push("/write")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="login-form">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="identifier">{t("usernameOrEmail")}</Label>
        <Input
          id="identifier"
          autoComplete="username"
          {...register("identifier")}
          data-testid="identifier-input"
        />
        {errors.identifier && (
          <p className="text-sm text-destructive">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          {...register("password")}
          data-testid="password-input"
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        data-testid="submit-button"
      >
        {isSubmitting ? t("signingIn") : t("login")}
      </Button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">{t("or")}</span>
        </div>
      </div>

      <GoogleButton label={t("signInWithGoogle")} />
    </form>
  )
}
