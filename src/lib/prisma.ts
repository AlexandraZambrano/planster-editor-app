import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildUrl(base: string | undefined): string | undefined {
  if (!base) return undefined
  // PgBouncer in transaction mode does not support prepared statements.
  // Adding ?pgbouncer=true tells Prisma to disable them at the driver level.
  if (base.includes("pgbouncer=true")) return base
  return base + (base.includes("?") ? "&" : "?") + "pgbouncer=true"
}

function createMissingDatabaseUrlProxy(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get() {
      throw new Error("DATABASE_URL is required before using Prisma client.")
    },
  })
}

const prismaUrl = buildUrl(process.env.DATABASE_URL)

export const prisma =
  globalForPrisma.prisma ??
  (prismaUrl
    ? new PrismaClient({
        datasources: {
          db: { url: prismaUrl },
        },
      })
    : createMissingDatabaseUrlProxy())

if (process.env.NODE_ENV !== "production" && prismaUrl) globalForPrisma.prisma = prisma
