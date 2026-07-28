"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PasswordInput } from "@/components/ui/password-input"
import { GoogleButton } from "@/components/auth/google-button"
import { registerUser } from "@/actions/auth"
import { createClient } from "@/lib/supabase/client"

export function RegisterForm() {
  const router = useRouter()
  const t = useTranslations("Auth")
  const [error, setError] = useState<string | null>(null)

  const registerSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("invalidEmail")),
        displayName: z.string().min(1, t("displayNameRequired")),
        username: z
          .string()
          .min(3, t("usernameTooShort"))
          .max(30, t("usernameTooLong"))
          .regex(/^[a-zA-Z0-9_]+$/, t("usernameInvalidChars")),
        password: z.string().min(8, t("passwordTooShort")),
        acceptPolicy: z.literal(true, {
          errorMap: () => ({ message: t("mustAcceptPolicy") }),
        }),
      }),
    [t]
  )

  type RegisterFormData = z.infer<typeof registerSchema>

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    setError(null)

    const result = await registerUser({
      email: data.email,
      displayName: data.displayName,
      username: data.username,
      password: data.password,
    })

    if (result.error) {
      setError(result.error)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError) {
      router.push("/auth/login")
      return
    }

    router.push("/write")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="register-form">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          autoComplete="username"
          {...register("username")}
          data-testid="username-input"
        />
        {errors.username && (
          <p className="text-sm text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="displayName">{t("displayName")}</Label>
        <Input
          id="displayName"
          autoComplete="name"
          {...register("displayName")}
          data-testid="display-name-input"
        />
        {errors.displayName && (
          <p className="text-sm text-destructive">{errors.displayName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          data-testid="email-input"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          {...register("password")}
          data-testid="password-input"
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Controller
            name="acceptPolicy"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="acceptPolicy"
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                data-testid="accept-policy-checkbox"
              />
            )}
          />
          <Label htmlFor="acceptPolicy" className="text-sm font-normal cursor-pointer">
            {t.rich("acceptPolicy", {
              policyLink: (chunks) => (
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  {chunks}
                </Link>
              ),
            })}
          </Label>
        </div>
        {errors.acceptPolicy && (
          <p className="text-sm text-destructive">{errors.acceptPolicy.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        data-testid="submit-button"
      >
        {isSubmitting ? t("creatingAccount") : t("register")}
      </Button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">{t("or")}</span>
        </div>
      </div>

      <GoogleButton label={t("signUpWithGoogle")} />
    </form>
  )
}
