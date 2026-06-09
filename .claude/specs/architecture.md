# Architecture — Planster

## Folder structure

```
planster-editor-app/
├── CLAUDE.md                          ← Claude Code main memory file
├── .claude/
│   ├── specs/                         ← project source of truth
│   │   ├── architecture.md            ← this file
│   │   ├── data-model.md
│   │   ├── routes.md
│   │   ├── out-of-scope.md
│   │   ├── cicd.md
│   │   └── modules/
│   │       ├── auth.md
│   │       ├── books.md
│   │       ├── editor.md
│   │       ├── writers-studio.md
│   │       ├── writing-goals.md
│   │       ├── beta-system.md
│   │       ├── library.md
│   │       ├── discovery.md
│   │       ├── notifications.md
│   │       └── profile.md
│   └── commands/
│       ├── new-feature.md
│       └── new-module.md
├── Dockerfile
├── .dockerignore
├── vitest.config.ts
├── playwright.config.ts
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── app/                           ← Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (public)/
│   │   │   ├── page.tsx               ← Home
│   │   │   ├── explore/
│   │   │   └── books/[bookId]/
│   │   ├── @[username]/               ← public profile
│   │   ├── (app)/                     ← authenticated routes
│   │   │   ├── library/
│   │   │   ├── write/
│   │   │   ├── read/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui (already exists, do not modify)
│   │   ├── editor/                    ← Tiptap editor components
│   │   ├── studio/                    ← Writer's Studio
│   │   │   ├── plotting/
│   │   │   ├── timeline/
│   │   │   ├── characters/
│   │   │   ├── worldbuilding/
│   │   │   ├── board/
│   │   │   └── notes/
│   │   ├── beta/                      ← beta reader system
│   │   ├── library/                   ← library & shelves
│   │   ├── goals/                     ← writing goals & charts
│   │   ├── book/                      ← book components
│   │   └── shared/                    ← global reusable components
│   ├── actions/                       ← Next.js Server Actions
│   │   ├── auth.ts
│   │   ├── books.ts
│   │   ├── chapters.ts
│   │   ├── studio.ts
│   │   ├── beta.ts
│   │   ├── library.ts
│   │   ├── goals.ts
│   │   └── notifications.ts
│   ├── lib/
│   │   ├── utils.ts                   ← cn() helper (already exists)
│   │   ├── prisma.ts                  ← Prisma singleton client
│   │   ├── auth.ts                    ← NextAuth config
│   │   ├── cloudinary.ts              ← image upload helpers
│   │   └── notifications.ts           ← SSE helpers
│   ├── hooks/                         ← use-toast, use-mobile (already exist)
│   └── types/
│       └── index.ts                   ← global project types
└── e2e/                               ← Playwright e2e tests
    ├── auth.spec.ts
    ├── books.spec.ts
    ├── beta.spec.ts
    ├── library.spec.ts
    └── editor.spec.ts
```

## Architecture patterns

### Data fetching
- **Pages** (`page.tsx`) are Server Components by default and fetch directly via Prisma
- **Interactive components** use Server Actions (`'use server'`) for mutations
- Never fetch from the DB inside client components (`'use client'`)
- Use React `cache()` to deduplicate queries within the same render

### Authentication
- NextAuth.js with JWT session strategy
- The `session.user` object includes: `id`, `email`, `username`, `avatarUrl`
- Protect authenticated routes with middleware in `src/middleware.ts`
- All routes under `(app)/` require an active session

### Images
- All user-uploaded images (covers, character photos, world building, board) are uploaded to Cloudinary
- The helper `src/lib/cloudinary.ts` exposes `uploadImage(file, folder)` and returns the public URL
- Never save images to `public/` or the server filesystem

### Real-time notifications
- Use Server-Sent Events (SSE) via an API route at `src/app/api/notifications/stream/route.ts`
- The client subscribes to the stream when the notification bell component mounts
- Fallback: polling every 30s if SSE is unavailable

### Interactive board (React Flow)
- The Board uses React Flow for the drag-and-drop canvas
- Character and location nodes are initialised from the DB with their saved positions
- Connections between characters are generated automatically from `CharacterLink`
- Node positions are persisted in `BoardElement.posX` and `posY`

## Required environment variables

```env
# Supabase — copy from Project Settings > Database > Connection string
DATABASE_URL=        # Transaction mode pooler (port 6543) — used at runtime
DIRECT_URL=          # Direct connection (port 5432) — used for Prisma migrations

NEXTAUTH_SECRET=
NEXTAUTH_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

> **Supabase + Prisma note:** Supabase uses a connection pooler (port 6543) for runtime queries and a direct connection (port 5432) for migrations. In `prisma/schema.prisma` use `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`. The `DATABASE_URL` points to the pooler (Transaction mode), `DIRECT_URL` to the direct connection.