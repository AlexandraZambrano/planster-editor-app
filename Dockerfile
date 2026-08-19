# ─── Stage 1: dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ─── Stage 2: prisma generate ─────────────────────────────────────────────────
FROM node:22-alpine AS prisma
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
RUN npx prisma generate

# ─── Stage 3: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

# Variables de entorno necesarias en build time (solo las públicas)
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 4: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar solo lo necesario para producción
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

# sharp's SVG rasterizer (libvips → librsvg → Pango) needs fontconfig to
# resolve ANY font by name, including custom ones — Pango has no support for
# embedding a font directly in an SVG via @font-face, it silently renders no
# glyphs at all without this. Installing the cover designer's curated fonts
# as real system fonts is what lets the cover-card text actually render.
RUN apk add --no-cache fontconfig && \
    mkdir -p /usr/share/fonts/planster-covers && \
    cp /app/public/fonts/covers/*.ttf /usr/share/fonts/planster-covers/ && \
    fc-cache -f

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Schema changes are applied manually via `prisma db push` (no prisma/migrations
# directory exists in this repo), not automatically on container start.
CMD ["node", "server.js"]