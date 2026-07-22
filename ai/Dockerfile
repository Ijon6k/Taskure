FROM python:3.12-slim
WORKDIR /app

# Install dependencies from requirements/pip
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        fastapi==0.115.6 \
        "uvicorn[standard]==0.34.0" \
        openai==1.57.4 \
        anthropic==0.38.0 \
        "sqlalchemy[asyncio]==2.0.36" \
        asyncpg==0.30.0 \
        "pgvector[async]==0.3.6" \
        "redis[hiredis]==5.2.1" \
        pydantic==2.10.4 \
        pydantic-settings==2.7.0 \
        python-multipart==0.0.20 \
        sse-starlette==2.2.1 \
        httpx==0.28.1 \
        numpy==2.2.2 \
        tiktoken==0.8.0 \
        tenacity==9.0.0 \
        structlog==24.4.0 \
        python-dotenv==1.0.1

# Copy python service code
COPY . .

ENV PYTHONPATH=/app
EXPOSE 5000
CMD ["uvicorn", "services.ai.main:app", "--host", "0.0.0.0", "--port", "5000"]
