# Module: Authentication

## Provider
- **Email + password only:** registration with email, password hashed with bcrypt
- No OAuth providers

## Registration flow
1. User fills in: email, password, username, displayName
2. Validate that the username is unique and the email is not already registered
3. Create the user in the DB with a hashed password
4. Create the 3 system shelves: "Reading now", "Want to read", "Read" (isSystem: true)
5. Automatically sign in and redirect to `/write`

## Session
- Strategy: JWT
- Token includes: `id`, `email`, `username`, `avatarUrl`
- Expiration: 30 days
- Middleware protects all routes under `(app)/`

## Password reset flow
1. User visits `/auth/forgot-password` and submits their email
2. If the email exists in the DB:
   - Generate a secure random token with `crypto.randomBytes(32)`
   - Save it hashed in a `PasswordResetToken` table with a 1-hour expiry
   - Send a reset email via **Resend** with a link to `/auth/reset-password?token=XXX`
3. User clicks the link → `/auth/reset-password?token=XXX`
4. Validate the token: exists, not expired, not already used
5. User sets a new password → hash it → update `user.password`
6. Delete the token from the DB
7. Redirect to `/auth/login` with a success message

### Resend email
- From address: `noreply@planster.app` (or whatever domain you configure in Resend)
- Subject: `Reset your Planster password`
- Body: plain transactional email with the reset link, valid for 1 hour
- Use the Resend SDK: `import { Resend } from 'resend'`
- Send from a Server Action, never from a client component

### PasswordResetToken model (add to Prisma schema)
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

## Validations
- Username: 3–30 characters, only letters, numbers, and underscores
- Password: minimum 8 characters
- Email: valid format
- Reset token: must exist, `expiresAt` must be in the future, `usedAt` must be null