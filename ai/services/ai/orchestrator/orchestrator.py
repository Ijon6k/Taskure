import asyncio
import json
from typing import Any, AsyncIterator

from ..config import settings
from ..providers import BaseProvider, ProviderConfig, build_provider
from ..providers.anthropic import AnthropicProvider
from ..providers.openai import OpenAIProvider
from ..rag.retriever import Retriever
from ..services.api_client import GoAPIClient
from ..services.context_optimizer import ContextOptimizer, ContextSource
from ..services.prompt_registry import PromptRegistry
from ..types import Messages
from .hitl_gate import HITLGate
from .planning_cache import PlanningCache
from .reflection_engine import ReflectionEngine
from .telemetry_collector import TelemetryCollector
from .tool_registry import ToolRegistry
from .workflow_lifecycle import WorkflowLifecycleManager

MODE_CONFIGS: dict[str, dict[str, Any]] = {
    "fast": {
        "token_budget": 500,
        "tools": "none",
        "reflection_iterations": 0,
        "context_sources": ["project_memory"],
        "hitl": False,
        "max_tool_rounds": 0,
    },
    "thinking": {
        "token_budget": 4000,
        "tools": "read_only",
        "reflection_iterations": 1,
        "context_sources": ["project_memory", "journal", "rag"],
        "hitl": False,
        "max_tool_rounds": 3,
    },
    "planning": {
        "token_budget": 8000,
        "tools": "read_write_no_destructive",
        "reflection_iterations": 2,
        "context_sources": ["project_memory", "journal", "rag", "tasks", "columns"],
        "hitl": False,
        "max_tool_rounds": 12,
    },
    "agent": {
        "token_budget": 16000,
        "tools": "all",
        "reflection_iterations": 3,
        "context_sources": [
            "project_memory", "journal", "rag", "tasks", "columns",
            "notebook", "discussion",
        ],
        "hitl": True,
        "max_tool_rounds": 20,
    },
}

# An SSE frame as produced by _sse().
SseEvent = dict[str, str]


# Instruct the model to answer in Markdown so the chat UI can render
# tables, lists and code blocks nicely (GitHub-flavored Markdown).
_MARKDOWN_INSTRUCTION = (
    "Format your answers using GitHub-flavored Markdown. "
    "Use headings, bullet/numbered lists, and tables where they help. "
    "Wrap code in fenced code blocks with a language tag."
)

# System prompt for modes WITHOUT write tools (fast/thinking): the model is an
# analyst that reads project context and answers concisely.
_ANALYST_SYSTEM = (
    "You are a Staff Technical Project Lead and Agile/Kanban Architect. "
    "You analyze project health, task bottlenecks, and execution progress using available context "
    "(memory, journal entries, tasks, columns, notebooks, and RAG knowledge).\n\n"
    "PRINCIPLES:\n"
    "- Be direct, analytical, and structured. Avoid fluff and generic motivational filler.\n"
    "- Identify blockers, work-in-progress (WIP) imbalances, and missing milestones.\n"
    "- Structure answers with clear sections: Key Findings, Actionable Next Steps, and Risks/Blockers."
)

