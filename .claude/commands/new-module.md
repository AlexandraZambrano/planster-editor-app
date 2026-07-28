# Command: Build a new module from scratch

Use this flow when building a complete module for the first time.

## Recommended implementation order

1. Prisma schema → migration
2. Server Actions (basic CRUD)
3. UI components
4. Pages (Server Components)
5. Interactivity (Client Components)
6. Notifications if applicable
7. Tests (unit + component + e2e if it's a critical flow)

## Module priority order for Planster development

1. Auth (register, login, password reset)
2. Books (create, edit, chapters)
3. Text editor (full Tiptap)
4. Beta system (requests, inline comments, reviews)
5. Writer's Studio — Characters
6. Writer's Studio — World Building
7. Writer's Studio — Plotting
8. Writer's Studio — Timeline
9. Writer's Studio — Board (React Flow)
10. Writer's Studio — Notes
11. Writing Goals (goals + charts)
12. Library & shelves
13. Discovery (home, explore, book page)
14. Notifications (SSE)
15. Public profile
16. Settings