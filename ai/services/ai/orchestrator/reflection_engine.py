from dataclasses import dataclass
from typing import Any

from ..providers.base import BaseProvider
from ..services.prompt_registry import PromptRegistry


@dataclass
class ReflectionConfig:
    max_iterations: int
    quality_threshold: int
    timeout_seconds: int


@dataclass
class ReflectionResult:
    score: int
    gaps: list[str]
    improvements: list[str]
    final_output: Any
    iterations: int
    passed: bool


class ReflectionEngine:
    def __init__(self, provider: BaseProvider, prompt_registry: PromptRegistry):
        self.provider = provider
        self.registry = prompt_registry

    async def reflect(
        self, goal: str, config: ReflectionConfig
    ) -> ReflectionResult:
        plan = await self._plan(goal)
        results: list[Any] = []

        for i in range(config.max_iterations):
            for step in plan:
                output = await self._generate(step)
                results.append(output)

            merged = await self._merge(results)
            score, gaps = await self._evaluate(merged, goal)

            if score >= config.quality_threshold:
                return ReflectionResult(
                    score=score, gaps=[], improvements=[],
                    final_output=merged, iterations=i + 1, passed=True,
                )

            if i < config.max_iterations - 1:
                improved = await self._improve(merged, gaps, goal)
                results = [improved]

        final = await self._merge(results)
        final_score, final_gaps = await self._evaluate(final, goal)
        return ReflectionResult(
            score=final_score, gaps=final_gaps, improvements=[],
            final_output=final, iterations=config.max_iterations,
            passed=final_score >= config.quality_threshold,
        )

    async def _plan(self, goal: str) -> list[dict[str, Any]]:
        result = await self.provider.complete([
            {"role": "system", "content": _PLAN_SYSTEM},
            {"role": "user", "content": f"Decompose this goal into ordered steps:\n{goal}\n\nReturn each step as 'name' and 'description'."},
        ])
        steps: list[dict[str, Any]] = []
        for line in result.content.strip().split("\n"):
            line = line.strip()
            if line and (":" in line or "- " in line):
                parts = line.split(":", 1) if ":" in line else line.split("- ", 1)
                if len(parts) == 2:
                    steps.append({"name": parts[0].strip("- ").strip(), "description": parts[1].strip()})
        return steps if steps else [{"name": "execute", "description": goal}]

    async def _generate(self, step: dict[str, Any]) -> Any:
        result = await self.provider.complete([
            {"role": "system", "content": _GENERATE_SYSTEM},
            {"role": "user", "content": f"Execute step: {step['name']}\nDescription: {step['description']}"},
        ])
        return result.content

    async def _evaluate(self, output: Any, goal: str) -> tuple[int, list[str]]:
        result = await self.provider.complete([
            {"role": "system", "content": _EVAL_SYSTEM},
            {"role": "user", "content": f"Goal: {goal}\n\nOutput to evaluate:\n{output}\n\nReturn: SCORE=<0-100>\nGAPS=<comma separated list>"},
        ])
        content = result.content
        score = 50
        gaps: list[str] = []
        for line in content.split("\n"):
            line = line.strip()
            if line.upper().startswith("SCORE="):
                try:
                    score = int(line.split("=", 1)[1].strip())
                except ValueError:
                    pass
            elif line.upper().startswith("GAPS="):
                gaps = [g.strip() for g in line.split("=", 1)[1].split(",") if g.strip()]
        score = max(0, min(100, score))
        return score, gaps

    async def _improve(self, output: Any, gaps: list[str], goal: str) -> Any:
        gaps_text = "\n".join(f"- {g}" for g in gaps)
        result = await self.provider.complete([
            {"role": "system", "content": _IMPROVE_SYSTEM},
            {"role": "user", "content": f"Goal: {goal}\n\nCurrent output:\n{output}\n\nGaps to fix:\n{gaps_text}\n\nReturn improved output."},
        ])
        return result.content

    async def _merge(self, results: list[Any]) -> Any:
        if len(results) == 1:
            return results[0]
        combined = "\n\n---\n\n".join(str(r) for r in results)
        result = await self.provider.complete([
            {"role": "system", "content": _MERGE_SYSTEM},
            {"role": "user", "content": f"Merge these outputs into a single coherent result:\n{combined}"},
        ])
        return result.content


_PLAN_SYSTEM = "You are a planning assistant. Decompose goals into ordered, actionable steps. Return each step as a line with 'name: description' format."
_GENERATE_SYSTEM = "You are an execution assistant. Execute the given step and return the result."
_EVAL_SYSTEM = "You are an evaluation assistant. Score the output against the goal (0-100) and identify specific gaps. Return SCORE=<0-100> and GAPS=<list>."
_IMPROVE_SYSTEM = "You are an improvement assistant. Fix the gaps in the output to better meet the goal."
_MERGE_SYSTEM = "You are a synthesis assistant. Merge multiple outputs into one coherent result."
