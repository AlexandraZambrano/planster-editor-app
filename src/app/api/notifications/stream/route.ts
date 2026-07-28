import { auth } from "@/lib/auth"
import { notificationEmitter, type EmittedNotification } from "@/lib/notification-events"

export const dynamic = "force-dynamic"

const KEEP_ALIVE_MS = 25_000

export async function GET() {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const userId = session.user.id
  const encoder = new TextEncoder()

  let keepAlive: ReturnType<typeof setInterval>
  let listener: (notification: EmittedNotification) => void

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"))

      listener = (notification) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`))
      }
      notificationEmitter.on(`notification:${userId}`, listener)

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"))
      }, KEEP_ALIVE_MS)
    },
    cancel() {
      clearInterval(keepAlive)
      notificationEmitter.off(`notification:${userId}`, listener)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
