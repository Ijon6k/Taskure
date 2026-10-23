import re
from dataclasses import dataclass

import tiktoken


@dataclass
class ContextSource:
    name: str
    content: str
    priority: int
    token_count: int = 0


@dataclass
class BudgetReport:
    total_window: int
    used_tokens: int
    utilization_pct: float
    breakdown: dict[str, int]
    remaining_budget: int
    estimated_cost: float


class ContextOptimizer:
    def __init__(self, model: str = "gpt-4o", max_tokens: int = 8000):
        self.model = model
        self.max_tokens = max_tokens
        # Custom/OpenRouter model names (e.g. "openai/gpt-oss-120b") are not
        # known to tiktoken — fall back to a safe default encoder instead of
        # crashing the whole stream.
        try:
            self.encoder = tiktoken.encoding_for_model(model)
        except KeyError:
            self.encoder = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        return len(self.encoder.encode(text))

    def _sentences(self, text: str) -> list[str]:
        return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    def _overlap_ratio(self, sentences_a: set[str], sentences_b: set[str]) -> float:
        if not sentences_b:
            return 0.0
        return len(sentences_a & sentences_b) / len(sentences_b)

    def deduplicate(self, sources: list[ContextSource]) -> list[ContextSource]:
        if not sources:
            return []
        seen_names: set[str] = set()
        kept: list[ContextSource] = []
        for src in sorted(sources, key=lambda s: s.priority):
            if src.name not in seen_names and src.content.strip():
                seen_names.add(src.name)
                kept.append(src)
        return kept

    def compress(self, source: ContextSource) -> ContextSource:
        content = source.content
        content = re.sub(r"\n{3,}", "\n\n", content)
        content = re.sub(r" {2,}", " ", content)
        lines = content.split("\n")
        seen: set[str] = set()
        deduped: list[str] = []
        for line in lines:
            stripped = line.strip()
            if stripped and stripped in seen:
                continue
            if stripped:
                seen.add(stripped)
            deduped.append(line)
        return ContextSource(
            name=source.name,
            content="\n".join(deduped),
            priority=source.priority,
            token_count=self.count_tokens("\n".join(deduped)),
        )

    def fit_budget(self, sources: list[ContextSource]) -> list[ContextSource]:
        total = sum(s.token_count or self.count_tokens(s.content) for s in sources)
        if total <= self.max_tokens:
            return sources
        sorted_src = sorted(sources, key=lambda s: s.priority, reverse=False)
        result: list[ContextSource] = []
        remaining = self.max_tokens
        for src in sorted_src:
            need = src.token_count or self.count_tokens(src.content)
            if need <= remaining:
                result.append(src)
                remaining -= need
            elif remaining > 50:
                encoded = self.encoder.encode(src.content)[:remaining]
                truncated = self.encoder.decode(encoded)
                result.append(ContextSource(
                    name=src.name, content=truncated,
                    priority=src.priority, token_count=remaining,
                ))
                remaining = 0
            else:
                break
        return sorted(result, key=lambda s: s.priority)

    def assemble(self, sources: list[ContextSource]) -> str:
        parts: list[str] = []
        for src in sorted(sources, key=lambda s: s.priority):
            parts.append(f"[{src.name}]\n{src.content}")
        return "\n\n".join(parts)

    def optimize(self, sources: list[ContextSource]) -> tuple[str, BudgetReport]:
        deduped = self.deduplicate(sources)
        compressed = [self.compress(s) for s in deduped]
        fitted = self.fit_budget(compressed)
        prompt = self.assemble(fitted)
        total_used = sum(s.token_count or self.count_tokens(s.content) for s in fitted)
        breakdown = {s.name: s.token_count or self.count_tokens(s.content) for s in fitted}
        utilization = (total_used / self.max_tokens * 100) if self.max_tokens > 0 else 0.0
        cost = self._est_cost(total_used)
        report = BudgetReport(
            total_window=self.max_tokens,
            used_tokens=total_used,
            utilization_pct=utilization,
            breakdown=breakdown,
            remaining_budget=self.max_tokens - total_used,
            estimated_cost=cost,
        )
        return prompt, report

    def _est_cost(self, prompt_tokens: int) -> float:
        rates: dict[str, tuple[float, float]] = {
            "gpt-4o": (2.50, 10.00),
            "gpt-4o-mini": (0.15, 0.60),
            "gpt-4": (30.00, 60.00),
        }
        price_per_m = rates.get(self.model, (2.50, 10.00))[0]
        return (prompt_tokens / 1_000_000) * price_per_m
