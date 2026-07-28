import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerUser, getEmailForIdentifier, requestPasswordReset, resetPassword } from "./auth"
import { prisma } from "@/lib/prisma"

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

const mockCreateUser = vi.fn()
const mockUpdateUserById = vi.fn()
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        updateUserById: mockUpdateUserById,
      },
    },
  })),
}))

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  passwordResetToken: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
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
    expect(mockCreateUser).not.toHaveBeenCalled()
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
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it("returns a generic error when Supabase already has this email (e.g. an orphaned prior attempt)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: { message: "already registered" } })

    const result = await registerUser({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
      displayName: "New User",
    })

    expect(result.error).toBe("This email is already registered")
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it("creates the Supabase auth user and the Prisma profile with system shelves on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockCreateUser.mockResolvedValue({ data: { user: { id: "auth-user-id" } }, error: null })
    mockPrisma.user.create.mockResolvedValue({ id: "new-user-id" })

    const result = await registerUser({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
      displayName: "New User",
    })

    expect(result.success).toBe(true)
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      email_confirm: true,
    })
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authUserId: "auth-user-id",
          email: "new@example.com",
          username: "newuser",
          displayName: "New User",
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
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it("rejects password shorter than 8 characters", async () => {
    const result = await registerUser({
      email: "new@example.com",
      password: "short",
      username: "newuser",
      displayName: "New User",
    })

    expect(result.error).toContain("8 characters")
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it("rejects username with invalid characters", async () => {
    const result = await registerUser({
      email: "new@example.com",
      password: "password123",
      username: "user name!",
      displayName: "New User",
    })

    expect(result.error).toBeDefined()
    expect(mockCreateUser).not.toHaveBeenCalled()
  })
})

describe("getEmailForIdentifier", () => {
  it("returns the identifier unchanged when it already looks like an email", async () => {
    const result = await getEmailForIdentifier("user@example.com")
    expect(result.email).toBe("user@example.com")
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it("resolves a username to its email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: "resolved@example.com" })
    const result = await getEmailForIdentifier("someusername")
    expect(result.email).toBe("resolved@example.com")
  })

  it("returns a generic error when the username does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await getEmailForIdentifier("unknownuser")
    expect(result.error).toBe("Invalid username/email or password")
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
      user: { authUserId: "auth-user-id" },
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
      user: { authUserId: "auth-user-id" },
    })

    const result = await resetPassword({ token: "expired_token", password: "newpassword123" })

    expect(result.error).toBe("This reset link has expired")
  })

  it("returns error when the account has no linked Supabase user", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      user: { authUserId: null },
    })

    const result = await resetPassword({ token: "valid_token", password: "newpassword123" })

    expect(result.error).toBe("This account can no longer be accessed. Please contact support.")
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it("updates the Supabase password and marks the token as used on success", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-id",
      userId: "user-id",
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      user: { authUserId: "auth-user-id" },
    })
    mockUpdateUserById.mockResolvedValue({ error: null })
    mockPrisma.passwordResetToken.update.mockResolvedValue({})

    const result = await resetPassword({ token: "valid_token", password: "newpassword123" })

    expect(result.success).toBe(true)
    expect(mockUpdateUserById).toHaveBeenCalledWith("auth-user-id", { password: "newpassword123" })
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: "token-id" },
      data: { usedAt: expect.any(Date) },
    })
  })

  it("rejects new password shorter than 8 characters", async () => {
    const result = await resetPassword({ token: "valid_token", password: "short" })
    expect(result.error).toContain("8 characters")
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })
})
