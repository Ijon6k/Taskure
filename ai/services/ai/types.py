"""Shared type aliases for the AI service.

Centralizing these keeps provider/agent code readable and silences Pyright's
"Expected type arguments for generic class" cascade on bare ``dict`` / ``list``.
"""

from typing import Any

# A single chat message in OpenAI wire format (role/content/tool_calls/…).
Message = dict[str, Any]

# A list of chat messages exchanged with a provider.
Messages = list[Message]

# Tool definitions in OpenAI function-calling format.
ToolSchema = dict[str, Any]

# Arguments for a tool call (arbitrary JSON object).
ToolArguments = dict[str, Any]
