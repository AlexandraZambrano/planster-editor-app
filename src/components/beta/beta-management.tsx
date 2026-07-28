"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, Users, UserCheck, UserX } from "lucide-react"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BetaReaderCard } from "./beta-reader-card"
import { InviteBetaDialog } from "./invite-beta-dialog"
import { getBetaReaders, type BetaReaderEntry } from "@/actions/beta"

type TabId = "pending" | "approved" | "rejected"

type State = { pending: BetaReaderEntry[]; approved: BetaReaderEntry[]; rejected: BetaReaderEntry[] }

const EMPTY: State = { pending: [], approved: [], rejected: [] }

const ICONS: Record<TabId, React.ReactNode> = {
  pending: <Users className="h-3.5 w-3.5" />,
  approved: <UserCheck className="h-3.5 w-3.5" />,
  rejected: <UserX className="h-3.5 w-3.5" />,
}

export function BetaManagement({ bookId }: { bookId: string }) {
  const t = useTranslations("Beta")
  const [data, setData] = useState<State>(EMPTY)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getBetaReaders(bookId)
    if (!result.error) {
      setData({
        pending: result.pending ?? [],
        approved: result.approved ?? [],
        rejected: result.rejected ?? [],
      })
    }
    setLoading(false)
  }, [bookId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const tabs: TabId[] = ["pending", "approved", "rejected"]
  const tabLabels: Record<TabId, string> = {
    pending: t("pending"),
    approved: t("approved"),
    rejected: t("rejected"),
  }
  const emptyMessages: Record<TabId, string> = {
    pending: t("noPendingRequests"),
    approved: t("noApprovedBetaReaders"),
    rejected: t("noRejectedRequests"),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          {t("betaReaders")}
        </p>
        <InviteBetaDialog bookId={bookId} onSuccess={load} />
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="gap-1.5">
              {ICONS[tab]}
              {tabLabels[tab]} ({data[tab].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {data[tab].length === 0 ? (
              <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                <p className="text-sm">{emptyMessages[tab]}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data[tab].map((reader) => (
                  <BetaReaderCard
                    key={reader.id}
                    betaReaderId={reader.id}
                    user={reader.user}
                    motivationMessage={reader.motivationMessage}
                    createdAt={reader.createdAt}
                    status={reader.status}
                    onActionComplete={load}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
