# Stage 1: Install dependencies using Bun
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Stage 2: Development Stage with Hot Reload (Bun Dev)
FROM oven/bun:1.2-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development PORT=3000 HOSTNAME="0.0.0.0" PATH="/app/node_modules/.bin:$PATH"
EXPOSE 3000
CMD ["bun", "run", "dev"]

# Stage 3: Build Next.js standalone application using Bun
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 4: Lightweight Production Runner using Bun Runtime
FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME="0.0.0.0"

# Create non-root system user for Bun
RUN addgroup --system --gid 1001 bungroup && \
    adduser --system --uid 1001 bunuser

# Copy standalone output from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set permissions for bunuser
RUN chown -R bunuser:bungroup /app

USER bunuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000').then(r => {if(!r.ok) process.exit(1)})"

CMD ["bun", "run", "server.js"]
