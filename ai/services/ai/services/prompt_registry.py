import re
import threading


class PromptRegistry:
    def __init__(self):
        self._lock = threading.Lock()
        self._templates: dict[str, str] = {}

    def _key(self, name: str, version: int | None) -> str:
        v = version if version is not None else self._latest_version(name)
        return f"{name}:v{v}"

    def _latest_version(self, name: str) -> int:
        versions = [
            int(k.split(":v")[1])
            for k in self._templates
            if k.startswith(f"{name}:v")
        ]
        return max(versions) if versions else 1

    def load(self, templates: list[dict]) -> None:
        with self._lock:
            for t in templates:
                key = f"{t['name']}:v{t['version']}"
                self._templates[key] = t["content"]

    def get(self, name: str, version: int | None = None) -> str:
        key = self._key(name, version)
        if key not in self._templates:
            available = [k for k in self._templates if k.startswith(f"{name}:v")]
            raise KeyError(f"Template '{name}' not found. Available: {available}")
        return self._templates[key]

    def render(self, name: str, variables: dict, version: int | None = None) -> str:
        template = self.get(name, version)
        for k, v in variables.items():
            template = template.replace(f"{{{{{k}}}}}", str(v))
        missing = re.findall(r"\{\{(\w+)\}\}", template)
        if missing:
            raise ValueError(f"Unresolved template variables: {missing}")
        return template
