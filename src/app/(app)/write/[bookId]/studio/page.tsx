import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Users, MapPin, GitBranch, Clock, LayoutDashboard, StickyNote } from "lucide-react"

interface Props {
  params: Promise<{ bookId: string }>
}

export default async function StudioHubPage({ params }: Props) {
  const { bookId } = await params
  const session = await auth()
  if (!session) redirect("/auth/login")

  const book = await prisma.book.findFirst({
    where: { id: bookId, authorId: session.user.id },
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          characters: true,
          locations: true,
          timelineEntries: true,
          bookNotes: true,
        },
      },
    },
  })

  if (!book) notFound()

  const modules = [
    {
      href: `/write/${bookId}/studio/characters`,
      icon: Users,
      label: "Characters",
      description: "Appearance, backstory and relationships",
      count: book._count.characters,
      countLabel: "character",
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      href: `/write/${bookId}/studio/worldbuilding`,
      icon: MapPin,
      label: "World Building",
      description: "Locations and their stories",
      count: book._count.locations,
      countLabel: "location",
      color: "bg-green-50 text-green-600 border-green-100",
    },
    {
      href: `/write/${bookId}/studio/plotting`,
      icon: GitBranch,
      label: "Plotting",
      description: "Scenes and chapter plans",
      count: null,
      countLabel: null,
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      href: `/write/${bookId}/studio/timeline`,
      icon: Clock,
      label: "Timeline",
      description: "Story events in chronological order",
      count: book._count.timelineEntries,
      countLabel: "event",
      color: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      href: `/write/${bookId}/studio/board`,
      icon: LayoutDashboard,
      label: "Board",
      description: "Interactive canvas for characters and locations",
      count: null,
      countLabel: null,
      color: "bg-rose-50 text-rose-600 border-rose-100",
    },
    {
      href: `/write/${bookId}/studio/notes`,
      icon: StickyNote,
      label: "Free Notes",
      description: "Random notes, ideas and reminders",
      count: book._count.bookNotes,
      countLabel: "note",
      color: "bg-teal-50 text-teal-600 border-teal-100",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/write/${bookId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {book.title}
        </Link>
        <h1 className="text-2xl font-bold mt-1">Writer's Studio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your private creative workspace — only you can see this.
        </p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.href} href={m.href}>
              <div className="group h-full p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:border-muted-foreground/30 transition-all space-y-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${m.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {m.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {m.description}
                  </p>
                </div>
                {m.count !== null && (
                  <p className="text-xs text-muted-foreground">
                    {m.count} {m.countLabel}{m.count !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
