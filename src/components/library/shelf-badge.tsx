import { cn } from "@/lib/utils"

interface ShelfBadgeProps {
  name: string
  isSystem?: boolean
}

export function ShelfBadge({ name, isSystem }: ShelfBadgeProps) {
  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded-full border",
        isSystem
          ? "bg-violet-50 text-violet-700 border-violet-200"
          : "bg-muted text-muted-foreground border-muted"
      )}
    >
      {name}
    </span>
  )
}
