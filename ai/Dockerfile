# Stage 1: Builder with Astral uv
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder
WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Copy dependency definition files
COPY pyproject.toml uv.lock* ./

# Install dependencies using uv into virtualenv with BuildKit caching
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project

# Stage 2: Development Target with Uvicorn Reload
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS dev
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY . .
ENV PATH="/app/.venv/bin:$PATH" PYTHONPATH=/app UV_CACHE_DIR=/tmp/.uv-cache
EXPOSE 5000
CMD ["uvicorn", "services.ai.main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]

# Stage 3: Lightweight Production Runner
FROM python:3.12-slim AS runner
WORKDIR /app

RUN addgroup --system --gid 10001 appgroup && \
    adduser --system --uid 10001 appuser

COPY --from=builder /app/.venv /app/.venv
COPY . .

ENV PATH="/app/.venv/bin:$PATH" PYTHONPATH=/app
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

CMD ["uvicorn", "services.ai.main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "4"]
