import { prisma } from "@/lib/prisma"
import type { User } from "@prisma/client"

export const SYSTEM_SHELVES = {
  createMany: {
    data: [
      { name: "Reading now", isSystem: true },
      { name: "Want to read", isSystem: true },
      { name: "Read", isSystem: true },
    ],
  },
}

export async function generateUniqueUsername(base: string): Promise<string> {
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 25) || "user"
  let candidate = cleaned
  let suffix = 0
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    suffix += 1
    candidate = `${cleaned}${suffix}`
  }
  return candidate
}

interface OAuthProfileInput {
  authUserId: string
  email: string
  displayName?: string | null
  avatarUrl?: string | null
}

/**
 * Google already verifies email ownership, so this path (unlike password
 * registration) is allowed to claim a pre-existing, unlinked Prisma row by
 * email — e.g. a legacy account from before this app used Supabase Auth.
 */
export async function findOrCreateProfileForOAuth(input: OAuthProfileInput): Promise<User> {
  const linked = await prisma.user.findUnique({ where: { authUserId: input.authUserId } })
  if (linked) return linked

  const byEmail = await prisma.user.findUnique({ where: { email: input.email } })
  if (byEmail) {
    if (!byEmail.authUserId) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: { authUserId: input.authUserId },
      })
    }
    // Already linked to a different Supabase user than this sign-in — surface
    // as-is; the caller has no other Prisma row to fall back to for this email.
    return byEmail
  }

  const username = await generateUniqueUsername(
    input.displayName ?? input.email.split("@")[0]
  )

  return prisma.user.create({
    data: {
      authUserId: input.authUserId,
      email: input.email,
      username,
      displayName: input.displayName ?? username,
      avatarUrl: input.avatarUrl ?? null,
      shelves: SYSTEM_SHELVES,
    },
  })
}
