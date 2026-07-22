# Stage 1: Install dependencies
FROM oven/bun:1.3-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /repo

# Copy monorepo root files for workspace resolution
COPY package.json bun-workspace.yaml turbo.json ./
COPY packages ./packages

# Copy this app
COPY apps/web ./apps/web
WORKDIR /repo/apps/web

# Install dependencies using cache mount
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile || bun install

# Development stage
FROM oven/bun:1.3-alpine AS dev
WORKDIR /repo/apps/web
COPY --from=deps /repo/apps/web/node_modules ./node_modules
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages ./packages
COPY --from=deps /repo/apps/web ./apps/web
COPY apps/web ./apps/web
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["bun", "run", "dev"]

# Stage 2: Build the application
FROM oven/bun:1.3-alpine AS builder
WORKDIR /repo/apps/web
COPY --from=deps /repo/apps/web/node_modules ./node_modules
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages ./packages
COPY --from=deps /repo/apps/web ./apps/web
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1

# Build the application (standalone output)
RUN bun run build

# Stage 3: Runner
FROM oven/bun:1.3-alpine AS runner
WORKDIR /repo/apps/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root system user for safety
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built public files
COPY --from=builder /repo/apps/web/public ./public

# Set permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy built standalone server and static resources
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build standalone
CMD ["bun", "run", "server.js"]
