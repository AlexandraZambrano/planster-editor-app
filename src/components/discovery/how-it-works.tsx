import { getTranslations } from "next-intl/server"

export async function HowItWorks() {
  const t = await getTranslations("Landing")
  const steps = [1, 2, 3] as const

  return (
    <section className="bg-secondary">
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-10">
          {t("howItWorksTitle")}
        </h2>

        <div className="grid sm:grid-cols-3 gap-5">
          {steps.map((number) => (
            <div
              key={number}
              className="relative bg-white rounded-2xl p-6 pt-8 text-sm text-foreground shadow-sm"
            >
              <span className="absolute -top-3 -left-1 text-3xl font-black text-primary">
                {number}.
              </span>
              {t(`step${number}`)}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
