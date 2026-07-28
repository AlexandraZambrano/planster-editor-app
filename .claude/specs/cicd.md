# CI/CD — Planster

## Pipeline overview

```
Push to PR / develop
    └── CI: lint → type-check → tests (≥80% coverage) → e2e

Push to main (merge)
    └── CI: lint → type-check → tests → e2e
    └── CD: build Docker image → push to GHCR → deploy via Coolify (VPS)
```

---

## Infrastructure

| Component | Technology |
|---|---|
| CI/CD | GitHub Actions |
| Image registry | GitHub Container Registry (GHCR) |
| Production server | Personal VPS with Coolify |
| Containerisation | Docker standalone (no compose) |
| Runtime | Node.js 20 Alpine |

---

## Project files

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Next.js build |
| `.dockerignore` | Excludes unnecessary files from the image |
| `.github/workflows/ci.yml` | CI pipeline (lint, tests, e2e) |
| `.github/workflows/cd.yml` | CD pipeline (build, push GHCR, deploy Coolify) |
| `vitest.config.ts` | Vitest config with 80% coverage thresholds |
| `playwright.config.ts` | Playwright config pointing to localhost:3000 |
| `src/test/setup.ts` | Global test setup (Next.js and Supabase client mocks) |

---

## Required GitHub Secrets

Add at: GitHub repo → Settings → Secrets and variables → Actions

### Database secrets
| Secret | Description |
|---|---|
| `DATABASE_URL` | Supabase production pooler URL (port 6543) |
| `DIRECT_URL` | Supabase production direct URL (port 5432, for migrations) |
| `DATABASE_URL_TEST` | Supabase database URL for e2e tests |
| `DIRECT_URL_TEST` | Supabase direct URL for e2e tests |

### Auth secrets
| Secret | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → service_role key (secret) |

### Cloudinary secrets
| Secret | Description |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `RESEND_API_KEY` | Resend dashboard → API Keys |

### App secrets
| Secret | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public app URL in production (e.g. https://planster.app) |

### Deploy secrets (Coolify)
| Secret | Description |
|---|---|
| `COOLIFY_WEBHOOK_URL` | Coolify deploy webhook URL (see Coolify section below) |
| `COOLIFY_TOKEN` | Coolify API token |

---

## Coolify setup

### Steps to configure deploy from GHCR

1. In Coolify, create a new resource → **Docker Image**
2. In "Image": `ghcr.io/YOUR_USERNAME/planster-editor-app:latest`
3. In "Registry": add GHCR with GitHub credentials (username + Personal Access Token with `read:packages`)
4. In "Environment Variables": add all production environment variables
5. In "Webhooks": copy the deploy webhook URL → save it as the `COOLIFY_WEBHOOK_URL` GitHub Secret
6. In Coolify "API Tokens" (Settings → API Tokens): create a token → save it as `COOLIFY_TOKEN`

### Production environment variables in Coolify
Add these in the Coolify app panel:
```
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=https://planster.app
```

---

## Full deploy flow

1. Developer pushes to `main` (or merges a PR)
2. GitHub Actions triggers the **CI** job:
   - Lint + type-check
   - `npx vitest run --coverage` — fails if coverage < 80%
   - E2E tests with Playwright against the test DB
3. If CI passes, the **CD** job runs:
   - Builds the Docker image using multi-stage build
   - Pushes to `ghcr.io/YOUR_USERNAME/planster-editor-app:latest` and `...:sha-XXXXXX`
   - Calls the Coolify webhook
4. Coolify detects the new `latest` image, pulls it, and restarts the container on the VPS
5. The container runs `npx prisma migrate deploy` before starting Next.js

---

## Testing conventions for Claude Code

### Unit and component tests
- File next to the code: `component.tsx` → `component.test.tsx`
- Use `describe` / `it` with descriptive names
- Mock Prisma in Server Action tests with `vi.mock('../lib/prisma')`
- Never make real DB calls in unit tests

### E2E tests (Playwright)
- Live in `e2e/` at the project root
- One file per critical flow:
  - `e2e/auth.spec.ts` — register, login, logout
  - `e2e/books.spec.ts` — create book, create chapter, change visibility
  - `e2e/beta.spec.ts` — request beta, approve, inline comment
  - `e2e/library.spec.ts` — save book, create shelf, rate
  - `e2e/editor.spec.ts` — write in editor, auto-save, word counter
- Use `page.getByRole` and `page.getByTestId` instead of fragile CSS selectors
- Add `data-testid` attributes to key components to make selectors reliable

### Minimum coverage requirement
- **80%** across statements, branches, functions, and lines
- CI blocks the merge if the threshold is not met
- View the coverage report in the workflow artifacts after each run