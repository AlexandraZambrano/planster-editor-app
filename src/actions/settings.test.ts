import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getSettings,
  updateProfile,
  updatePrivacySettings,
  changePassword,
} from "./settings"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const mockSignInWithPassword = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  })),
}))

const mockUpdateUserById = vi.fn()
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  })),
}))

const mockPrisma = prisma as unknown as {
  user: Record<string, ReturnType<typeof vi.fn>>
}

const SESSION = { user: { id: "user-1", email: "a@test.com", username: "user1", avatarUrl: null } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe("getSettings", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await getSettings()
    expect(result.error).toBe("Unauthorized")
  })

  it("returns the current user's settings", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      displayName: "User One",
      username: "user1",
      bio: "Hello",
      avatarUrl: null,
      showLibraryCount: true,
      showRatingsAndReviews: false,
    })
    const result = await getSettings()
    expect(result.settings?.username).toBe("user1")
  })
})

describe("updateProfile", () => {
  const VALID = { displayName: "New Name", username: "newname", bio: "Bio text", avatarUrl: "" }

  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await updateProfile(VALID)
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error for invalid username characters", async () => {
    const result = await updateProfile({ ...VALID, username: "bad name!" })
    expect(result.error).toContain("letters, numbers")
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it("returns error for bio over 300 characters", async () => {
    const result = await updateProfile({ ...VALID, bio: "a".repeat(301) })
    expect(result.error).toContain("300")
  })

  it("returns error when the username is already taken by someone else", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "other-user" })
    const result = await updateProfile(VALID)
    expect(result.error).toBe("This username is already taken")
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it("allows keeping your own current username", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" })
    const result = await updateProfile(VALID)
    expect(result.success).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        displayName: "New Name",
        username: "newname",
        bio: "Bio text",
        avatarUrl: null,
        avatarPositionY: 50,
      },
    })
  })

  it("stores a custom avatar position when provided", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" })
    const result = await updateProfile({ ...VALID, avatarPositionY: 20 })
    expect(result.success).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ avatarPositionY: 20 }) })
    )
  })

  it("updates successfully when the username is free", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await updateProfile(VALID)
    expect(result.success).toBe(true)
  })
})

describe("updatePrivacySettings", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await updatePrivacySettings({ showLibraryCount: true, showRatingsAndReviews: false })
    expect(result.error).toBe("Unauthorized")
  })

  it("updates the toggles", async () => {
    const result = await updatePrivacySettings({ showLibraryCount: true, showRatingsAndReviews: true })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { showLibraryCount: true, showRatingsAndReviews: true },
    })
    expect(result.success).toBe(true)
  })
})

describe("changePassword", () => {
  const VALID = { currentPassword: "oldpassword", newPassword: "newpassword123" }

  it("returns error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const result = await changePassword(VALID)
    expect(result.error).toBe("Unauthorized")
  })

  it("returns error for a new password under 8 characters", async () => {
    const result = await changePassword({ ...VALID, newPassword: "short" })
    expect(result.error).toContain("8 characters")
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it("returns error when there is no linked Supabase user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ authUserId: null })
    const result = await changePassword(VALID)
    expect(result.error).toBe("Not found")
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it("returns error when the current password is incorrect", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ authUserId: "auth-user-id" })
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } })

    const result = await changePassword(VALID)
    expect(result.error).toBe("Current password is incorrect")
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it("updates the Supabase password when the current one is correct", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ authUserId: "auth-user-id" })
    mockSignInWithPassword.mockResolvedValue({ error: null })
    mockUpdateUserById.mockResolvedValue({ error: null })

    const result = await changePassword(VALID)
    expect(result.success).toBe(true)
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "a@test.com",
      password: "oldpassword",
    })
    expect(mockUpdateUserById).toHaveBeenCalledWith("auth-user-id", {
      password: "newpassword123",
    })
  })
})
