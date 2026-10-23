from dataclasses import dataclass, field

from .context_optimizer import ContextOptimizer, ContextSource


@dataclass
class BudgetState:
    total_window: int
    used_tokens: int
    utilization_pct: float
    breakdown: dict[str, int]
    remaining_budget: int
    estimated_cost: float
    optimization_opportunities: list[str] = field(default_factory=list)


_DEFAULT_PRICING = {
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4": (30.00, 60.00),
    "claude-sonnet-4-20250514": (3.00, 15.00),
    "claude-haiku-3-20240307": (0.25, 1.25),
}


class ContextBudgetManager:
    def __init__(self, model: str = "gpt-4o", provider_pricing: dict | None = None):
        self.model = model
        self.pricing = {**_DEFAULT_PRICING, **(provider_pricing or {})}
        self.optimizer = ContextOptimizer(model=model)

    def estimate_cost(self, prompt_tokens: int, completion_tokens_estimate: int = 0) -> float:
        input_rate, output_rate = self.pricing.get(self.model, (2.50, 10.00))
        input_cost = (prompt_tokens / 1_000_000) * input_rate
        output_cost = (completion_tokens_estimate / 1_000_000) * output_rate
        return round(input_cost + output_cost, 6)

    def calculate(self, sources: list[ContextSource]) -> BudgetState:
        total_used = sum(s.token_count or self.optimizer.count_tokens(s.content) for s in sources)
        remaining = self.optimizer.max_tokens - total_used
        breakdown = {s.name: s.token_count or self.optimizer.count_tokens(s.content) for s in sources}
        utilization = (total_used / self.optimizer.max_tokens * 100) if self.optimizer.max_tokens > 0 else 0.0
        cost = self.estimate_cost(total_used)
        opportunities: list[str] = []
        if utilization > 80:
            opportunities.append("Consider reducing low-priority context sources")
        if utilization > 90:
            opportunities.append("Budget near capacity — truncation may affect quality")
        return BudgetState(
            total_window=self.optimizer.max_tokens,
            used_tokens=total_used,
            utilization_pct=utilization,
            breakdown=breakdown,
            remaining_budget=max(0, remaining),
            estimated_cost=cost,
            optimization_opportunities=opportunities,
        )
