"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { updatePrivacySettings, type SettingsData } from "@/actions/settings"

interface PrivacyTogglesProps {
  initial: Pick<SettingsData, "showLibraryCount" | "showRatingsAndReviews">
}

export function PrivacyToggles({ initial }: PrivacyTogglesProps) {
  const t = useTranslations("Settings")
  const [showLibraryCount, setShowLibraryCount] = useState(initial.showLibraryCount)
  const [showRatingsAndReviews, setShowRatingsAndReviews] = useState(initial.showRatingsAndReviews)
  const [, startTransition] = useTransition()

  function persist(next: { showLibraryCount: boolean; showRatingsAndReviews: boolean }) {
    startTransition(async () => {
      await updatePrivacySettings(next)
    })
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="show-library-count">{t("showLibraryCount")}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("showLibraryCountHint")}
          </p>
        </div>
        <Switch
          id="show-library-count"
          checked={showLibraryCount}
          onCheckedChange={(checked) => {
            setShowLibraryCount(checked)
            persist({ showLibraryCount: checked, showRatingsAndReviews })
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="show-ratings">{t("showRatings")}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("showRatingsHint")}
          </p>
        </div>
        <Switch
          id="show-ratings"
          checked={showRatingsAndReviews}
          onCheckedChange={(checked) => {
            setShowRatingsAndReviews(checked)
            persist({ showLibraryCount, showRatingsAndReviews: checked })
          }}
        />
      </div>
    </div>
  )
}
