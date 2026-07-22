# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /repo

# Copy monorepo root files
COPY package.json bun-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages ./packages

# Copy the web app source
COPY apps/web ./apps/web

# Install in web app — Bun resolves workspace dependency
WORKDIR /repo/apps/web
RUN bun install

ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Runtime stage — use Node.js for Next.js production server
FROM node:20-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /repo/apps/web/.next ./apps/web/.next
COPY --from=builder /repo/apps/web/public ./apps/web/public
COPY --from=builder /repo/apps/web/package.json ./apps/web/package.json
COPY --from=builder /repo/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /repo/apps/web/node_modules ./apps/web/node_modules

WORKDIR /repo/apps/web
EXPOSE 3000
ENV PORT=3000
CMD ["node_modules/.bin/next", "start"]
