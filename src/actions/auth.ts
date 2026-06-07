"use server"

import crypto from "crypto"
import bcrypt from "bcryptjs"
import { Resend } from "resend"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const resend = new Resend(process.env.RESEND_API_KEY)

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  displayName: z.string().min(1, "Display name is required"),
})

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type RegisterInput = z.infer<typeof registerSchema>
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export async function registerUser(
  data: RegisterInput
): Promise<{ error?: string; success?: boolean }> {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" }
  }

  const { email, password, username, displayName } = parsed.data

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ])

  if (existingEmail) return { error: "This email is already registered" }
  if (existingUsername) return { error: "This username is already taken" }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      username,
      displayName,
      shelves: {
        createMany: {
          data: [
            { name: "Reading now", isSystem: true },
            { name: "Want to read", isSystem: true },
            { name: "Read", isSystem: true },
          ],
        },
      },
    },
  })

  return { success: true }
}

export async function requestPasswordReset(
  data: ForgotPasswordInput
): Promise<{ error?: string; success?: boolean }> {
  const parsed = forgotPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Enter a valid email" }
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  // Always return success to prevent email enumeration
  if (!user) return { success: true }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  })

  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

  await resend.emails.send({
    from: "noreply@planster.app",
    to: email,
    subject: "Reset your Planster password",
    text: [
      "You requested a password reset for your Planster account.",
      "",
      "Click the link below to set a new password. This link is valid for 1 hour.",
      "",
      resetUrl,
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
  })

  return { success: true }
}

export async function resetPassword(
  data: ResetPasswordInput
): Promise<{ error?: string; success?: boolean }> {
  const parsed = resetPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" }
  }

  const { token, password } = parsed.data

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  })

  if (!resetToken) return { error: "Invalid or expired reset link" }
  if (resetToken.usedAt) return { error: "This reset link has already been used" }
  if (resetToken.expiresAt < new Date()) return { error: "This reset link has expired" }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  return { success: true }
}
