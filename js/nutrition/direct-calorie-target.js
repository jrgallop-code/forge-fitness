import { GOAL_PRESETS } from "./tdee-calculator.js?v=direct-calorie-target-1";
import { getNutritionProfile, saveNutritionGoal, syncCalculatedCalories } from "./nutrition-storage.js?v=direct-calorie-target-1";
import { getActiveNutritionPhase } from "./nutrition-phase.js?v=direct-calorie-target-1";
import { normalizeWeightEntries } from "../core/weight-trend.js?v=direct-calorie-target-1";

const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const DAY_MS = 86400000;
let refreshQueued = false;

function ensureStyles() {
    if (document.getElementById("direct-calorie-target-styles")) return;
    const style = document.createElement("style");
    style.id = "direct-calorie-target-styles";
    style.textContent = `
        .unified-direct-calorie-row{display:flex;align-items:center;gap:7px;margin:5px 0 3px}
        #unified-direct-calorie-target{width:104px;min-width:0;padding:8px 9px;border:1px solid rgba(255,255,255,.22);border-radius:9px;background:#111114;color:#fff;font:inherit;font-weight:800;font-size:18px;line-height:1.1;text-align:center}
        #unified-direct-calorie-target:focus{outline:none;border-color:#ff315f;box-shadow:0 0 0 2px rgba(255,49,95,.14)}
        .unified-direct-calorie-unit{font-size:11px;color:var(--muted,#a1a1aa);font-weight:700}
        #unified-direct-calorie-note{display:block;margin-top:3px;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.35}
    `;
    document.head.appendChild(style);
}

function selectedGoalId() {
    return document.getElementById("unified-goal-select")?.value || "";
}

function readMaintenance() {
    const value = Math.round(Number(document.getElementById("unified-maintenance")?.value));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function recommendedTarget(goalId = selectedGoalId(), maintenance = readMaintenance()) {
    const preset = GOAL_PRESETS[goalId];
    if (!preset || !Number.isFinite(maintenance)) return null;
    return Math.max(1, Math.round(maintenance + Number(preset.dailyCalorieAdjustment || 0)));
}

function currentPhaseCaloriesForGoal(goalId = selectedGoalId()) {
    const phase = getActiveNutritionPhase();
    if (!phase || phase.goalId !== goalId) return null;
    const value = Math.round(Number(phase.currentCalories ?? phase.startCalories));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function seedTargetValue(goalId = selectedGoalId()) {
    return currentPhaseCaloriesForGoal(goalId) ?? recommendedTarget(goalId) ?? null;
}

function ensureDirectTargetUi() {
    ensureStyles();
    const container = document.querySelector(".unified-active-target");
    if (!container) return;

    let input = document.getElementById("unified-direct-calorie-target");
    if (!input) {
        const existingText = document.getElementById("unified-active-target")?.textContent || "";
        const existingValue = Math.round(Number(existingText.replace(/[^0-9.]/g, "")));
        container.innerHTML = `
            <span>Planned Daily Target</span>
            <div class="unified-direct-calorie-row">
                <input id="unified-direct-calorie-target" type="number" inputmode="numeric" min="1" step="10" aria-label="Planned daily calorie target">
                <span class="unified-direct-calorie-unit">kcal/day</span>
            </div>
            <small id="unified-direct-calorie-note"></small>
        `;
        input = document.getElementById("unified-direct-calorie-target");
        const goalId = selectedGoalId();
        const seeded = seedTargetValue(goalId) ?? (Number.isFinite(existingValue) && existingValue > 0 ? existingValue : null);
        if (input && Number.isFinite(seeded)) input.value = String(seeded);
        if (input) {
            input.dataset.goalId = goalId;
            input.dataset.dirty = "0";
        }
    }

    const goalId = selectedGoalId();
    if (input && input.dataset.goalId !== goalId) {
        input.dataset.goalId = goalId;
        input.dataset.dirty = "0";
        const seeded = seedTargetValue(goalId);
        input.value = Number.isFinite(seeded) ? String(seeded) : "";
    }

    updateTargetContext();
}

function directTargetValue() {
    const value = Math.round(Number(document.getElementById("unified-direct-calorie-target")?.value));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function updateTargetContext() {
    const input = document.getElementById("unified-direct-calorie-target");
    if (!input) return;
    const goalId = selectedGoalId();
    const maintenance = readMaintenance();
    const target = directTargetValue();
    const suggested = recommendedTarget(goalId, maintenance);
    const active = getActiveNutritionPhase();
    const samePhase = Boolean(active && active.goalId === goalId);

    const adjustment = Number.isFinite(target) && Number.isFinite(maintenance) ? target - maintenance : null;
    const adjustmentNode = document.getElementById("unified-daily-adjustment");
    if (adjustmentNode && Number.isFinite(adjustment)) {
        const text = `${adjustment > 0 ? "+" : ""}${adjustment} kcal/day`;
        if (adjustmentNode.textContent !== text) adjustmentNode.textContent = text;
    }

    const note = document.getElementById("unified-direct-calorie-note");
    if (note) {
        const suggestion = Number.isFinite(suggested) ? `Phase-based suggestion: ${suggested} kcal/day.` : "";
        const phaseText = samePhase
            ? " Saving a calorie change keeps the current phase and its original start date."
            : " Saving with a different phase selection starts a new phase.";
        const next = `${suggestion}${phaseText}`.trim();
        if (note.textContent !== next) note.textContent = next;
    }
}

function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        ensureDirectTargetUi();
    });
}

