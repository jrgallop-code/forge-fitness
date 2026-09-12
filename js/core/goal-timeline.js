const MIN_RATE = 0.005;
const GOAL_TOLERANCE_LB = 0.05;

/**
 * Build the optimistic goal-weight projection shown throughout the app.
 * All weights and rates use Level Up's canonical pounds; presentation layers
 * are responsible for converting them to the user's selected display unit.
 */
export function calculateGoalTimeline({ startWeight, currentWeight, goalWeight, selectedRateLbPerWeek, today = new Date() } = {}) {
    const start = finite(startWeight);
    const current = finite(currentWeight);
    const goal = finite(goalWeight);
    const rate = finite(selectedRateLbPerWeek);

    if (![start, current, goal].every(value => Number.isFinite(value) && value > 0)) {
        return emptyTimeline("missing_weight");
    }

    const totalDistance = Math.abs(goal - start);
    const direction = Math.sign(goal - start) || Math.sign(goal - current);
    const remainingSigned = goal - current;
    const remaining = Math.abs(remainingSigned);
    const reached = remaining <= GOAL_TOLERANCE_LB || (direction > 0 && current >= goal) || (direction < 0 && current <= goal);
    const percent = totalDistance <= GOAL_TOLERANCE_LB
        ? reached ? 100 : 0
        : clamp(((current - start) * direction) / totalDistance * 100, 0, 100);

    const base = {
        status: "scheduled",
        ready: true,
        startWeight: start,
        currentWeight: current,
        goalWeight: goal,
        selectedRateLbPerWeek: rate,
        remainingLb: reached ? 0 : remaining,
        percent,
        weeks: null,
        estimatedDate: null
    };

    if (reached) return { ...base, status: "reached", percent: 100, weeks: 0, estimatedDate: localDateKey(today) };
    if (!Number.isFinite(rate)) return { ...base, status: "rate_missing" };
    if (Math.abs(rate) < MIN_RATE) return { ...base, status: "maintenance" };
    if (Math.sign(rate) !== Math.sign(remainingSigned)) return { ...base, status: "wrong_direction" };

    const exactWeeks = remaining / Math.abs(rate);
    const days = Math.max(1, Math.ceil(exactWeeks * 7));
    const estimated = safeDate(today);
    estimated.setDate(estimated.getDate() + days);

    return {
        ...base,
        weeks: Math.ceil(exactWeeks),
        estimatedDate: localDateKey(estimated)
    };
}

function emptyTimeline(status) {
    return {
        status,
        ready: false,
        startWeight: null,
        currentWeight: null,
        goalWeight: null,
        selectedRateLbPerWeek: null,
        remainingLb: null,
        percent: 0,
        weeks: null,
        estimatedDate: null
    };
}

function finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function safeDate(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    return Number.isFinite(date.getTime()) ? date : new Date();
}

function localDateKey(value) {
    const date = safeDate(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
