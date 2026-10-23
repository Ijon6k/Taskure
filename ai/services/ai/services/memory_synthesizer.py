import json
from datetime import datetime, timezone
from typing import Any, final

from ..providers.base import BaseProvider

_SYNTHESIS_SYSTEM = """You are a knowledge management assistant. Your role is to synthesize project memory updates from recent events. Follow these rules:
1. Update fields that have changed based on recent events.
2. Do NOT overwrite pinned fields. If a field is marked as pinned, preserve it exactly.
3. Keep the output as a JSON object with the same structure as the current memory.
4. Be concise — only emit the JSON, no explanation."""

_JOURNAL_SYSTEM = """You are a journal synthesis assistant. Summarize the given journal entries into a coherent, human-readable report. Focus on key decisions, progress, blockers, and themes. Write in past tense, use bullet points for lists."""


@final
class MemorySynthesizer:
    def __init__(self, provider: BaseProvider):
        self.provider: BaseProvider = provider

    async def synthesize(
        self, current_memory: dict[str, Any], recent_events: list[dict[str, Any]]
    ) -> dict[str, Any]:
        pinned = set(current_memory.get("pinned_fields", []) or [])
        safe_memory = {k: v for k, v in current_memory.items() if k != "pinned_fields"}

        prompt = f"""Current project memory (JSON):
{_json_dumps(safe_memory)}

Recent events (JSON array):
{_json_dumps(recent_events)}

Pinned fields (do NOT change these): {_json_dumps(pinned)}

Return ONLY a valid JSON object representing the updated project memory. Preserve pinned fields exactly as they were."""

        result = await self.provider.complete([
            {"role": "system", "content": _SYNTHESIS_SYSTEM},
            {"role": "user", "content": prompt},
        ])
        try:
            merged = json.loads(result.content)
        except json.JSONDecodeError:
            merged = dict(safe_memory)

        for field in pinned:
            if field in current_memory:
                merged[field] = current_memory[field]
        merged["pinned_fields"] = list(pinned)
        merged["_updated_at"] = datetime.now(timezone.utc).isoformat()
        return merged

    async def generate_journal_synthesis(
        self, entries: list[dict[str, Any]], period: str
    ) -> str:
        prompt = f"""Period: {period}

Journal entries:
{_json_dumps(entries)}

Generate a synthesis report summarizing the key events, decisions, progress, blockers, and themes for this period."""

        result = await self.provider.complete([
            {"role": "system", "content": _JOURNAL_SYSTEM},
            {"role": "user", "content": prompt},
        ])
        return result.content


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, indent=2, default=str)