# System prompt for modes WITH tools (planning/agent): the model is an agent
# that MUST execute the user's request by calling tools — not just describe it.
_AGENT_SYSTEM = (
    "You are an autonomous Senior Engineering Lead and Kanban Project Planner. "
    "You manage and execute project workflows by reading AND actively updating the board, notebooks, and project memory via tools.\n\n"
    "CRITICAL EXECUTION RULES:\n"
    "1. When the user asks you to CREATE, UPDATE, or GENERATE board content "
    "(tasks, columns, notebook pages, plans, memory), you MUST execute it using "
    "the available tools — never merely describe what you would do.\n"
    "2. When creating tasks manually, always inspect the board first (column_search or "
    "project_get_board) to get real column IDs. Never invent UUIDs.\n"
    "3. When clearing the board is requested, use project_clear_board for atomic execution.\n"
    "4. Always summarize the executed changes clearly in Markdown after tool runs.\n\n"
    "NOTEBOOK & DOCUMENTATION DIRECTIVES:\n"
    "- When asked to write documentation, specs, architecture plans, guides, meeting notes, or retrospectives, use notebook_create or notebook_update.\n"
    "- Format notebook content with comprehensive GitHub-flavored Markdown: headings (H1, H2, H3), bullet points, tables, code blocks with language tags, and checklists.\n"
    "- Check existing pages with notebook_search first if modifying or referencing notes.\n\n"
    "WORLD-CLASS KANBAN PLANNING DIRECTIVES:\n"
    "- When asked to create, plan, or restructure a Kanban board, PREFER the kanban_generate_plan tool.\n"
    "- Use the high-efficiency Line-Based Compact DSL (plan_dsl) with COL:, TASK:, and SUB: lines.\n"
    "- If a task benefits from actionable steps or acceptance criteria, add SUB: <checklist item> lines immediately below that TASK:\n"
    "  Example:\n"
    "    COL: 1. Core Architecture\n"
    "    TASK: urgent | Implement JWT Refresh Rotation | Issue short-lived access tokens with rotating refresh cookies\n"
    "    SUB: Define TokenPair struct and claims schema\n"
    "    SUB: Implement /auth/refresh endpoint with replay detection\n"
    "    SUB: Write unit and integration test suite\n"
    "- When creating standalone tasks via task_create, you can pass a subtasks array (e.g. subtasks: ['Step 1', 'Step 2']).\n"
    "- You can also use task_add_subtask, task_update_subtask, or task_delete_subtask on existing tasks.\n"
    "- Structure work into logical, value-delivering phases (e.g. 1. Architecture & Setup, 2. Core Implementation, 3. Security & Validation, 4. Testing & CI/CD, 5. Deployment & Release).\n"
    "- Calibrate task priorities accurately:\n"
    "  * urgent: Critical path items, foundational schemas, blockers.\n"
    "  * high: Essential user features, primary business logic, core APIs.\n"
    "  * medium: Secondary capabilities, validation, test suites.\n"
    "  * low: Nice-to-haves, non-blocking docs, visual polish.\n"
    "- Write imperative, actionable, and concrete task titles (e.g. 'Implement JWT Refresh Rotation', not 'Auth').\n"
    "- Provide clear, concise descriptions covering technical scope and acceptance criteria for each task.\n"
    "- Aim for a comprehensive, production-ready board with 12 to 24 well-scoped tasks in a single kanban_generate_plan call.\n\n"
    "AGENTIC LOOPING & SELF-CORRECTION:\n"
    "- If a tool call fails or returns an error (e.g. invalid ID or missing parameter), inspect the error result and immediately self-correct in the next step by searching or adjusting arguments."
)


def _safe_error_message(exc: BaseException) -> str:
    """Extract a concise, human-readable message from a provider exception.

    OpenAI-compatible SDKs embed the entire upstream response body in str(exc),
    which leaks raw 400 validation blobs into the chat. Pull out the meaningful
    part and cap the length.
    """
    # openai.APIStatusError and subclasses (BadRequestError, …)
    for attr in ("message", "user_message"):
        val = getattr(exc, attr, None)
        if val and isinstance(val, str) and val.strip():
            return val.strip()[:400]

    msg = str(exc)
    # A single-line fallback; truncate long bodies.
    if len(msg) > 400:
        msg = msg[:400] + "…"
    return msg


