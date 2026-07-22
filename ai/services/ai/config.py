"""Configuration — loaded from environment variables"""
import os
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL + pgvector
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "kanban"
    postgres_password: str = "changeme"
    postgres_db: str = "kanban"
    postgres_pool_size: int = 10

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    # Redis
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = ""

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"
        return f"redis://{self.redis_host}:{self.redis_port}/0"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_max_tokens: int = 4096
    openai_temperature: float = 0.7

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    anthropic_max_tokens: int = 4096
    anthropic_temperature: float = 0.7

    # RAG
    embedding_dimension: int = 1536
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.7

    # AI
    ai_default_provider: Literal["openai", "anthropic"] = "anthropic"

    @lru_cache
    def get_settings(self) -> "Settings":
        return self


settings = Settings()
