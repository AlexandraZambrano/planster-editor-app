import { getTranslations } from "next-intl/server"
import { getContinueReading, getReadingStreak } from "@/actions/reading"
import { ContinueReadingCard } from "./continue-reading-card"

interface AuthenticatedHomeProps {
  displayName: string
}

export async function AuthenticatedHome({ displayName }: AuthenticatedHomeProps) {
  const [{ entries = [] }, { data: streak }, t] = await Promise.all([
    getContinueReading(),
    getReadingStreak(),
    getTranslations("Home"),
  ])

  return (
    <section className="bg-muted">
      <div className="container mx-auto max-w-5xl px-4 py-14">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-8">
          {t("welcome", { displayName })}
        </h1>

        {entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map((entry) => (
              <ContinueReadingCard
                key={entry.bookId}
                entry={entry}
                streak={streak ?? { streak: 0, weekDays: [] }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noContinueReading")}</p>
        )}
      </div>
    </section>
  )
}
