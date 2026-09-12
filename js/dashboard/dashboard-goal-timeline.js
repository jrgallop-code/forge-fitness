import { calculateGoalTimeline } from "../core/goal-timeline.js?v=goal-timeline-1";
import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const CURRENT_GOAL_KEY = "level_up_current_goal";
const LEGACY_GOAL_WEIGHT_KEY = "level_up_goal_weight";
const SCREEN_ID = "goal-timeline-screen";
const PHASE_LABELS = {
    fat_loss: "Fat Loss",
    lean_bulk: "Lean Bulk",
    muscle_gain: "Build Muscle",
    maintenance: "Maintenance",
    custom: "Custom Goal"
};

let returnFocus = null;

export function getGoalTimelineViewModel() {
    const today = localDateKey();
    const weights = normalizeWeightEntries(readJson(WEIGHT_KEY, []))
        .filter(entry => entry.date <= today);
    const trend = calculateVisibleWeightTrend(weights);
    const series = Array.isArray(trend.series) ? trend.series : [];
    const phase = activePhase();
    const currentGoal = readJson(CURRENT_GOAL_KEY, null);
    const current = firstPositive(trend.trendWeight, series.at(-1)?.weight, weights.at(-1)?.weight);
    const goal = firstPositive(
        phase?.goalWeight,
        phase?.targetWeight,
        currentGoal?.targetWeight,
        localStorage.getItem(LEGACY_GOAL_WEIGHT_KEY)
    );
    const storedStart = firstPositive(
        phase?.startingTrendWeight,
        phase?.startWeight,
        currentGoal?.startingTrendWeight
    );
    const nearestStart = nearestWeight(series, phase?.startDate || currentGoal?.startDate);
    const start = firstPositive(storedStart, nearestStart, weights[0]?.weight, current);
    const selectedRate = firstFinite(phase?.targetWeeklyRate, currentGoal?.targetRateLbPerWeek);
    const timeline = calculateGoalTimeline({
        startWeight: start,
        currentWeight: current,
        goalWeight: goal,
        selectedRateLbPerWeek: selectedRate,
        today: new Date(`${today}T12:00:00`)
    });

    return {
        ...timeline,
        configured: Number.isFinite(goal),
        phaseLabel: phase?.label || PHASE_LABELS[phase?.type] || PHASE_LABELS[currentGoal?.type] || "Current Goal",
        actualRateLbPerWeek: firstFinite(trend.weeklyChange),
        actualRateStatus: trend.status || "insufficient"
    };
}

export function goalTimelinePreviewMarkup(model = getGoalTimelineViewModel()) {
    if (!model.configured) return "";
    const headline = timelineHeadline(model, true);
    const supporting = timelineSupportingCopy(model);
    const percent = Number(model.percent || 0).toFixed(1);
    return `<button type="button" class="dashboard-preview-card dashboard-preview-goal" data-goal-timeline-open aria-label="Open goal timeline details"><span class="dashboard-preview-goal-head"><span><h3>Goal Timeline</h3><span class="sub">${escapeHtml(model.phaseLabel)}</span></span><span class="dashboard-preview-chevron dashboard-preview-goal-chevron">›</span></span><div class="dashboard-preview-goal-date"><small>Optimistic estimate</small><strong>${escapeHtml(headline)}</strong></div><div class="dashboard-preview-goal-visual"><div class="dashboard-preview-goal-track" aria-label="${Math.round(model.percent || 0)} percent of the way to goal"><span style="width:${percent}%"></span></div></div><div class="dashboard-preview-goal-foot"><span>${model.ready ? `${formatWeight(model.currentWeight)} → ${formatWeight(model.goalWeight)}` : supporting}</span><strong>${model.status === "scheduled" ? `~${model.weeks} wk` : "Details"}</strong></div></button>`;
}

