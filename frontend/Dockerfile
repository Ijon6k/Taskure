# Stage 1: Install dependencies using Bun
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

# Copy dependency definition files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Stage 2: Build Next.js standalone application
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build standalone Next.js application
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

# Copy standalone output from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set permissions for nextjs user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
