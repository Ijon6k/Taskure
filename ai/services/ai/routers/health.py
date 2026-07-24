"""Health check & hello router"""
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
@router.get("/hello")
@router.get("/api/ai/hello")
async def hello_world():
    return {
        "message": "Hello World! Kanban Python AI Service is running smoothly.",
        "status": "ok",
        "service": "kanban-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
