import { getNutritionPhaseHistory } from "../nutrition/nutrition-phase.js?v=goal-aware-weight-history-1";

const STYLE_ID = "weight-history-goal-colors-style";
const KG_PER_LB = 0.45359237;
let queued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress .weight-history-trend.is-goal-on-track {
            color: #1f9d62 !important;
            background: rgba(53, 199, 122, .15) !important;
        }
        #weight-progress .weight-history-trend.is-goal-off-track {
            color: #d92d36 !important;
            background: rgba(255, 59, 68, .14) !important;
        }
        #weight-progress .weight-history-trend.is-goal-neutral {
            color: var(--text-secondary, #64748b) !important;
            background: var(--surface-raised, rgba(148, 163, 184, .12)) !important;
        }
    `;
    document.head.appendChild(style);
}

function numericText(value) {
    const match = String(value || "")
        .replace("−", "-")
        .match(/[+-]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
}

function phaseForDate(phases, date) {
    if (!date) return null;
    return phases.find(phase =>
        phase?.startDate &&
        date >= phase.startDate &&
        (!phase.endDate || date <= phase.endDate)
    ) || null;
}

function displayedReferenceWeightLb(row) {
    const value = numericText(row.children?.[2]?.textContent);
    if (!Number.isFinite(value)) return null;
    const text = String(row.children?.[2]?.textContent || "");
    return /kg/i.test(text) ? value / KG_PER_LB : value;
}

function targetAndTolerance(phase, row, trendText) {
    const targetLb = Number(phase?.targetWeeklyRate);
    if (!Number.isFinite(targetLb)) return null;

    const referenceLb = displayedReferenceWeightLb(row);
    const bodyweightToleranceLb = Number.isFinite(referenceLb)
        ? Math.abs(referenceLb) * 0.001
        : 0.1;
    const targetToleranceLb = Math.abs(targetLb) * 0.25;
    const toleranceLb = Math.max(bodyweightToleranceLb, targetToleranceLb);
    const usingKg = /kg\s*\/\s*wk/i.test(trendText);
    const factor = usingKg ? KG_PER_LB : 1;

    return {
        target: targetLb * factor,
        tolerance: toleranceLb * factor,
        unit: usingKg ? "kg/wk" : "lb/wk"
    };
}

function formatRate(value) {
    if (!Number.isFinite(value)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${Math.abs(value).toFixed(2)}`;
}

function classifyRow(row, phases) {
    const trend = row.querySelector(".weight-history-trend");
    if (!trend) return;

    trend.classList.remove(
        "is-up",
        "is-down",
        "is-flat",
        "is-goal-on-track",
        "is-goal-off-track",
        "is-goal-neutral"
    );

    const date = row.querySelector(".edit-weight-entry")?.dataset.date || null;
    const phase = phaseForDate(phases, date);
    const trendText = String(trend.textContent || "").trim();
    const actual = numericText(trendText);

    if (!phase || !Number.isFinite(actual)) {
        trend.classList.add("is-goal-neutral");
        trend.title = phase
            ? "More weight data is needed before this trend can be compared with the phase target."
            : "No nutrition phase target was active for this date.";
        return;
    }

    const goal = targetAndTolerance(phase, row, trendText);
    if (!goal) {
        trend.classList.add("is-goal-neutral");
        trend.title = "No weekly weight-rate target was available for this date.";
        return;
    }

    const difference = Math.abs(actual - goal.target);
    const onTrack = difference <= goal.tolerance;
    trend.classList.add(onTrack ? "is-goal-on-track" : "is-goal-off-track");

    const label = phase.label || "current phase";
    trend.title = onTrack
        ? `On track for ${label}: target ${formatRate(goal.target)} ${goal.unit} ±${goal.tolerance.toFixed(2)}.`
        : `Outside the ${label} target range: target ${formatRate(goal.target)} ${goal.unit} ±${goal.tolerance.toFixed(2)}.`;
}

export function applyGoalAwareWeightHistoryColors() {
    ensureStyles();
    const list = document.getElementById("weight-history-list");
    if (!list) return;
    const phases = getNutritionPhaseHistory();
    list.querySelectorAll(".weight-table-row").forEach(row => classifyRow(row, phases));
}

function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        applyGoalAwareWeightHistoryColors();
    });
}

const observer = new MutationObserver(records => {
    if (records.some(record =>
        record.addedNodes.length ||
        record.removedNodes.length ||
        record.target?.closest?.("#weight-history-list")
    )) queueApply();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-phase-updated", queueApply);
window.addEventListener("levelup:nutrition-updated", queueApply);
window.addEventListener("storage", queueApply);
document.addEventListener("click", event => {
    if (event.target.closest?.("#weight-tab, .edit-weight-entry, .remove-weight-entry, #save-weight-btn")) {
        setTimeout(queueApply, 0);
        setTimeout(queueApply, 120);
    }
}, true);

queueApply();
