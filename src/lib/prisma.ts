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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: buildUrl(process.env.DATABASE_URL) },
    },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
