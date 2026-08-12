import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { findOrCreateProfileForOAuth } from "@/lib/user-provisioning"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/write"

  // Behind Coolify's reverse proxy, request.url's origin reflects the
  // container's internal address, not the public domain — prefer the
  // configured app URL (same pattern as the password-reset email link).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user?.email) {
      await findOrCreateProfileForOAuth({
        authUserId: data.user.id,
        email: data.user.email,
        displayName:
          (data.user.user_metadata?.full_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined) ??
          null,
        avatarUrl:
          (data.user.user_metadata?.avatar_url as string | undefined) ??
          (data.user.user_metadata?.picture as string | undefined) ??
          null,
      })

      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${appUrl}/auth/login`)
}
