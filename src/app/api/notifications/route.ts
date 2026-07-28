import { NextResponse } from "next/server"
import { getNotifications } from "@/actions/notifications"

export async function GET() {
  const result = await getNotifications()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 401 })
  return NextResponse.json({ notifications: result.notifications, unreadCount: result.unreadCount })
}
