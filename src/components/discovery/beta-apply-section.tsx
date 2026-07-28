"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { requestBeta } from "@/actions/beta"
import type { BetaStatus } from "@prisma/client"

interface BetaApplySectionProps {
  bookId: string
  initialStatus: BetaStatus | null
}

export function BetaApplySection({ bookId, initialStatus }: BetaApplySectionProps) {
  const t = useTranslations("Book")
  const [status, setStatus] = useState(initialStatus)
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (status) {
    return <Badge variant="outline">{t(`betaStatus.${status}` as "betaStatus.PENDING")}</Badge>
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)} data-testid="apply-beta-button">
        {t("applyBeta")}
      </Button>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      setError(t("motivationRequired"))
      return
    }

    startTransition(async () => {
      const result = await requestBeta(bookId, trimmed)
      if (result.error) {
        setError(result.error)
        return
      }
      setStatus("PENDING")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-w-md">
      <Textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value)
          setError(null)
        }}
        placeholder={t("motivationPlaceholder")}
        maxLength={500}
        rows={3}
        data-testid="beta-motivation-input"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending} data-testid="submit-beta-request">
          {isPending ? t("sendingRequest") : t("sendRequest")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  )
}
