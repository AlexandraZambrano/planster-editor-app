# Module: Authentication

## Provider
- **Supabase Auth (GoTrue)**: email + password, and Google OAuth
- Login accepts either **username or email** — Supabase's password grant only accepts
  email, so the app resolves a username to its email (`getEmailForIdentifier` in
  `src/actions/auth.ts`) before calling `supabase.auth.signInWithPassword`
- `User.id` (our own cuid, used by every FK in the schema) is decoupled from Supabase's own
  `auth.users.id` via the nullable `User.authUserId` column

## Registration flow (email + password)
1. User fills in: email, password, username, displayName
2. Validate that the username is unique and the email is not already registered in Prisma
3. Create the Supabase auth user via `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`
   (no verification email — preserves instant sign-in-after-register UX)
4. Create the Prisma `User` row with `authUserId` set to the new Supabase user's id
5. Create the 3 system shelves: "Reading now", "Want to read", "Read" (isSystem: true)
6. Client calls `supabase.auth.signInWithPassword` to establish the browser session, then
   redirects to `/write`

**Security note:** because `email_confirm: true` skips real mailbox verification, this flow
does **not** auto-claim a pre-existing Prisma row by email match — a matching row (verified
or not) always returns "already registered". The Google OAuth flow below is the only path
allowed to claim an existing row by email, since Google has already verified it.

## Google OAuth flow
1. `GoogleButton` calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "/auth/callback" } })`
2. User completes the Google consent screen
3. Supabase redirects to `src/app/auth/callback/route.ts` with a `code` param
4. The route calls `exchangeCodeForSession(code)`, then `findOrCreateProfileForOAuth()`
   (`src/lib/user-provisioning.ts`), which:
   - Returns the existing profile if `authUserId` is already linked
   - **Claims** a pre-existing, unlinked Prisma row with the same email (safe here — Google
     verified the email)
   - Otherwise creates a brand-new profile with an auto-generated unique username and the
     3 system shelves
5. Redirects to `/write` (or a threaded `next` param)

## Session
- Managed by Supabase Auth (JWT-based, rotating refresh tokens)
- `src/lib/auth.ts` exports `auth()`, a compatibility shim used by all 30+ call sites:
  resolves the Supabase session, looks up the Prisma `User` by `authUserId`, and returns
  `{ user: { id, email, username, avatarUrl, avatarPositionY } }` (or `null`)
- `src/middleware.ts` refreshes the session cookie on every route except static assets
  (via `src/lib/supabase/middleware.ts`) and redirects unauthenticated visitors away from
  routes under `(app)/`

## Password reset flow
1. User visits `/auth/forgot-password` and submits their email
2. If the email exists in the DB (unchanged from before — still Prisma + Resend, no Supabase involved here):
   - Generate a secure random token with `crypto.randomBytes(32)`
   - Save it hashed in a `PasswordResetToken` table with a 1-hour expiry
   - Send a reset email via **Resend** with a link to `/auth/reset-password?token=XXX`
3. User clicks the link → `/auth/reset-password?token=XXX`
4. Validate the token: exists, not expired, not already used
5. User sets a new password → `supabaseAdmin.auth.admin.updateUserById(authUserId, { password })`
   (if the account has no linked `authUserId` — e.g. a pre-Supabase legacy row — this
   returns an error instead, since there is no Supabase auth user to update)
6. Mark the token as used
7. Redirect to `/auth/login` with a success message

### Resend email
- From address: `noreply@planster.app` (or whatever domain you configure in Resend)
- Subject: `Reset your Planster password`
- Body: plain transactional email with the reset link, valid for 1 hour
- Use the Resend SDK: `import { Resend } from 'resend'`
- Send from a Server Action, never from a client component

### PasswordResetToken model
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique  // store hashed, never plain
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Change password (Settings)
- Verifies the current password via `supabase.auth.signInWithPassword`
- Updates it via `supabaseAdmin.auth.admin.updateUserById`
- **Supabase invalidates the user's other sessions on a password change** — the client
  signs out and redirects to `/auth/login?passwordChanged=true` with a confirmation banner

## Validations
- Username: 3–30 characters, only letters, numbers, and underscores
- Password: minimum 8 characters
- Email: valid format
- Reset token: must exist, `expiresAt` must be in the future, `usedAt` must be null

## Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase dashboard → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # ...→ anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # ...→ service_role key — secret, server-only
```
Google Client ID/Secret are configured in the Supabase dashboard (Authentication →
Providers → Google), not in this app's `.env`.
