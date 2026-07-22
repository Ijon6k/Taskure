# Stage 1: Install dependencies using Bun with hoisted linker
FROM oven/bun:1.2-alpine AS deps
WORKDIR /repo

# Copy monorepo root files for workspace resolution
COPY package.json bun-workspace.yaml turbo.json bun.lock* ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install workspace dependencies with Bun using hoisted linker
RUN bun install --linker=hoisted

# Stage 2: Build Next.js app using Node.js
FROM node:20-alpine AS builder
WORKDIR /repo

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy workspace with installed dependencies from deps stage
COPY --from=deps /repo /repo

WORKDIR /repo/apps/web

# Build production standalone bundle using Next.js CLI
RUN npx next build

# Stage 3: Lightweight Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /repo/apps/web/.next/standalone ./

# Switch to the web app directory inside standalone
WORKDIR /app/apps/web

# Copy static assets and public directory into web app folder
COPY --from=builder /repo/apps/web/public ./public
COPY --from=builder /repo/apps/web/.next/static ./.next/static

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
