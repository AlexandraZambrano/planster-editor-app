import { getTranslations } from "next-intl/server"
import { Library, PenLine, UserPlus } from "lucide-react"

const STEPS = [
  { n: 1, icon: UserPlus },
  { n: 2, icon: Library },
  { n: 3, icon: PenLine },
] as const

export async function HowItWorks() {
  const t = await getTranslations("Landing")

  return (
    <section className="bg-secondary/60 border-y">
      <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-semibold text-center mb-12">{t("howItWorksTitle")}</h2>

        <ol className="grid sm:grid-cols-3 gap-5">
          {STEPS.map(({ n, icon: Icon }) => (
            <li key={n} className="bg-card rounded-3xl border p-6 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-display text-3xl font-semibold text-primary" aria-hidden>
                  {n}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`step${n}`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
