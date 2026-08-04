package focusengine

import (
	"math"
	"strings"
	"time"

	"github.com/Ijon6k/Taskure/apps/api/internal/models"
)

// CalendarDayDiff returns the number of whole calendar days between now and
// target, resolved in loc (the client's timezone). A negative value means the
// target lies in the past relative to now. Calendar-day granularity keeps the
// comparison stable across DST boundaries and matches how users think about
// "due today".
func CalendarDayDiff(target *time.Time, now time.Time, loc *time.Location) int {
	if target == nil {
		return 0
	}
	if loc == nil {
		loc = time.UTC
	}
	nowInTz := now.In(loc)
	targetInTz := target.In(loc)

	nowDate := time.Date(nowInTz.Year(), nowInTz.Month(), nowInTz.Day(), 0, 0, 0, 0, loc)
	targetDate := time.Date(targetInTz.Year(), targetInTz.Month(), targetInTz.Day(), 0, 0, 0, 0, loc)

	return int(math.Round(targetDate.Sub(nowDate).Hours() / 24.0))
}

// CalendarDayDiffNow is a convenience wrapper around CalendarDayDiff that
// treats now as the reference instant.
func CalendarDayDiffNow(target *time.Time, now time.Time, loc *time.Location) int {
	return CalendarDayDiff(target, now, loc)
}

// DeadlineUtility returns the normalized utility of a future due date using
// exponential decay:
//
//	DeadlineUtility = exp(-λ_deadline × remainingDays)
//
// remainingDays counts whole calendar days until the due date. Tasks due today
// (remainingDays == 0) receive 1.0; the utility decays continuously as the
// deadline recedes, modeling the psychophysical finding that human perceived
// urgency grows exponentially (not linearly) as a deadline approaches
// (Kahneman & Tversky; Prospect Theory). Tasks without a due date yield 0.0 so
// they are never penalized for missing a deadline they do not have.
func DeadlineUtility(dueDate *time.Time, now time.Time, loc *time.Location, lambda float64) float64 {
	if dueDate == nil {
		return 0.0
	}
	diffDays := CalendarDayDiff(dueDate, now, loc)
	if diffDays < 0 {
		return 0.0
	}
	if lambda <= 0 {
		lambda = 0.3
	}
	return math.Exp(-lambda * float64(diffDays))
}

// OverdueUtility returns the normalized urgency of an overdue task using a
// saturating exponential:
//
//	OverdueUtility = 1 + (1 - exp(-λ_overdue × overdueDays))
//
// The first overdue day adds a large jump (1.0 → 1.39 with λ=0.35), then the
// function asymptotically approaches 2.0. This embodies diminishing marginal
// urgency: 100 overdue days is not 100× more important than 10 overdue days.
func OverdueUtility(dueDate *time.Time, now time.Time, loc *time.Location, lambda float64) float64 {
	if dueDate == nil {
		return 0.0
	}
	diffDays := CalendarDayDiff(dueDate, now, loc)
	if diffDays >= 0 {
		return 0.0
	}
	if lambda <= 0 {
		lambda = 0.35
	}
	overdueDays := float64(-diffDays)
	return 1.0 + (1.0 - math.Exp(-lambda*overdueDays))
}

// PriorityUtility maps an ordinal priority label onto a normalized utility in
// [0.0, 1.0]. The mapping is fully configurable through FocusEngineConfig.
// Unknown or empty labels resolve to the lowest utility (0.0), never to a
// high value, so unlabeled tasks cannot dominate the ranking by accident.
func PriorityUtility(priority string, mapping map[string]float64) float64 {
	if len(mapping) == 0 {
		mapping = DefaultConfig().PriorityMapping
	}
	key := strings.ToLower(strings.TrimSpace(priority))
	if v, ok := mapping[key]; ok {
		return v
	}
	return 0.0
}

// RecencyUtility returns the normalized attention for a task that has been
// untouched for inactiveDays, using exponential growth toward 1.0:
//
//	RecencyUtility = 1 - exp(-λ_recency × inactiveDays)
//
// A task updated today has 0.0 utility; attention grows monotonically and
// saturates as the task ages. A zero (zero-value) UpdatedAt — common for
// freshly created rows — is treated as inactive from now so a brand-new task
// is not unfairly ignored; callers that need strict neutrality can pass a
// zero UpdatedAt and expect the neutral 0.0 only when inactiveDays resolves
// to zero.
func RecencyUtility(updatedAt time.Time, now time.Time, lambda float64) float64 {
	if updatedAt.IsZero() {
		return 0.0
	}
	elapsed := now.Sub(updatedAt)
	if elapsed < 0 {
		elapsed = 0
	}
	inactiveDays := elapsed.Hours() / 24.0
	if lambda <= 0 {
		lambda = 0.15
	}
	return 1.0 - math.Exp(-lambda*inactiveDays)
}

