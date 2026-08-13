"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Check, Download, Loader2, Share2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { QUOTE_BACKGROUNDS } from "@/lib/quote-backgrounds"
import { getFollowing, type FollowedUser } from "@/actions/follow"
import { sendMessage } from "@/actions/messages"

interface QuoteShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: string
  bookTitle: string
  chapterTitle: string
}

export function QuoteShareDialog({
  open,
  onOpenChange,
  quote,
  bookTitle,
  chapterTitle,
}: QuoteShareDialogProps) {
  const t = useTranslations("Share")
  const [backgroundId, setBackgroundId] = useState(QUOTE_BACKGROUNDS[0]!.id)
  const background = QUOTE_BACKGROUNDS.find((bg) => bg.id === backgroundId)!

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>

        <div
          className="relative w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center p-8 text-center"
          style={{ backgroundImage: `url(${background.url})`, backgroundSize: "cover" }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <p className="text-white italic font-serif text-lg leading-snug">&ldquo;{quote}&rdquo;</p>
            <p className="text-white/85 text-xs mt-3">
              {chapterTitle} · {bookTitle}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("chooseBackground")}</p>
          <div className="grid grid-cols-8 gap-2">
            {QUOTE_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => setBackgroundId(bg.id)}
                className={cn(
                  "relative aspect-square rounded-md overflow-hidden border-2",
                  bg.id === backgroundId ? "border-foreground" : "border-transparent"
                )}
                aria-label={bg.id}
              >
                <Image src={bg.url} alt="" fill className="object-cover" sizes="40px" />
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="inApp">
          <TabsList className="w-full">
            <TabsTrigger value="inApp" className="flex-1">
              {t("inAppTab")}
            </TabsTrigger>
            <TabsTrigger value="external" className="flex-1">
              {t("externalTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inApp" className="mt-3">
            <InAppShareTab
              quote={quote}
              bookTitle={bookTitle}
              chapterTitle={chapterTitle}
              backgroundId={backgroundId}
            />
          </TabsContent>

          <TabsContent value="external" className="mt-3">
            <ExternalShareTab
              quote={quote}
              bookTitle={bookTitle}
              chapterTitle={chapterTitle}
              backgroundId={backgroundId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function InAppShareTab({
  quote,
  bookTitle,
  chapterTitle,
  backgroundId,
}: {
  quote: string
  bookTitle: string
  chapterTitle: string
  backgroundId: string
}) {
  const t = useTranslations("Share")
  const [following, setFollowing] = useState<FollowedUser[] | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    getFollowing().then((result) => setFollowing(result.users ?? []))
  }, [])

  async function handleSend(user: FollowedUser) {
    const result = await sendMessage(user.id, {
      quoteCard: { quote, bookTitle, chapterTitle, backgroundId },
    })
    if (!result.error) setSentTo(user.id)
  }

  if (following === null) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (following.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{t("noFollowing")}</p>
  }

  return (
    <ul className="max-h-56 overflow-y-auto divide-y">
      {following.map((user) => (
        <li key={user.id} className="flex items-center gap-3 py-2">
          <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" sizes="32px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF8C6B] to-[#7C3F82] text-white text-xs font-bold">
                {user.displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-sm flex-1 min-w-0 truncate">{user.displayName}</span>
          <Button size="sm" variant={sentTo === user.id ? "outline" : "default"} onClick={() => handleSend(user)}>
            {sentTo === user.id ? <Check className="h-4 w-4" /> : t("send")}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function ExternalShareTab({
  quote,
  bookTitle,
  chapterTitle,
  backgroundId,
}: {
  quote: string
  bookTitle: string
  chapterTitle: string
  backgroundId: string
}) {
  const t = useTranslations("Share")
  const [generating, setGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/quote-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, bookTitle, chapterTitle, backgroundId }),
      })
      const data = await res.json()
      if (res.ok) setImageUrl(data.url)
    } finally {
      setGenerating(false)
    }
  }

  async function handleWebShare() {
    if (!imageUrl) return
    if (navigator.share) {
      try {
        await navigator.share({ title: bookTitle, url: imageUrl })
      } catch {
        // user cancelled the native share sheet — nothing to do
      }
    }
  }

  async function handleCopyLink() {
    if (!imageUrl) return
    await navigator.clipboard.writeText(imageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!imageUrl) {
    return (
      <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {generating ? t("generating") : t("generate")}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button onClick={handleWebShare} size="sm" className="gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          {t("shareButton")}
        </Button>
      )}
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={imageUrl} download target="_blank" rel="noopener noreferrer">
          <Download className="h-3.5 w-3.5" />
          {t("download")}
        </a>
      </Button>
      <Button onClick={handleCopyLink} variant="outline" size="sm">
        {copied ? t("linkCopied") : t("copyLink")}
      </Button>
    </div>
  )
}
