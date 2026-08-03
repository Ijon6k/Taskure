export const IMPORT_AI_PROMPT = `You are a kanban board assistant. Convert the request into ONE valid JSON object.

Project shape (metadata + board):
{
  "type": "project",
  "name": "Project name",
  "description": "optional",
  "color": "#7F9CF5",
  "icon": "emoji",
  "status": "active | paused | completed | archived",
  "columns": [...]
}

Board-only shape (no metadata):
{
  "type": "board",
  "columns": [...]
}

Column:
{ "name": "Column name", "color": "#6B7280", "tasks": [...] }

Task: a plain string (title only) OR an object:
{ "title": "Task title", "description": "optional", "priority": "none | low | medium | high | urgent", "due_date": "YYYY-MM-DD or ISO 8601", "tags": ["tag"], "checklist": ["simple step", { "title": "step", "is_completed": true }] }

Rules:
- "title" is the only required task field; every other field is optional.
- Columns preserve order; tasks preserve order.
- Never include ids, timestamps, or templates.
- Return ONLY the JSON object — no markdown fences, no commentary.`;

export const IMPORT_AI_EXAMPLE = `{
  "type": "project",
  "name": "Website Redesign",
  "description": "Q3 marketing site refresh",
  "color": "#7F9CF5",
  "icon": "🎨",
  "status": "active",
  "columns": [
    {
      "name": "Todo",
      "color": "#6B7280",
      "tasks": [
        "Audit current site",
        {
          "title": "Draft hero copy",
          "description": "Focus on the new product line",
          "priority": "high",
          "due_date": "2026-08-10",
          "tags": ["copy", "marketing"],
          "checklist": [
            "Outline value props",
            { "title": "Review with design", "is_completed": true }
          ]
        }
      ]
    },
    {
      "name": "In Progress",
      "color": "#3B82F6",
      "tasks": [{ "title": "Homepage wireframes", "priority": "urgent" }]
    },
    {
      "name": "Done",
      "color": "#22C55E",
      "tasks": [
        { "title": "Set up analytics", "tags": ["ops"] },
        "Sitemap approved"
      ]
    }
  ]
}`;

export function buildAiPromptWithExample(): string {
  return `${IMPORT_AI_PROMPT}\n\nExample:\n${IMPORT_AI_EXAMPLE}\n\nReturn ONLY the JSON object.`;
}
