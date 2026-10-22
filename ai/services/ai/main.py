"""AI Service — LLM Gateway + RAG Pipeline"""
import os
from contextlib import asynccontextmanager

import structlog
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .clients import close_resources
from .routers import chat, embedding, health, rag

load_dotenv()

log = structlog.get_logger()

AI_HOST = os.getenv("AI_HOST", "0.0.0.0")
AI_PORT = int(os.getenv("AI_PORT", "5000"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("ai_service.starting", host=AI_HOST, port=AI_PORT)
    yield
    log.info("ai_service.shutting_down")
    await close_resources()


app = FastAPI(
    title="Kanban AI Service",
    description="LLM Gateway with OpenAI + Anthropic dual provider, RAG pipeline with pgvector",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "Internal server error"}},
    )


app.include_router(health.router, prefix="", tags=["health"])
app.include_router(chat.router, prefix="/api/ai/chat", tags=["chat"])
app.include_router(embedding.router, prefix="/api/ai/embedding", tags=["embedding"])
app.include_router(rag.router, prefix="/api/ai/rag", tags=["rag"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.ai.main:app", host=AI_HOST, port=AI_PORT, reload=True)
