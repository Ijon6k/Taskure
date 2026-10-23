"""Memory worker — accumulates events and triggers memory synthesis when threshold is reached."""


import structlog

from ..config import settings
from ..providers.base import ProviderConfig
from ..providers.openai import OpenAIProvider
from ..services.api_client import GoAPIClient
from ..services.memory_synthesizer import MemorySynthesizer
from .outbox_poller import OutboxEvent, OutboxPoller

logger = structlog.get_logger(__name__)

EVENT_THRESHOLD = 50


_api = GoAPIClient()


async def _handle_event_accumulate(event: OutboxEvent):
    project_id = event.payload.get("project_id", "")
    if not project_id:
        return

    try:
        count_resp = await _api.execute_tool("memory_count_events", {}, project_id)
        event_count = count_resp.get("count", 0) if isinstance(count_resp, dict) else 0

        if event_count > 0 and event_count % EVENT_THRESHOLD == 0:
            await _synthesize_memory(project_id)
    except Exception:
        logger.warning("memory_event_accumulate_failed", project_id=project_id, exc_info=True)


async def _synthesize_memory(project_id: str):
    try:
        current_memory = await _api.get_project_memory(project_id)
    except Exception:
        current_memory = {
            "summary": "",
            "goals": [],
            "decisions": [],
            "blockers": [],
            "pinned_fields": [],
        }

    try:
        recent_entries = await _api.get_recent_journal(project_id, limit=100)
    except Exception:
        recent_entries = []

    provider_config = ProviderConfig(
        api_key=settings.openai_api_key,
        endpoint=settings.openai_endpoint or None,
    )
    provider = OpenAIProvider(provider_config)
    synthesizer = MemorySynthesizer(provider)

    updated = await synthesizer.synthesize(current_memory, recent_entries)

    await _api.execute_tool("memory_update", {
        "summary": updated.get("summary", ""),
        "goals": updated.get("goals", []),
        "decisions": updated.get("decisions", []),
        "blockers": updated.get("blockers", []),
        "pinned_fields": updated.get("pinned_fields", []),
    }, project_id)

    await _api.execute_tool("memory_save_history", {
        "snapshot": updated,
        "trigger_event": "memory_synthesis",
    }, project_id)


def register(poller: OutboxPoller):
    poller.on("task.created")(_handle_event_accumulate)
    poller.on("task.deleted")(_handle_event_accumulate)
    poller.on("notebook.section_changed")(_handle_event_accumulate)
    poller.on("notebook.updated")(_handle_event_accumulate)
    poller.on("conversation.created")(_handle_event_accumulate)
    poller.on("project.updated")(_handle_event_accumulate)
