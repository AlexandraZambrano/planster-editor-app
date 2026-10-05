import Link from "next/link"
import { Feather } from "lucide-react"

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 rounded-full shrink-0" aria-label="Planster">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Feather className="h-4 w-4" aria-hidden />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-foreground" aria-hidden>
        Planster
      </span>
    </Link>
  )
}
