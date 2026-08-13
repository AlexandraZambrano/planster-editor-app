"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { requestBeta } from "@/actions/beta"
import type { BetaStatus } from "@prisma/client"

interface BetaApplySectionProps {
  bookId: string
  initialStatus: BetaStatus | null
}

export function BetaApplySection({ bookId, initialStatus }: BetaApplySectionProps) {
  const t = useTranslations("Book")
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (status) {
    return <Badge variant="outline">{t(`betaStatus.${status}` as "betaStatus.PENDING")}</Badge>
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setMessage("")
      setError(null)
    }
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
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" data-testid="apply-beta-button">
          {t("applyBeta")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("applyBeta")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <Textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setError(null)
            }}
            placeholder={t("motivationPlaceholder")}
            maxLength={500}
            rows={4}
            autoFocus
            data-testid="beta-motivation-input"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending} data-testid="submit-beta-request">
              {isPending ? t("sendingRequest") : t("sendRequest")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
