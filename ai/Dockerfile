# Stage 1: Build dependencies with uv
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# Copy dependency definition files
COPY pyproject.toml uv.lock* ./

# Install only production dependencies first
RUN uv sync --frozen --no-install-project --no-dev

# Stage 2: Dev target with uv (reload support)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS dev
WORKDIR /app

# curl needed for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH" PYTHONPATH=/app UV_CACHE_DIR=/tmp/.uv-cache
EXPOSE 5000
CMD ["uvicorn", "services.ai.main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]

# Stage 3: Slim production runner
FROM python:3.12-slim-bookworm AS runner
WORKDIR /app

# Install only runtime system deps (nothing extra)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 10001 appgroup && \
    adduser --system --uid 10001 --gid 10001 appuser

# Copy only venv from builder (no source code yet)
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv

# Copy only runtime Python files (exclude tests, cache, docs)
COPY --chown=appuser:appgroup services/ ./services/
COPY --chown=appuser:appgroup docker-entrypoint.sh ./docker-entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER appuser
EXPOSE 5000

# Fast healthcheck using curl instead of Python
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Runs the outbox worker (background) + uvicorn (foreground)
CMD ["/app/docker-entrypoint.sh"]
