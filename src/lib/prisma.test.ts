import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaClientMock = vi.fn()

vi.mock("@prisma/client", () => ({
  PrismaClient: prismaClientMock,
}))

describe("prisma singleton", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unmock("@/lib/prisma")
    prismaClientMock.mockReset()
    delete process.env.DATABASE_URL
    delete (globalThis as { prisma?: unknown }).prisma
  })

  it("does not construct PrismaClient when DATABASE_URL is missing until it is used", async () => {
    const prismaModule = await import("@/lib/prisma")

    expect(prismaClientMock).not.toHaveBeenCalled()
    expect(() => (prismaModule.prisma as { user: unknown }).user).toThrow(
      "DATABASE_URL is required before using Prisma client.",
    )
  })

  it("adds pgbouncer=true when constructing PrismaClient", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/planster"
    const client = { marker: "client" }
    prismaClientMock.mockReturnValue(client)

    const prismaModule = await import("@/lib/prisma")

    expect(prismaClientMock).toHaveBeenCalledWith({
      datasources: {
        db: { url: "postgresql://localhost:5432/planster?pgbouncer=true" },
      },
    })
    expect(prismaModule.prisma).toBe(client)
  })
})
