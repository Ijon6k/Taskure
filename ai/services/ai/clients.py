"""Cached clients and database session management for AI service"""
import os
from typing import AsyncGenerator

import anthropic
import openai
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings

_openai_client: openai.AsyncOpenAI | None = None
_anthropic_client: anthropic.AsyncAnthropic | None = None
_engine = None
_session_factory = None


def get_openai_client() -> openai.AsyncOpenAI:
    global _openai_client
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OpenAI API key not configured")
    if _openai_client is None:
        _openai_client = openai.AsyncOpenAI(api_key=api_key)
    return _openai_client


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    api_key = settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("Anthropic API key not configured")
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=api_key)
    return _anthropic_client


def get_db_engine():
    global _engine, _session_factory
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            pool_size=settings.postgres_pool_size,
            max_overflow=2,
            pool_pre_ping=True,
        )
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


async def get_db_session() -> AsyncSession:
    get_db_engine()
    assert _session_factory is not None
    return _session_factory()


async def close_resources():
    global _openai_client, _anthropic_client, _engine
    if _openai_client:
        await _openai_client.close()
        _openai_client = None
    if _anthropic_client:
        await _anthropic_client.close()
        _anthropic_client = None
    if _engine:
        await _engine.dispose()
        _engine = None
