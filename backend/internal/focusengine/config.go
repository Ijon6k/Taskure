// Package focusengine implements the Multi-Criteria Decision Engine (MCDE)
// that deterministically ranks tasks for the user's daily focus.
//
// Architecture pipeline:
//
//	Task → Feature Extraction → Utility Functions → WSM Aggregation → Tie-Breaking → Result
//
// All parameters are exposed through FocusEngineConfig so the engine can be
// calibrated without modifying any business logic.
package focusengine

// Weights defines the contribution of each decision criterion to the final
// aggregate score. All weights must sum to 1.0.
type Weights struct {
	Deadline    float64
	Overdue     float64
	Priority    float64
	Recency     float64
	Checklist   float64
	FinishBonus float64
}

// FocusEngineConfig holds every tunable parameter of the MCDE pipeline.
// Exposing these values through configuration (environment variables, config
// file, etc.) allows calibration without code changes.
type FocusEngineConfig struct {
	Weights Weights

	// DeadlineLambda is the exponential decay coefficient for future deadlines.
	// Higher values cause urgency to decay more rapidly as the deadline moves
	// further into the future.
	DeadlineLambda float64

	// OverdueLambda is the exponential decay coefficient for overdue saturation.
	// Higher values cause the overdue penalty to saturate faster.
	OverdueLambda float64

	// RecencyLambda is the exponential growth coefficient for inactivity.
	// Higher values cause inactive tasks to gain attention more quickly.
	RecencyLambda float64

	// PriorityMapping converts ordinal priority labels into normalized utility
	// values in [0.0, 1.0]. Values are derived from Utility Theory — equal
	// spacing between ordinal levels is the default assumption when no
	// additional preference information is available (Laplace's principle of
	// indifference applied to ordinal utility).
	PriorityMapping map[string]float64
}

// DefaultConfig returns a scientifically calibrated configuration.
//
// Lambda selection rationale:
//
//	DeadlineLambda = 0.30  →  ln(2)/0.30 ≈ 2.3 days half-life
//	  (urgency halves every ~2.3 days; vanishes at ~14 days)
//	OverdueLambda  = 0.35  →  ln(2)/0.35 ≈ 2.0 days half-life to saturation
//	  (overdue penalty doubles in the first ~2 days, saturates by ~10 days)
//	RecencyLambda  = 0.15  →  ln(2)/0.15 ≈ 4.6 days half-life
//	  (inactivity attention grows to 50% at ~4.6 days, 90% at ~15 days)
//
// Weight rationale (sum = 1.0):
//
//	Deadline  = 0.35 — empirically the strongest predictor of task urgency
//	Overdue   = 0.20 — overdue tasks compete with near-deadline tasks
//	Priority  = 0.20 — user-declared importance is a strong signal
//	Recency   = 0.10 — gentle nudge for neglected tasks
//	Checklist = 0.10 — subtask progress adds task-level granularity
//	Finish    = 0.05 — Goal Gradient Effect (Hull, 1932): small bonus for
//	                     nearly-complete work without dominating ranking
func DefaultConfig() FocusEngineConfig {
	return FocusEngineConfig{
		Weights: Weights{
			Deadline:    0.35,
			Overdue:     0.20,
			Priority:    0.20,
			Recency:     0.10,
			Checklist:   0.10,
			FinishBonus: 0.05,
		},
		DeadlineLambda: 0.30,
		OverdueLambda:  0.35,
		RecencyLambda:  0.15,
		PriorityMapping: map[string]float64{
			"urgent": 1.00,
			"high":   0.75,
			"medium": 0.50,
			"low":    0.25,
			"none":   0.00,
		},
	}
}
