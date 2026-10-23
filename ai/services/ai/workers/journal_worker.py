"""Journal worker — creates journal entries from outbox events and periodically synthesizes summaries."""

from typing import Any

import structlog

from ..config import settings
from ..providers.base import ProviderConfig
from ..providers.openai import OpenAIProvider
from ..services.api_client import GoAPIClient
from ..services.memory_synthesizer import MemorySynthesizer
from .outbox_poller import OutboxEvent, OutboxPoller

logger = structlog.get_logger(__name__)

SYNTHESIS_THRESHOLD = 100


def _event_summary(event_type: str, aggregate_type: str, payload: dict[str, Any]) -> str:
    summaries = {
        "task.created": f"Task created: {payload.get('title', 'untitled')}",
        "task.deleted": f"Task deleted: {payload.get('title', 'unknown')}",
        "task.updated": f"Task updated: {payload.get('title', 'unknown')}",
        "notebook.section_changed": f"Notebook page updated: {payload.get('page_title', 'unknown')}",
        "notebook.updated": f"Notebook page changed: {payload.get('page_title', 'unknown')}",
        "conversation.created": f"New conversation: {payload.get('title', 'untitled')}",
        "project.updated": "Project settings updated",
        "resource.uploaded": f"Resource uploaded: {payload.get('filename', 'unknown')}",
    }
    return summaries.get(event_type, f"{aggregate_type} {event_type}")


_api = GoAPIClient()


async def _handle_create_entry(event: OutboxEvent):
    project_id = event.payload.get("project_id", "")
    if not project_id:
        return

    summary = _event_summary(event.event_type, event.aggregate_type, event.payload)
    metadata = {
        "aggregate_type": event.aggregate_type,
        "aggregate_id": event.aggregate_id,
        "event_type": event.event_type,
    }

    try:
        result = await _api.execute_tool("journal_create_entry", {
            "event_type": event.event_type,
            "summary": summary,
            "metadata": metadata,
        }, project_id)

        needs_synthesis = result.get("needs_synthesis", False) if isinstance(result, dict) else False
        if needs_synthesis:
            await _synthesize_journal(project_id)
    except Exception:
        logger.warning("journal_create_entry_failed", project_id=project_id, exc_info=True)


async def _synthesize_journal(project_id: str):
    try:
        entries = await _api.get_recent_journal(project_id, limit=200)
    except Exception:
        logger.warning("journal_fetch_entries_failed", project_id=project_id, exc_info=True)
        return

    provider_config = ProviderConfig(
        api_key=settings.openai_api_key,
        endpoint=settings.openai_endpoint or None,
    )
    provider = OpenAIProvider(provider_config)
    synthesizer = MemorySynthesizer(provider)

    synthesis_text = await synthesizer.generate_journal_synthesis(entries, "recent activity")

    period_start = entries[-1].get("occurred_at", "") if entries else ""
    period_end = entries[0].get("occurred_at", "") if entries else ""

    await _api.execute_tool("journal_create_synthesis", {
        "period_start": period_start,
        "period_end": period_end,
        "synthesis_text": synthesis_text,
        "key_milestones": [],
    }, project_id)


def register(poller: OutboxPoller):
    poller.on("task.created")(_handle_create_entry)
    poller.on("task.deleted")(_handle_create_entry)
    poller.on("task.updated")(_handle_create_entry)
    poller.on("notebook.section_changed")(_handle_create_entry)
    poller.on("notebook.updated")(_handle_create_entry)
    poller.on("conversation.created")(_handle_create_entry)
    poller.on("project.updated")(_handle_create_entry)
    poller.on("resource.uploaded")(_handle_create_entry)
