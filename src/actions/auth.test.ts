import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerUser, requestPasswordReset, resetPassword } from "./auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}))

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-id" }),
    },
  })),
}))

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>()
  return {
    ...actual,
    default: {
      ...actual,
      randomBytes: vi.fn().mockReturnValue({ toString: () => "mock_token_hex" }),
      createHash: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue("mock_token_hash"),
      }),
    },
  }
})

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  passwordResetToken: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("registerUser", () => {
  it("returns error when email is already registered", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ id: "existing-user" })
      .mockResolvedValueOnce(null)

    const result = await registerUser({
      email: "taken@example.com",
      password: "password123",
      username: "newuser",
      displayName: "New User",
    })

    expect(result.error).toBe("This email is already registered")
  })

  it("returns error when username is already taken", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing-user" })

    const result = await registerUser({
      email: "new@example.com",
      password: "password123",
      username: "takenuser",
      displayName: "New User",
    })

    expect(result.error).toBe("This username is already taken")
  })

  it("creates user with hashed password and system shelves on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: "new-user-id" })

    const result = await registerUser({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
      displayName: "New User",
    })

    expect(result.success).toBe(true)
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12)
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@example.com",
          username: "newuser",
          displayName: "New User",
          password: "hashed_password",
          shelves: {
            createMany: {
              data: [
                { name: "Reading now", isSystem: true },
                { name: "Want to read", isSystem: true },
                { name: "Read", isSystem: true },
              ],
            },
          },
        }),
      })
    )
  })

  it("rejects invalid email format", async () => {
    const result = await registerUser({
      email: "not-an-email",
      password: "password123",
      username: "newuser",
      displayName: "New User",
    })

    expect(result.error).toBeDefined()
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it("rejects password shorter than 8 characters", async () => {
    const result = await registerUser({
      email: "new@example.com",
      password: "short",
      username: "newuser",
      displayName: "New User",
    })

    expect(result.error).toContain("8 characters")
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it("rejects username with invalid characters", async () => {
    const result = await registerUser({
      email: "new@example.com",
      password: "password123",
      username: "user name!",
      displayName: "New User",
    })

    expect(result.error).toBeDefined()
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })
})

describe("requestPasswordReset", () => {
  it("returns success even when email does not exist (anti-enumeration)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const result = await requestPasswordReset({ email: "unknown@example.com" })

    expect(result.success).toBe(true)
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it("creates a hashed reset token and sends email when user exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-id" })
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.passwordResetToken.create.mockResolvedValue({ id: "token-id" })

    const result = await requestPasswordReset({ email: "user@example.com" })

    expect(result.success).toBe(true)
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-id",
          tokenHash: "mock_token_hash",
        }),
      })
    )
  })

  it("returns error for invalid email format", async () => {
    const result = await requestPasswordReset({ email: "not-an-email" })
    expect(result.error).toBeDefined()
  })
})

describe("resetPassword", () => {
  it("returns error when token is not found", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null)

    const result = await resetPassword({ token: "bad_token", password: "newpassword123" })

    expect(result.error).toBe("Invalid or expired reset link")
  })

  it("returns error when token has already been used", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
    })

    const result = await resetPassword({ token: "used_token", password: "newpassword123" })

    expect(result.error).toBe("This reset link has already been used")
  })

  it("returns error when token is expired", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    })

    const result = await resetPassword({ token: "expired_token", password: "newpassword123" })

    expect(result.error).toBe("This reset link has expired")
  })

  it("updates password and marks token as used on success", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
    })
    mockPrisma.$transaction.mockResolvedValue([{}, {}])

    const result = await resetPassword({ token: "valid_token", password: "newpassword123" })

    expect(result.success).toBe(true)
    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 12)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it("rejects new password shorter than 8 characters", async () => {
    const result = await resetPassword({ token: "valid_token", password: "short" })
    expect(result.error).toContain("8 characters")
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})
