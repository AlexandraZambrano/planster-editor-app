import Link from "next/link"
import { cn } from "@/lib/utils"

interface ExploreTabsProps {
  active: "books" | "people"
  booksLabel: string
  peopleLabel: string
}

export function ExploreTabs({ active, booksLabel, peopleLabel }: ExploreTabsProps) {
  const tabs = [
    { id: "books" as const, href: "/explore", label: booksLabel },
    { id: "people" as const, href: "/explore/people", label: peopleLabel },
  ]

  return (
    <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1 mb-6">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            active === tab.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
