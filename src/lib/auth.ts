import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export type Session = {
  user: {
    id: string
    email: string
    username: string
    avatarUrl: string | null
    avatarPositionY: number
  }
}

export async function auth(): Promise<Session | null> {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      avatarPositionY: true,
    },
  })

  if (!user) return null

  return { user }
}
