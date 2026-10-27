from dataclasses import dataclass
from enum import Enum
from typing import Any

from ..types import ToolSchema


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ToolDomain(Enum):
    TASK = "task"
    PROJECT = "project"
    COLUMN = "column"
    NOTEBOOK = "notebook"
    DISCUSSION = "discussion"
    JOURNAL = "journal"
    MEMORY = "memory"
    RAG = "rag"
    PLAN = "plan"


@dataclass
class ToolDefinition:
    name: str
    description: str
    domain: ToolDomain
    parameters: dict[str, Any]
    required: list[str]
    risk_level: RiskLevel

    @property
    def is_read_only(self) -> bool:
        return self.name.endswith(("_search", "_get", "_get_recent", "_get_synthesis", "_get_chunk", "_get_cache", "_get_board", "_get_section", "_get_summary"))


_READ_ONLY_RISK = RiskLevel.LOW
_WRITE_RISK = RiskLevel.MEDIUM
_DESTRUCTIVE_RISK = RiskLevel.HIGH


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, ToolDefinition] = {}
        self._register_defaults()

    def _t(
        self, name: str, desc: str, domain: ToolDomain,
        params: dict[str, Any], required: list[str], risk: RiskLevel,
    ):
        self._tools[name] = ToolDefinition(
            name=name, description=desc, domain=domain,
            parameters=params, required=required, risk_level=risk,
        )

    def _register_defaults(self):
        obj = {"type": "object", "properties": {"project_id": {"type": "string"}}}
        q_obj = {"type": "object", "properties": {
            "project_id": {"type": "string"}, "query": {"type": "string"},
        }}

        self._t("task_search", "Search tasks by query", ToolDomain.TASK, q_obj, ["project_id", "query"], _READ_ONLY_RISK)
        self._t("task_get", "Get a task by ID including its checklist subtasks", ToolDomain.TASK, {"type": "object", "properties": {"task_id": {"type": "string"}}}, ["task_id"], _READ_ONLY_RISK)
        self._t("task_create", "Create a new task with optional subtasks", ToolDomain.TASK, {"type": "object", "properties": {"project_id": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}, "column_id": {"type": "string"}, "priority": {"type": "string"}, "subtasks": {"type": "array", "items": {"type": "string"}, "description": "Optional list of subtask checklist items to add directly to this task"}}}, ["project_id", "title"], _WRITE_RISK)
        self._t("task_add_subtask", "Add a checklist subtask to an existing task", ToolDomain.TASK, {"type": "object", "properties": {"task_id": {"type": "string"}, "title": {"type": "string"}}}, ["task_id", "title"], _WRITE_RISK)
        self._t("task_update_subtask", "Update a checklist subtask (title or completion status)", ToolDomain.TASK, {"type": "object", "properties": {"subtask_id": {"type": "string"}, "title": {"type": "string"}, "is_completed": {"type": "boolean"}}}, ["subtask_id"], _WRITE_RISK)
        self._t("task_delete_subtask", "Delete a checklist subtask from a task", ToolDomain.TASK, {"type": "object", "properties": {"subtask_id": {"type": "string"}}}, ["subtask_id"], _WRITE_RISK)
        self._t("task_update", "Update an existing task", ToolDomain.TASK, {"type": "object", "properties": {"task_id": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}, "priority": {"type": "string"}}}, ["task_id"], _WRITE_RISK)
        self._t("task_move", "Move a task to another column", ToolDomain.TASK, {"type": "object", "properties": {"task_id": {"type": "string"}, "target_column_id": {"type": "string"}}}, ["task_id", "target_column_id"], _WRITE_RISK)
        self._t("task_delete", "Delete a task", ToolDomain.TASK, {"type": "object", "properties": {"task_id": {"type": "string"}}}, ["task_id"], RiskLevel.CRITICAL)

        self._t("project_search", "Search projects", ToolDomain.PROJECT, q_obj, ["query"], _READ_ONLY_RISK)
        self._t("project_get", "Get project details", ToolDomain.PROJECT, obj, ["project_id"], _READ_ONLY_RISK)
        self._t("project_get_board", "Get full project board", ToolDomain.PROJECT, obj, ["project_id"], _READ_ONLY_RISK)
        self._t("project_update", "Update project settings", ToolDomain.PROJECT, {"type": "object", "properties": {"project_id": {"type": "string"}, "name": {"type": "string"}, "description": {"type": "string"}}}, ["project_id"], _WRITE_RISK)
        self._t("project_clear_board", "Clear all tasks and columns in project in one atomic call", ToolDomain.PROJECT, obj, ["project_id"], RiskLevel.CRITICAL)

        self._t("column_search", "Search columns", ToolDomain.COLUMN, q_obj, ["project_id", "query"], _READ_ONLY_RISK)
        self._t("column_get", "Get column details", ToolDomain.COLUMN, {"type": "object", "properties": {"column_id": {"type": "string"}}}, ["column_id"], _READ_ONLY_RISK)
        self._t("column_create", "Create a new column with optional color", ToolDomain.COLUMN, {"type": "object", "properties": {"project_id": {"type": "string"}, "name": {"type": "string"}, "color": {"type": "string", "description": "Hex color code e.g. #8B5CF6, #3B82F6, #10B981, #F59E0B, #EC4899, #06B6D4"}, "position": {"type": "integer"}}}, ["project_id", "name"], _WRITE_RISK)
        self._t("column_update", "Update a column name or color", ToolDomain.COLUMN, {"type": "object", "properties": {"column_id": {"type": "string"}, "name": {"type": "string"}, "color": {"type": "string", "description": "Hex color code e.g. #8B5CF6, #3B82F6, #10B981, #F59E0B, #EC4899, #06B6D4"}}}, ["column_id"], _WRITE_RISK)
        self._t("column_delete", "Delete a column", ToolDomain.COLUMN, {"type": "object", "properties": {"column_id": {"type": "string"}}}, ["column_id"], RiskLevel.CRITICAL)

        self._t("notebook_search", "Search notebooks or list all pages (empty query returns all)", ToolDomain.NOTEBOOK, q_obj, ["project_id"], _READ_ONLY_RISK)
        self._t("notebook_get", "Get a notebook", ToolDomain.NOTEBOOK, {"type": "object", "properties": {"notebook_id": {"type": "string"}}}, ["notebook_id"], _READ_ONLY_RISK)
        self._t("notebook_create", "Create a new notebook page with title and optional content", ToolDomain.NOTEBOOK, {"type": "object", "properties": {"project_id": {"type": "string"}, "title": {"type": "string"}, "content": {"type": "string"}}}, ["project_id", "title"], _WRITE_RISK)
        self._t("notebook_update", "Update a notebook page (title/content)", ToolDomain.NOTEBOOK, {"type": "object", "properties": {"notebook_id": {"type": "string"}, "title": {"type": "string"}, "content": {"type": "string"}}}, ["notebook_id"], _WRITE_RISK)
        self._t("notebook_delete", "Delete a notebook page", ToolDomain.NOTEBOOK, {"type": "object", "properties": {"notebook_id": {"type": "string"}}}, ["notebook_id"], RiskLevel.CRITICAL)

        self._t("journal_get_recent", "Get recent journal entries", ToolDomain.JOURNAL, {"type": "object", "properties": {"project_id": {"type": "string"}, "limit": {"type": "integer"}}}, ["project_id"], _READ_ONLY_RISK)
        self._t("journal_get_synthesis", "Get journal synthesis", ToolDomain.JOURNAL, {"type": "object", "properties": {"project_id": {"type": "string"}, "period": {"type": "string"}}}, ["project_id"], _READ_ONLY_RISK)

        self._t("memory_get", "Get project memory", ToolDomain.MEMORY, obj, ["project_id"], _READ_ONLY_RISK)
        self._t("memory_update", "Update project memory", ToolDomain.MEMORY, {"type": "object", "properties": {"project_id": {"type": "string"}, "updates": {"type": "object"}}}, ["project_id", "updates"], _WRITE_RISK)

        self._t("rag_search", "Search project context via RAG", ToolDomain.RAG, {"type": "object", "properties": {"project_id": {"type": "string"}, "query": {"type": "string"}, "top_k": {"type": "integer"}}}, ["project_id", "query"], _READ_ONLY_RISK)
        self._t("rag_get_chunk", "Get a specific RAG chunk", ToolDomain.RAG, {"type": "object", "properties": {"chunk_id": {"type": "string"}}}, ["chunk_id"], _READ_ONLY_RISK)

        self._t("plan_get_cache", "Get cached plan", ToolDomain.PLAN, obj, ["project_id"], _READ_ONLY_RISK)
        self._t("plan_save_cache", "Save plan to cache", ToolDomain.PLAN, {"type": "object", "properties": {"project_id": {"type": "string"}, "plan": {"type": "object"}}}, ["project_id", "plan"], _WRITE_RISK)

        self._t(
            "kanban_generate_plan",
            "Generate a full kanban board using Line-Based Compact DSL. Format plan_dsl string using lines: 'COL: <Column Name>', 'TASK: <priority> | <title> | <description>', and optional 'SUB: <subtask checklist>'. Extremely fast & token-efficient.",
            ToolDomain.PLAN,
            {"type": "object", "properties": {
                "project_id": {"type": "string"},
                "plan_dsl": {"type": "string", "description": "Compact Line-Based DSL string with COL:, TASK:, and SUB: lines"},
                "phases": {"type": "array", "description": "Optional fallback JSON array of phases with tasks and optional subtasks array"},
            }},
            ["project_id"],
            _WRITE_RISK,
        )

    def get_tools_for_mode(self, mode: str) -> list[ToolDefinition]:
        if mode == "fast":
            return []
        all_tools = list(self._tools.values())
        if mode == "thinking":
            return [t for t in all_tools if t.is_read_only]
        if mode == "planning":
            return [t for t in all_tools if t.risk_level != RiskLevel.CRITICAL]
        return all_tools

    def to_openai_format(self, tools: list[ToolDefinition]) -> list[ToolSchema]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": {
                        **t.parameters,
                        "required": t.required,
                    },
                },
            }
            for t in tools
        ]

    def to_anthropic_format(self, tools: list[ToolDefinition]) -> list[ToolSchema]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": {
                    **t.parameters,
                    "required": t.required,
                },
            }
            for t in tools
        ]