class Orchestrator:
    def __init__(
        self,
        provider: BaseProvider | None = None,
        prompt_registry: PromptRegistry | None = None,
        retriever: Retriever | None = None,
        api_client: GoAPIClient | None = None,
    ):
        self._provider: BaseProvider | None = provider
        self._registry: PromptRegistry = prompt_registry or PromptRegistry()
        self._retriever: Retriever | None = retriever
        self._api_client: GoAPIClient | None = api_client
        self._lifecycle = WorkflowLifecycleManager()
        self._tools = ToolRegistry()
        self._telemetry = TelemetryCollector()
        self._hitl = HITLGate()
        self._cache = PlanningCache()
        self.reflection_engine: ReflectionEngine | None = None

    async def run(
        self,
        mode: str,
        messages: Messages,
        project_id: str,
        provider_config: ProviderConfig | None = None,
    ) -> AsyncIterator[SseEvent]:
        if mode not in MODE_CONFIGS:
            yield self._sse("error", {"message": f"Unknown mode: {mode}. Must be one of {list(MODE_CONFIGS)}"})
            return

        mconfig = MODE_CONFIGS[mode]

        try:
            provider = self._provider or self._build_provider(provider_config)
        except Exception as exc:
            yield self._sse("error", {"message": f"Provider error: {_safe_error_message(exc)}"})
            return

        if self._retriever is None:
            embed_provider = provider
            if not hasattr(embed_provider, "embed") or isinstance(embed_provider, AnthropicProvider):
                if settings.openai_api_key:
                    embed_provider = OpenAIProvider(ProviderConfig(
                        api_key=settings.openai_api_key,
                        endpoint=settings.openai_endpoint or None,
                        model=settings.openai_embedding_model,
                    ))
            self._retriever = Retriever(provider=embed_provider, api_client=self._get_api())

        optimizer = ContextOptimizer(
            model=provider.config.model, max_tokens=int(mconfig["token_budget"])
        )

        workflow_id = self._lifecycle.create(project_id, mode)
        self._lifecycle.start(workflow_id)

        try:
            sources = list(mconfig["context_sources"])
            yield self._sse("state", {"state": "context-retrieval"})
            # Emit per-source progress so the UI shows what is being retrieved.
            for src in sources:
                yield self._sse("state", {
                    "state": "context-retrieval",
                    "details": f"Loading {src.replace('_', ' ')}…",
                })
            ctx_prompt, ctx_report = await self._load_context(
                optimizer, project_id, mode, messages, sources
            )
            yield self._sse("context", {
                "usage": {
                    "used": ctx_report.used_tokens,
                    "total": ctx_report.total_window,
                    "breakdown": {"system": 0, "messages": 0, "tools": 0, "reasoning": 0},
                }
            })
        except Exception as exc:
            self._lifecycle.fail(workflow_id, str(exc))
            yield self._sse("error", {"message": f"Context loading failed: {_safe_error_message(exc)}"})
            return

        assembled_messages = self._assemble_messages(messages, ctx_prompt, mode)

        if self.reflection_engine is None:
            self.reflection_engine = ReflectionEngine(provider=provider, prompt_registry=self._registry)

        try:
            if mode == "fast":
                yield self._sse("state", {"state": "analyzing", "details": "Reasoning about your request…"})
                yield self._sse("state", {"state": "streaming"})
                async for chunk in provider.stream(assembled_messages):
                    if chunk:
                        yield self._sse("text", {"content": chunk})
            elif mode == "thinking":
                yield self._sse("state", {"state": "analyzing", "details": "Thinking step-by-step…"})
                yield self._sse("state", {"state": "streaming"})
                async for chunk in provider.stream(assembled_messages):
                    if chunk:
                        yield self._sse("text", {"content": chunk})
            else:
                async for event in self._run_agent(
                    provider, workflow_id, project_id, assembled_messages,
                    mconfig, mode,
                ):
                    yield event
        except Exception as exc:
            self._lifecycle.fail(workflow_id, str(exc))
            yield self._sse("error", {"message": _safe_error_message(exc)})
            return

        self._lifecycle.complete(workflow_id)
        yield self._sse("done", {})

    def _build_provider(self, provider_config: ProviderConfig | None) -> BaseProvider:
        if provider_config is None:
            raise ValueError("provider_config is required")
        return build_provider(provider_config)

    def _get_api(self) -> GoAPIClient:
        if self._api_client is None:
            self._api_client = GoAPIClient()
        return self._api_client

    async def _load_context(
        self,
        optimizer: ContextOptimizer,
        project_id: str,
        mode: str,
        messages: Messages,
        sources: list[str],
    ):
        api = self._get_api()

        # Fetch all enabled sources in parallel to keep latency near the slowest
        # single source instead of summing them serially.
        tasks: dict[str, Any] = {}
        if "project_memory" in sources:
            tasks["project_memory"] = self._safe(self._fetch_memory(api, project_id))
        if "journal" in sources:
            tasks["journal"] = self._safe(self._fetch_journal(api, project_id))
        if "rag" in sources and self._retriever:
            tasks["rag"] = self._safe(self._fetch_rag(messages, project_id))
        if "tasks" in sources:
            tasks["tasks"] = self._safe(self._fetch_tasks(api, project_id))
        if "columns" in sources:
            tasks["columns"] = self._safe(self._fetch_columns(api, project_id))
        if "notebook" in sources:
            tasks["notebook"] = self._safe(self._fetch_notebook(api, project_id))
        if "discussion" in sources:
            tasks["discussion"] = self._safe(self._fetch_discussions(api, project_id))

        results = await asyncio.gather(*tasks.values()) if tasks else {}
        by_name = dict(zip(tasks.keys(), results)) if tasks else {}

        ctx_sources: list[ContextSource] = []
        priorities = {
            "project_memory": 1, "rag": 2, "journal": 3,
            "tasks": 4, "columns": 4, "notebook": 5, "discussion": 5,
        }
        for name, text in by_name.items():
            if text:
                ctx_sources.append(ContextSource(
                    name=name, content=text, priority=priorities.get(name, 5),
                ))

        return optimizer.optimize(ctx_sources)

    @staticmethod
    async def _safe(coro):
        """Run a fetch coroutine, returning "" on error so one failure never
        blocks the whole context assembly."""
        try:
            return await coro
        except Exception:
            return ""

    async def _fetch_memory(self, api: GoAPIClient, project_id: str) -> str:
        memory = await api.get_project_memory(project_id)
        return json.dumps(memory) if memory else f"Project ID: {project_id}"

    async def _fetch_journal(self, api: GoAPIClient, project_id: str) -> str:
        rows = await api.get_recent_journal(project_id, limit=5)
        if not rows:
            return f"No recent journal entries for project {project_id}"
        return "\n".join(
            f"[{r.get('occurred_at', '')}] {r.get('event_type', '')}: {r.get('summary', '')}"
            for r in rows
        )

    async def _fetch_rag(self, messages: Messages, project_id: str) -> str:
        user_query = self._extract_goal(messages)
        retriever = self._retriever
        if retriever is None:
            return ""
        rag_results = await retriever.search(
            query=user_query, project_id=project_id, top_k=5,
        )
        return "\n".join(r.content for r in rag_results)

    async def _fetch_tasks(self, api: GoAPIClient, project_id: str) -> str:
        rows = await api.get_project_tasks(project_id)
        if not rows:
            return f"No tasks for project {project_id}"
        return "\n".join(
            f"- {r.get('title', 'untitled')} [{r.get('status', 'unknown')}]" for r in rows
        )

    async def _fetch_columns(self, api: GoAPIClient, project_id: str) -> str:
        rows = await api.get_project_columns(project_id)
        if not rows:
            return f"No columns for project {project_id}"
        return "\n".join(f"- {r.get('name', str(r.get('id', '')))}" for r in rows)

    async def _fetch_notebook(self, api: GoAPIClient, project_id: str) -> str:
        rows = await api.get_project_notebook(project_id, limit=10)
        if not rows:
            return f"No notebook pages for project {project_id}"
        return "\n".join(f"## {r.get('title', '')}\n{r.get('content', '')}" for r in rows)

    async def _fetch_discussions(self, api: GoAPIClient, project_id: str) -> str:
        rows = await api.get_project_discussions(project_id, limit=10)
        if not rows:
            return f"No discussions for project {project_id}"
        return "\n".join(
            f"[{r.get('created_at', '')}] {r.get('author', '')}: {r.get('content', '')}"
            for r in rows
        )

    def _assemble_messages(self, messages: Messages, context: str, mode: str) -> Messages:
        # Build a mode-appropriate system prompt.
        if mode in ("planning", "agent"):
            system = f"{_AGENT_SYSTEM}\n\n{_MARKDOWN_INSTRUCTION}"
        else:
            system = f"{_ANALYST_SYSTEM}\n\n{_MARKDOWN_INSTRUCTION}"
        system = f"{system}\n\nContext:\n{context}"

        system_idx = next(
            (i for i, m in enumerate(messages) if m.get("role") == "system"), None,
        )
        if system_idx is not None:
            augmented = dict(messages[system_idx])
            augmented["content"] = f"{augmented['content']}\n\n{system}"
            messages = list(messages)
            messages[system_idx] = augmented
        else:
            messages = [{"role": "system", "content": system}] + list(messages)
        return messages

    def _extract_goal(self, messages: Messages) -> str:
        user_msgs = [m["content"] for m in messages if m.get("role") == "user" and isinstance(m.get("content"), str)]
        return str(user_msgs[-1]) if user_msgs else ""

    async def _run_fast(self, provider: BaseProvider, messages: Messages):
        return await provider.complete(messages)

    async def _run_thinking(
        self, provider: BaseProvider, messages: Messages,
    ):
        # Single-pass reasoning. The model reasons internally; a second
        # "review" LLM call only multiplies latency (20s+) with negligible
        # quality gain for most queries.
        return await provider.complete(messages), 0

    async def _run_agent(
        self,
        provider: BaseProvider,
        workflow_id: str,
        project_id: str,
        messages: Messages,
        mconfig: dict[str, Any],
        mode: str,
    ) -> AsyncIterator[SseEvent]:
        """Tool-calling agent loop: LLM <-> tool execution via Go backend."""
        api = self._get_api()
        tools = self._tools.get_tools_for_mode(mode)
        tool_schemas = self._tools.to_openai_format(tools) if tools else None
        max_rounds = int(mconfig.get("max_tool_rounds", 5))

        if tool_schemas:
            yield self._sse("state", {"state": "tool-call"})

        for _round in range(max_rounds):
            result = await provider.complete(messages, tools=tool_schemas)

            if not result.tool_calls:
                # No tool calls needed → this is the final direct answer
                yield self._sse("state", {"state": "streaming"})
                yield self._sse("text", {"content": result.content})
                return

            for tc in result.tool_calls:
                yield self._sse("tool_call", {
                    "name": tc.name,
                    "arguments": tc.arguments,
                    "round": _round + 1,
                })

            async def _execute_tc(tc):
                try:
                    outcome = await api.execute_tool(tc.name, tc.arguments, project_id)
                    return tc, outcome, "success"
                except Exception as exc:
                    return tc, {"error": str(exc)}, "error"

            exec_results = await asyncio.gather(*[_execute_tc(tc) for tc in result.tool_calls])

            for tc, outcome, status in exec_results:
                yield self._sse("tool_result", {
                    "name": tc.name,
                    "status": status,
                    "result": outcome,
                })

            # Append single assistant turn with ALL tool calls (OpenAI & Anthropic spec)
            messages.append({
                "role": "assistant",
                "content": result.content or None,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments or {}, default=str),
                        },
                    }
                    for tc in result.tool_calls
                ],
            })

            # Append tool responses for each call
            for tc, outcome, _ in exec_results:
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(outcome, default=str),
                })

        # Max tool rounds reached or finished all tool executions → stream final summary
        yield self._sse("state", {"state": "streaming"})
        async for chunk in provider.stream(messages):
            if chunk:
                yield self._sse("text", {"content": chunk})

    def _sse(self, event: str, data: dict[str, Any]) -> SseEvent:
        payload = dict(data)
        payload.setdefault("type", event)
        return {"event": event, "data": json.dumps(payload)}