export function openGoalTimeline(trigger = document.activeElement) {
    const model = getGoalTimelineViewModel();
    if (!model.configured) return;
    returnFocus = trigger instanceof HTMLElement ? trigger : null;
    document.getElementById(SCREEN_ID)?.remove();
    const screen = document.createElement("section");
    screen.id = SCREEN_ID;
    screen.className = "goal-timeline-screen";
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-labelledby", "goal-timeline-title");
    screen.innerHTML = detailMarkup(model);
    document.body.appendChild(screen);
    document.body.classList.add("goal-timeline-open");
    screen.querySelector("[data-goal-timeline-close]")?.focus();
}

export function closeGoalTimeline({ restoreFocus = true } = {}) {
    document.getElementById(SCREEN_ID)?.remove();
    document.body.classList.remove("goal-timeline-open");
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
}

function detailMarkup(model) {
    const date = timelineHeadline(model, false);
    const progress = Number(model.percent || 0).toFixed(1);
    const currentPosition = Math.min(100, Math.max(0, Number(model.percent || 0)));
    const actual = Number.isFinite(model.actualRateLbPerWeek)
        ? `${model.actualRateStatus === "preliminary" ? "Preliminary · " : ""}${formatRate(model.actualRateLbPerWeek)}`
        : "Calibrating";
    const weeks = model.status === "scheduled" ? `About ${model.weeks} week${model.weeks === 1 ? "" : "s"}` : timelineSupportingCopy(model);

    return `<header class="goal-timeline-header"><button type="button" data-goal-timeline-close aria-label="Close goal timeline">‹</button><div><small>${escapeHtml(model.phaseLabel)}</small><h2 id="goal-timeline-title">Goal Timeline</h2></div></header><main class="goal-timeline-body"><section class="goal-timeline-hero"><span>Estimated goal date</span><strong>${escapeHtml(date)}</strong><p>${escapeHtml(weeks)}</p><div class="goal-timeline-optimistic"><span aria-hidden="true">ⓘ</span><p><strong>Optimistic estimate</strong>This projection assumes your selected rate stays consistent. Plateaus, water-weight changes, missed targets, and future phase changes can move the date.</p></div></section><section class="goal-timeline-progress-card"><div class="goal-timeline-progress-head"><span>Progress to goal</span><strong>${Math.round(model.percent || 0)}%</strong></div><div class="goal-timeline-route" aria-label="${Math.round(model.percent || 0)} percent of the way from start weight to goal weight"><span class="goal-timeline-route-fill" style="width:${progress}%"></span><i class="goal-timeline-current-marker" style="left:${currentPosition}%"></i></div><div class="goal-timeline-route-labels"><span><small>Start</small><strong>${formatWeight(model.startWeight)}</strong></span><span class="current"><small>Current</small><strong>${formatWeight(model.currentWeight)}</strong></span><span><small>Goal</small><strong>${formatWeight(model.goalWeight)}</strong></span></div><div class="goal-timeline-remaining"><span>Remaining</span><strong>${formatWeight(model.remainingLb)}</strong></div></section><section class="goal-timeline-pace-card"><div><span>Selected pace</span><strong>${formatRate(model.selectedRateLbPerWeek)}</strong><small>Used for this estimate</small></div><div><span>Current trend</span><strong>${escapeHtml(actual)}</strong><small>${model.actualRateStatus === "actual" ? "Smoothed recent trend" : "Updates as weigh-ins build"}</small></div></section><button type="button" class="goal-timeline-edit" data-goal-timeline-edit>Edit goal &amp; pace</button></main>`;
}

function timelineHeadline(model, compact) {
    if (model.status === "scheduled") return formatDate(model.estimatedDate, compact);
    if (model.status === "reached") return "Goal reached";
    if (model.status === "rate_missing") return compact ? "Set a goal pace" : "Select a weekly pace";
    if (model.status === "maintenance") return compact ? "No target date" : "No date at maintenance";
    if (model.status === "wrong_direction") return compact ? "Review goal pace" : "Timeline needs attention";
    return compact ? "Add a weigh-in" : "More weight data needed";
}

