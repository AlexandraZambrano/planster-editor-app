"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type SettingsData = {
  displayName: string
  username: string
  bio: string | null
  avatarUrl: string | null
  avatarPositionY: number
  showLibraryCount: boolean
  showRatingsAndReviews: boolean
}

export async function getSettings(): Promise<{ error?: string; settings?: SettingsData }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      displayName: true,
      username: true,
      bio: true,
      avatarUrl: true,
      avatarPositionY: true,
      showLibraryCount: true,
      showRatingsAndReviews: true,
    },
  })
  if (!user) return { error: "Not found" }

  return { settings: user }
}

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100, "Display name is too long"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  bio: z.string().max(300, "Bio cannot exceed 300 characters").optional(),
  avatarUrl: z.string().optional(),
  avatarPositionY: z.number().int().min(0).max(100).default(50),
})

export type ProfileInput = z.infer<typeof profileSchema>

export async function updateProfile(
  data: ProfileInput
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data" }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true },
  })
  if (existing && existing.id !== session.user.id) {
    return { error: "This username is already taken" }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName: parsed.data.displayName,
      username: parsed.data.username,
      bio: parsed.data.bio?.trim() || null,
      avatarUrl: parsed.data.avatarUrl || null,
      avatarPositionY: parsed.data.avatarPositionY,
    },
  })

  revalidatePath("/settings")
  revalidatePath(`/@${parsed.data.username}`)
  return { success: true }
}

export async function updatePrivacySettings(data: {
  showLibraryCount: boolean
  showRatingsAndReviews: boolean
}): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      showLibraryCount: data.showLibraryCount,
      showRatingsAndReviews: data.showRatingsAndReviews,
    },
  })

  revalidatePath("/settings")
  return { success: true }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export async function changePassword(
  data: ChangePasswordInput
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const parsed = changePasswordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data" }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { authUserId: true },
  })
  if (!user?.authUserId) return { error: "Not found" }

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: parsed.data.currentPassword,
  })
  if (verifyError) return { error: "Current password is incorrect" }

  const supabaseAdmin = createAdminClient()
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.authUserId,
    { password: parsed.data.newPassword }
  )
  if (updateError) return { error: "Something went wrong. Please try again." }

  // Supabase invalidates the user's other sessions on a password change; the
  // caller signs out and redirects to /auth/login after a successful result.
  return { success: true }
}