function saveDirectTarget() {
    const profile = getNutritionProfile();
    if (!profile || !Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        setMessage("Save an adult Body Profile first.");
        return;
    }

    const goalId = selectedGoalId();
    const preset = GOAL_PRESETS[goalId];
    const maintenance = readMaintenance();
    const targetCalories = directTargetValue();
    const startDate = document.getElementById("nutrition-phase-start-date")?.value || today();
    const goalWeightRaw = Number(document.getElementById("nutrition-phase-goal-weight")?.value);
    const goalWeight = Number.isFinite(goalWeightRaw) && goalWeightRaw > 0 ? Math.round(goalWeightRaw * 10) / 10 : null;

    if (!preset || !Number.isFinite(maintenance) || !Number.isFinite(targetCalories) || !validStartDate(startDate)) {
        setMessage("Choose a phase, maintenance calories, a planned daily target, and a valid phase start date.");
        return;
    }

    const result = savePhaseRecord({ goalId, preset, maintenance, targetCalories, startDate, goalWeight });
    if (result.action === "invalid") {
        const message = result.reason === "start_before_active_phase"
            ? "A new phase cannot start before the current phase began. Adjust the current phase start first, or choose a later date."
            : result.reason === "start_before_previous_phase"
                ? "That start date would overlap the previous phase. Choose a later date."
                : "Check the phase details and try again.";
        setMessage(message);
        return;
    }

    localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(maintenance));
    if (goalWeight) localStorage.setItem(GOAL_WEIGHT_KEY, String(goalWeight));
    saveNutritionGoal({ goalId, updatedAt: new Date().toISOString(), source: "nutrition-phase" });
    syncCalculatedCalories(targetCalories);

    const input = document.getElementById("unified-direct-calorie-target");
    if (input) input.dataset.dirty = "0";

    window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));

    if (result.action === "started") {
        setMessage(`Started ${preset.label} on ${formatDate(startDate)} at ${targetCalories} kcal/day.`);
    } else if (result.action === "adjusted") {
        const from = Number(result.previousCalories);
        const prefix = Number.isFinite(from) && from > 0 ? `Updated calories from ${from} to ${targetCalories} kcal/day` : `Updated calories to ${targetCalories} kcal/day`;
        setMessage(`${prefix} inside the current ${preset.label} phase. The phase still starts ${formatDate(result.phase.startDate)}.`);
    } else if (result.action === "updated") {
        setMessage(`Updated ${preset.label} phase details. The calorie target is ${targetCalories} kcal/day.`);
    } else {
        setMessage(`${preset.label} remains active at ${targetCalories} kcal/day.`);
    }

    window.setTimeout(queueRefresh, 0);
}