function timelineSupportingCopy(model) {
    if (model.status === "reached") return "Your current trend weight has reached this goal.";
    if (model.status === "rate_missing") return "Select a weekly rate to calculate an estimated date.";
    if (model.status === "maintenance") return "Choose a non-zero weekly rate to calculate a date.";
    if (model.status === "wrong_direction") return "The selected rate points away from this goal weight.";
    return "A current and starting weight are needed to calculate a date.";
}

function refreshOpenTimeline() {
    const open = document.getElementById(SCREEN_ID);
    if (open) open.innerHTML = detailMarkup(getGoalTimelineViewModel());
}

function openGoalSettings() {
    closeGoalTimeline({ restoreFocus: false });
    document.getElementById("dashboard-insights-analytics-screen")?.remove();
    document.body.classList.remove("dashboard-insights-open");
    document.querySelector('.nav-btn[data-page="energy"]')?.click();
    revealGoalSettings();
}

function revealGoalSettings(attempt = 0) {
    document.querySelector('[data-calories-tab="plan"]')?.click();
    document.querySelector('[data-nutrition-view="goals"]')?.click();
    const panel = document.querySelector('[data-calories-panel="plan"], [data-planner-view="goals"]');
    if (panel && !panel.hidden) {
        panel.scrollIntoView({ block: "start", behavior: "smooth" });
        window.setTimeout(() => document.getElementById("nutrition-phase-goal-weight")?.focus(), 350);
        return;
    }
    if (attempt < 30) window.setTimeout(() => revealGoalSettings(attempt + 1), 75);
}

function activePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases)
        ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null
        : null;
}

function nearestWeight(series, startDate) {
    if (!startDate || !Array.isArray(series) || !series.length) return null;
    const target = dateMs(startDate);
    return series.reduce((best, point) => {
        const value = Number(point?.weight);
        if (!Number.isFinite(value)) return best;
        const distance = Math.abs(dateMs(point.date) - target);
        return !best || distance < best.distance ? { value, distance } : best;
    }, null)?.value ?? null;
}

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function firstPositive(...values) {
    for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number) && number > 0) return number;
    }
    return null;
}

function firstFinite(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === "") continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return null;
}

function formatWeight(value) {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
    const shown = displayMass(value, 1);
    return Number.isFinite(shown) ? `${shown.toFixed(1)} ${massUnit()}` : "—";
}

function formatRate(value) {
    if (value === null || value === undefined || value === "") return "Not set";
    const number = Number(value);
    if (!Number.isFinite(number)) return "Not set";
    const shown = displayMass(Math.abs(number), 2);
    const formatted = Number(shown).toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
    return `${number > 0 ? "+" : number < 0 ? "−" : ""}${formatted} ${massUnit()}/week`;
}

function formatDate(key, compact = false) {
    if (!key) return "—";
    const date = new Date(`${key}T12:00:00`);
    return new Intl.DateTimeFormat(undefined, compact
        ? { month: "short", day: "numeric", year: "numeric" }
        : { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(key) {
    return new Date(`${key}T12:00:00`).getTime();
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-goal-timeline-open]");
    if (trigger) {
        openGoalTimeline(trigger);
        return;
    }
    if (event.target.closest("[data-goal-timeline-close]")) {
        closeGoalTimeline();
        return;
    }
    if (event.target.closest("[data-goal-timeline-edit]")) openGoalSettings();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.getElementById(SCREEN_ID)) {
        event.stopImmediatePropagation();
        closeGoalTimeline();
    }
});

[
    "pageshow",
    "levelup:weight-updated",
    "levelup:nutrition-updated",
    "levelup:nutrition-phase-updated",
    "levelup:current-goal-updated",
    "levelup:units-changed",
    "levelup:app-features-updated"
].forEach(name => window.addEventListener(name, refreshOpenTimeline));
