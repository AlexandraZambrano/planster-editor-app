import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Sign in" }

interface Props {
  searchParams: Promise<{ reset?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your Planster account</p>
      </div>

      {params.reset === "success" && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Password reset successfully. You can now sign in with your new password.
        </div>
      )}

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-medium text-foreground hover:underline">
          Sign up
        </Link>
      </p>
    </>
  )
}
