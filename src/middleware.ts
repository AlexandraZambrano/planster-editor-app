import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const PROTECTED_PREFIXES = ["/write", "/library", "/read", "/notifications", "/settings"]

export default async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  )

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Run on every route except static assets, so the session cookie stays
    // refreshed everywhere (site-nav and the home page read auth() outside
    // the protected prefixes above, and Supabase's rotating refresh tokens
    // need proactive refresh to avoid a logged-out flicker).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
