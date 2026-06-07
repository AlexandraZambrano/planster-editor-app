import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    template: "%s — Planster",
    default: "Planster",
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm bg-background rounded-xl border shadow-sm p-8">
        {children}
      </div>
    </div>
  )
}
