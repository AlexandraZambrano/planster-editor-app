"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { inviteBeta } from "@/actions/beta"

type Props = { bookId: string; onSuccess: () => void }

export function InviteBetaDialog({ bookId, onSuccess }: Props) {
  const t = useTranslations("Beta")
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await inviteBeta(bookId, value)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setValue("")
      onSuccess()
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1200)
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setValue("")
      setError(null)
      setSuccess(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="invite-btn">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          {t("inviteReader")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inviteBetaReader")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-input">{t("usernameOrEmail")}</Label>
            <Input
              id="invite-input"
              placeholder={t("inviteInputPlaceholder")}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              data-testid="invite-input"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="py-2 border-green-200 bg-green-50">
              <AlertDescription className="text-xs text-green-700">
                {t("inviteSuccess")}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={loading || !value.trim()}>
              {loading ? t("inviting") : t("sendInvite")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