// ChecklistUtility returns the fraction of checklist items that remain
// uncompleted:
//
//	ChecklistUtility = 1 - (completed / total)
//
// This is the proportion of remaining work, normalized to [0.0, 1.0]. A task
// with zero checklist items has no measurable subtask progress signal, so it
// returns 0.0 (no bonus for empty checklists).
func ChecklistUtility(checklist []models.ChecklistItem) float64 {
	total := len(checklist)
	if total == 0 {
		return 0.0
	}
	completed := 0
	for _, item := range checklist {
		if item.IsCompleted {
			completed++
		}
	}
	return 1.0 - (float64(completed) / float64(total))
}

// FinishBonus returns the Goal-Gradient bonus for work that is nearly done:
//
//	FinishBonus = sqrt(progress)
//
// where progress = completed / total. Root scaling rewards near-completion
// (Goal Gradient Effect — Hull, 1932; Kivetz, Urminsky & Zheng, 2006) while
// keeping the bonus sub-linear so it never dominates the aggregate score.
// The bonus is only applied when the checklist is non-empty; an empty or
// fully-completed checklist yields 0.0.
func FinishBonus(checklist []models.ChecklistItem) float64 {
	total := len(checklist)
	if total == 0 {
		return 0.0
	}
	completed := 0
	for _, item := range checklist {
		if item.IsCompleted {
			completed++
		}
	}
	if completed == 0 {
		return 0.0
	}
	progress := float64(completed) / float64(total)
	return math.Sqrt(progress)
}

// FeatureVector holds the six normalized decision criteria for one task. Every
// element is in [0.0, 1.0] (OverdueUtility is in [1.0, 2.0] by design — see
// OverdueUtility), so the aggregation layer can combine them with weights
// without any domain knowledge.
type FeatureVector struct {
	Deadline    float64
	Overdue     float64
	Priority    float64
	Recency     float64
	Checklist   float64
	FinishBonus float64
}

// ExtractFeatures is the Feature Extraction layer of the pipeline: it converts
// a raw task (plus its time context) into the normalized decision features.
// This function has no knowledge of weights or aggregation.
func ExtractFeatures(task models.Task, now time.Time, loc *time.Location, cfg FocusEngineConfig) FeatureVector {
	return FeatureVector{
		Deadline:    DeadlineUtility(task.DueDate, now, loc, cfg.DeadlineLambda),
		Overdue:     OverdueUtility(task.DueDate, now, loc, cfg.OverdueLambda),
		Priority:    PriorityUtility(task.Priority, cfg.PriorityMapping),
		Recency:     RecencyUtility(task.UpdatedAt, now, cfg.RecencyLambda),
		Checklist:   ChecklistUtility(task.ChecklistItems),
		FinishBonus: FinishBonus(task.ChecklistItems),
	}
}

// Aggregate applies the Weighted Sum Model (WSM) to a FeatureVector:
//
//	FinalScore = Wd·Deadline + Wo·Overdue + Wp·Priority + Wr·Recency
//	            + Wc·Checklist + Wf·FinishBonus
//
// The result is not normalized to [0.0, 1.0] because OverdueUtility's [1.0, 2.0]
// range is a deliberate mathematical choice (see OverdueUtility); the
// aggregation layer knows nothing about deadlines or priorities. Its only
// responsibility is a weighted sum of whatever features it receives.
func Aggregate(fv FeatureVector, w Weights) float64 {
	return w.Deadline*fv.Deadline +
		w.Overdue*fv.Overdue +
		w.Priority*fv.Priority +
		w.Recency*fv.Recency +
		w.Checklist*fv.Checklist +
		w.FinishBonus*fv.FinishBonus
}

// ComputeAggregateScore is the top-level scoring entry point. It runs the full
// pipeline:
//
//	Feature Extraction → Weighted Sum Aggregation
//
// The result is a deterministic, configurable composite score used by the
// ranking layer. It never mutates the task and never applies business rules.
func ComputeAggregateScore(task models.Task, now time.Time, loc *time.Location, cfg FocusEngineConfig) float64 {
	return Aggregate(ExtractFeatures(task, now, loc, cfg), cfg.Weights)
}
