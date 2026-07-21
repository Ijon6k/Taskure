FROM python:3.12-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
RUN pip install uv
COPY pyproject.toml .
RUN uv sync --frozen --no-dev

FROM base AS runtime
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
WORKDIR /app
CMD ["uvicorn", "services.ai.main:app", "--host", "0.0.0.0", "--port", "5000"]
EXPOSE 5000
