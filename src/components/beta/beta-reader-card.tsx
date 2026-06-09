"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { approveBeta, rejectBeta, revokeBeta } from "@/actions/beta"

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(date).toLocaleDateString()
}

type Props = {
  betaReaderId: string
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
  motivationMessage: string
  createdAt: Date
  status: "PENDING" | "APPROVED" | "REJECTED"
  onActionComplete: () => void
}

export function BetaReaderCard({
  betaReaderId,
  user,
  motivationMessage,
  createdAt,
  status,
  onActionComplete,
}: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | "revoke" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(action: "approve" | "reject" | "revoke") {
    setLoading(action)
    setError(null)
    try {
      const fn = action === "approve" ? approveBeta : action === "reject" ? rejectBeta : revokeBeta
      const result = await fn(betaReaderId)
      if (result.error) {
        setError(result.error)
      } else {
        onActionComplete()
      }
    } finally {
      setLoading(null)
    }
  }

  const isDirectInvite = motivationMessage === "Invited by the author"

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg" data-testid="beta-reader-card">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback>{user.displayName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{user.displayName}</span>
            <span className="text-xs text-muted-foreground">@{user.username}</span>
            {isDirectInvite && (
              <Badge variant="outline" className="text-xs">
                Direct invite
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground shrink-0">
              {timeAgo(createdAt)}
            </span>
          </div>
          {!isDirectInvite && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{motivationMessage}</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0 ml-2">
          {status === "PENDING" && (
            <>
              <Button
                size="sm"
                onClick={() => handleAction("approve")}
                disabled={loading !== null}
                data-testid="approve-btn"
              >
                {loading === "approve" ? "…" : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("reject")}
                disabled={loading !== null}
                data-testid="reject-btn"
              >
                {loading === "reject" ? "…" : "Reject"}
              </Button>
            </>
          )}
          {status === "APPROVED" && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => handleAction("revoke")}
              disabled={loading !== null}
              data-testid="revoke-btn"
            >
              {loading === "revoke" ? "…" : "Revoke"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
