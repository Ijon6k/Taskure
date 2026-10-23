import hashlib
import json
import time


class PlanningCache:
    def __init__(self, ttl_hours: int = 24):
        self._cache: dict[str, dict] = {}
        self._project_keys: dict[str, set[str]] = {}
        self._ttl = ttl_hours * 3600

    def compute_state_hash(self, entities_last_modified: dict) -> str:
        data = json.dumps(entities_last_modified, sort_keys=True)
        return hashlib.sha256(data.encode()).hexdigest()

    def compute_request_hash(
        self, project_id: str, mode: str, request: str, state_hash: str
    ) -> str:
        data = f"{project_id}:{mode}:{request}:{state_hash}"
        return hashlib.sha256(data.encode()).hexdigest()

    def get(self, cache_key: str) -> dict | None:
        entry = self._cache.get(cache_key)
        if entry is None:
            return None
        if time.time() - entry["cached_at"] > self._ttl:
            self._remove(cache_key)
            return None
        return entry["result"]

    def set(self, cache_key: str, result: dict, project_id: str | None = None):
        self._cache[cache_key] = {"result": result, "cached_at": time.time()}
        if project_id:
            self._project_keys.setdefault(project_id, set()).add(cache_key)

    def invalidate_project(self, project_id: str):
        keys = self._project_keys.pop(project_id, set())
        for k in keys:
            self._cache.pop(k, None)

    def cleanup_expired(self):
        now = time.time()
        expired = [k for k, v in self._cache.items() if now - v["cached_at"] > self._ttl]
        for k in expired:
            self._remove(k)

    def _remove(self, key: str):
        self._cache.pop(key, None)
        for pkeys in self._project_keys.values():
            pkeys.discard(key)