function savePhaseRecord({ goalId, preset, maintenance, targetCalories, startDate, goalWeight }) {
    const phases = readPhases();
    const index = activePhaseIndex(phases);
    const active = index >= 0 ? phases[index] : null;
    const now = new Date().toISOString();

    if (active?.goalId === goalId) {
        const previousIndex = previousPhaseIndex(phases, index);
        const previous = previousIndex >= 0 ? phases[previousIndex] : null;
        if (previous?.startDate && startDate <= previous.startDate) return { action: "invalid", reason: "start_before_previous_phase" };

        const previousCalories = positive(active.currentCalories ?? active.startCalories);
        const previousMaintenance = positive(active.maintenanceCalories);
        const priorGoalWeight = readGoalWeight(active);
        const nextGoalWeight = goalWeight ?? priorGoalWeight;
        const startChanged = startDate !== active.startDate;
        const targetChanged = previousCalories !== targetCalories;
        const maintenanceChanged = previousMaintenance !== maintenance;
        const goalChanged = !sameNumber(priorGoalWeight, nextGoalWeight);

        if (startChanged && previousIndex >= 0) {
            const previousEnd = previousDay(startDate);
            phases[previousIndex] = { ...previous, endDate: previousEnd, endTrendWeight: trendWeightAsOf(previousEnd), status: "completed", updatedAt: now };
        }

        const next = {
            ...active,
            label: preset.label,
            startDate,
            startingTrendWeight: startChanged ? trendWeightAsOf(startDate) : active.startingTrendWeight,
            goalWeight: nextGoalWeight,
            targetWeeklyRate: preset.weeklyWeightChangeLb,
            dailyCalorieAdjustment: targetCalories - maintenance,
            recommendedDailyCalorieAdjustment: preset.dailyCalorieAdjustment,
            maintenanceCalories: maintenance,
            currentCalories: targetCalories,
            updatedAt: now
        };
        if (targetChanged) {
            next.adjustments = [
                ...(Array.isArray(active.adjustments) ? active.adjustments : []),
                { date: now, previousCalories, newCalories: targetCalories, maintenanceCalories: maintenance, source: "manual" }
            ];
        }
        phases[index] = next;
        writePhases(phases);
        return {
            action: targetChanged ? "adjusted" : startChanged || goalChanged || maintenanceChanged ? "updated" : "unchanged",
            phase: next,
            previousCalories
        };
    }

    if (active?.startDate && startDate < active.startDate) return { action: "invalid", reason: "start_before_active_phase" };
    if (index >= 0) {
        const endDate = startDate > active.startDate ? previousDay(startDate) : startDate;
        phases[index] = { ...active, endDate, endTrendWeight: trendWeightAsOf(endDate), status: "completed", updatedAt: now };
    }

    const phase = {
        id: `phase-${Date.now()}`,
        goalId,
        type: goalId === "maintain" ? "maintenance" : goalId.startsWith("cut_") ? "fat_loss" : "lean_bulk",
        label: preset.label,
        startDate,
        endDate: null,
        startingTrendWeight: trendWeightAsOf(startDate),
        goalWeight: goalWeight ?? readGoalWeight(active),
        targetWeeklyRate: preset.weeklyWeightChangeLb,
        dailyCalorieAdjustment: targetCalories - maintenance,
        recommendedDailyCalorieAdjustment: preset.dailyCalorieAdjustment,
        maintenanceCalories: maintenance,
        startCalories: targetCalories,
        currentCalories: targetCalories,
        adjustments: [],
        status: "active",
        createdAt: now,
        updatedAt: now
    };
    phases.push(phase);
    writePhases(phases);
    return { action: "started", phase };
}

function readPhases() {
    try {
        const value = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function writePhases(value) {
    localStorage.setItem(PHASES_KEY, JSON.stringify(value));
}

function activePhaseIndex(phases) {
    for (let index = phases.length - 1; index >= 0; index -= 1) {
        if (phases[index] && !phases[index].endDate && GOAL_PRESETS[phases[index].goalId]) return index;
    }
    return -1;
}

function previousPhaseIndex(phases, activeIndex) {
    for (let index = activeIndex - 1; index >= 0; index -= 1) {
        if (phases[index]?.startDate && phases[index]?.goalId) return index;
    }
    return -1;
}

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
}

function trendWeightAsOf(date) {
    const eligible = readWeights().filter(entry => entry.date <= date);
    if (!eligible.length) return null;
    const latest = eligible.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
    const value = recent.length ? recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length : latest.weight;
    return Math.round(value * 100) / 100;
}

function readGoalWeight(phase) {
    const phaseValue = Number(phase?.goalWeight ?? phase?.targetWeight);
    if (Number.isFinite(phaseValue) && phaseValue > 0) return phaseValue;
    const legacy = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
    return Number.isFinite(legacy) && legacy > 0 ? legacy : null;
}

function setMessage(value) {
    const node = document.getElementById("unified-calorie-message");
    if (node) node.textContent = value;
}

function validStartDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && value <= today() && Number.isFinite(dateMs(value));
}

function previousDay(value) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function positive(value) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : null;
}

function sameNumber(a, b) {
    if (a == null && b == null) return true;
    return Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) < 0.05;
}

function formatDate(value) {
    if (!value) return "--";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

document.addEventListener("input", event => {
    if (event.target?.id === "unified-direct-calorie-target") {
        event.target.dataset.dirty = "1";
        updateTargetContext();
    } else if (event.target?.id === "unified-maintenance") {
        window.setTimeout(updateTargetContext, 0);
    }
}, true);

document.addEventListener("change", event => {
    if (event.target?.id === "unified-goal-select") {
        window.setTimeout(() => {
            const input = document.getElementById("unified-direct-calorie-target");
            if (input) {
                input.dataset.goalId = event.target.value;
                input.dataset.dirty = "0";
                const seeded = seedTargetValue(event.target.value);
                input.value = Number.isFinite(seeded) ? String(seeded) : "";
            }
            updateTargetContext();
        }, 0);
    }
}, true);

document.addEventListener("click", event => {
    const saveButton = event.target.closest?.("#unified-save-plan");
    if (!saveButton || !document.getElementById("unified-direct-calorie-target")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    saveDirectTarget();
}, true);

const content = document.getElementById("content");
if (content) new MutationObserver(queueRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", queueRefresh);
window.addEventListener("levelup:nutrition-phase-updated", queueRefresh);
window.addEventListener("load", queueRefresh);
queueRefresh();
