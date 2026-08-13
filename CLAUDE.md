# Planster — Project Memory

Planster is a web platform for writers and beta readers. The name comes from **Plotter** + **Pantser**: it serves both writers who plan their stories and those who write without a plan. It is the most complete environment on the market for writers in progress, with the most advanced beta feedback system available.

## Specification documents

Read these files BEFORE writing any code. They are the source of truth for the project.

- Architecture & stack → @.claude/specs/architecture.md
- Data model (Prisma schema) → @.claude/specs/data-model.md
- Modules & features → @.claude/specs/modules/
  - Authentication → @.claude/specs/modules/auth.md
  - Books & chapters → @.claude/specs/modules/books.md
  - Text editor → @.claude/specs/modules/editor.md
  - Writer's Studio → @.claude/specs/modules/writers-studio.md
  - Writing Goals → @.claude/specs/modules/writing-goals.md
  - Beta system → @.claude/specs/modules/beta-system.md
  - Library & shelves → @.claude/specs/modules/library.md
  - Discovery → @.claude/specs/modules/discovery.md
  - Notifications → @.claude/specs/modules/notifications.md
  - Public profile → @.claude/specs/modules/profile.md
  - Social (follow, public chapter comments/ratings) → @.claude/specs/modules/social.md
  - Direct messages & quote sharing → @.claude/specs/modules/messages.md
- App routes → @.claude/specs/routes.md
- Out of scope → @.claude/specs/out-of-scope.md
- CI/CD, Docker & deploy → @.claude/specs/cicd.md

## Tech stack (quick reference)

- **Framework:** Next.js 15, App Router, TypeScript
- **Styles:** Tailwind CSS + shadcn/ui
- **Editor:** Tiptap (already in the repo)
- **Interactive board:** React Flow
- **Charts:** Recharts (already in the repo)
- **Auth:** Supabase Auth (Email + Password, and Google OAuth)
- **DB:** Supabase (PostgreSQL) + Prisma ORM
- **Storage:** Cloudinary (images: covers, characters, world building, board)
- **Email:** Resend (password reset)
- **Notifications:** Server-Sent Events (SSE)
- **Chat messages:** a second, separate SSE channel from notifications (`src/lib/message-events.ts`
  + `/api/messages/stream`) — kept independent so chat volume never floods the notification bell
- **Image generation:** `sharp` (real `dependencies` entry) generates quote-share PNGs
  (`src/lib/quote-card.ts`) and the PWA icons (`scripts/generate-icons.mjs`)
- **PWA:** installable on mobile/desktop — `src/app/manifest.ts` (native Next.js manifest route), `public/sw.js` (minimal network-first service worker for page navigations only; never intercepts API/auth/SSE requests), registered from `src/components/shared/service-worker-registration.tsx`. Icons regenerate via `node scripts/generate-icons.mjs` (uses `sharp`) from the SVGs in `scripts/`.
- **Base repo:** github.com/AlexandraZambrano/planster-editor-app

## Code conventions

- All components in `src/components/`, organized by feature (`/editor`, `/studio`, `/library`, etc.)
- Pages live in `src/app/` following the route structure defined in @.claude/specs/routes.md
- Server Actions in `src/actions/[feature].ts`
- Prisma types are imported from `@prisma/client`, never redefined manually
- Use `cn()` from `src/lib/utils.ts` for conditional Tailwind classes
- Base UI components from `src/components/ui/` (shadcn/ui — already in repo)
- No client component (`'use client'`) should fetch directly from the DB; use Server Actions or API routes
- All user-uploaded images go through Cloudinary; never save to the local filesystem

## Testing

- All new code must include tests. The project's target coverage threshold is **80%** across all metrics (statements, branches, functions, lines)
- **Current state (2026-07-28):** the enforced gate in `vitest.config.ts` is temporarily lower than 80% — a batch of components (discovery, library, notifications, settings, most of Writer's Studio) landed without tests, and actual coverage is ~10% lines/statements, ~56% functions, ~74% branches. New code should still be tested per the rule above; the gap should be closed incrementally and the thresholds raised back to 80% as it does — see the comment in `vitest.config.ts`
- Testing stack:
  - **Vitest** for unit tests and Server Action tests
  - **React Testing Library** for component tests
  - **Playwright** for end-to-end tests (critical flows: auth, create book, beta flow, library)
- Test files live next to the code they test: `component.tsx` → `component.test.tsx`
- **E2E tests are not yet implemented** — there is no `playwright.config.ts` or `e2e/*.spec.ts` in
  this repo despite the `test:e2e` script, and no e2e job runs in CI (see `.claude/specs/cicd.md`).
  The intended flows below are the plan for whenever that work happens, not current coverage.
- Run coverage with: `npx vitest run --coverage`
- No module is considered complete if coverage drops below the project's target (see current gate note above)
- Flows that **should** eventually have e2e tests: register/login, create book and chapter, beta request and approval, inline comment, save book to library

## General rules

- Do not implement anything listed in @.claude/specs/out-of-scope.md
- When adding a Prisma model, run `npx prisma db push` and update @.claude/specs/data-model.md — this project has no `prisma/migrations` directory and has never used `prisma migrate`; schema changes are applied directly with `db push`
- Every new route must be added to @.claude/specs/routes.md
- Beta reader comments on chapters (`InlineComment`/`ChapterReview`) are ALWAYS private —
  only the author can see them. This is separate from the public `ChapterComment`/
  `ChapterRating` system (see @.claude/specs/modules/social.md) — do not conflate the two
- The entire Writer's Studio (plotting, timeline, characters, world building, board, notes) is ALWAYS private — only the author can see it
- Before creating a new component, check if it already exists in `src/components/ui/`