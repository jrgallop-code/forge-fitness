import { GOAL_PRESETS } from "./tdee-calculator.js?v=phase-goal-controls-1";
import { getNutritionProfile, saveNutritionGoal, syncCalculatedCalories } from "./nutrition-storage.js?v=phase-goal-controls-1";
import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=nutrition-phase-1";
import { normalizeWeightEntries } from "../core/weight-trend.js?v=phase-goal-controls-1";

const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const DAY_MS = 86400000;
let listenersBound = false;

export function initializePhaseGoalControls() {
    ensureStyles();
    enhanceGoalsAndCalories();
    enhanceWeightProgress();
    bindListeners();
}

function enhanceGoalsAndCalories() {
    const view = document.querySelector('[data-planner-view="goals"]');
    const card = document.getElementById("unified-goals-calories-card");
    const select = document.getElementById("unified-goal-select");
    if (!view || !card || !select) return;

    let controls = document.getElementById("nutrition-phase-basics");
    if (!controls) {
        controls = document.createElement("div");
        controls.id = "nutrition-phase-basics";
        controls.className = "nutrition-phase-basics";
        controls.innerHTML = `
            <label>Phase Start Date<input id="nutrition-phase-start-date" type="date" max="${today()}"></label>
            <label>Goal Weight (lb)<input id="nutrition-phase-goal-weight" type="number" min="1" step="0.1" inputmode="decimal" placeholder="Optional"></label>
            <small>Changing the start date resets phase trend analysis to that date. Goal Weight is shown in Weight Progress but stays managed here.</small>
        `;
        const description = document.getElementById("unified-goal-description");
        description?.insertAdjacentElement("afterend", controls);
    }

    hydratePhaseFields();
    refreshNutritionPhaseGoalWeight();
}

function hydratePhaseFields() {
    const active = getActiveNutritionPhase();
    const startInput = document.getElementById("nutrition-phase-start-date");
    const goalInput = document.getElementById("nutrition-phase-goal-weight");
    if (startInput && document.activeElement !== startInput) startInput.value = active?.startDate || today();
    if (goalInput && document.activeElement !== goalInput) {
        const goalWeight = readGoalWeight(active);
        goalInput.value = Number.isFinite(goalWeight) ? String(goalWeight) : "";
    }
}

function refreshNutritionPhaseGoalWeight() {
    const active = getActiveNutritionPhase();
    const grid = document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");
    if (!grid) return;
    let cell = grid.querySelector("[data-phase-goal-weight]");
    if (!cell) {
        cell = document.createElement("div");
        cell.dataset.phaseGoalWeight = "1";
        cell.innerHTML = "<span>Goal Weight</span><strong>--</strong>";
        grid.appendChild(cell);
    }
    const value = readGoalWeight(active);
    const strong = cell.querySelector("strong");
    if (strong) strong.textContent = Number.isFinite(value) ? `${value.toFixed(1)} lb` : "Not set";
}

function enhanceWeightProgress() {
    const section = document.getElementById("weight-progress");
    const summary = section?.querySelector(".weight-summary");
    if (!section || !summary) return;

    if (summary.dataset.phaseSummary !== "1") {
        summary.innerHTML = `
            <div class="metric-card"><div><h3>Trend Weight</h3><p id="latest-weight">--</p></div></div>
            <div class="metric-card"><div><h3>Current Goal</h3><p id="weight-current-phase">--</p></div></div>
            <div class="metric-card"><div><h3>Goal Weight</h3><p id="weight-goal-weight">--</p></div></div>
            <div class="metric-card"><div><h3 id="weight-phase-rate-heading">Phase Weekly Rate</h3><p id="weight-phase-rate">--</p></div></div>
        `;
        summary.dataset.phaseSummary = "1";
    }

    const entries = readWeights();
    const trendWeight = currentTrendWeight(entries);
    const phase = getActiveNutritionPhase();
    const metrics = getActivePhaseMetrics(phase);
    const goalWeight = readGoalWeight(phase);

    setText("latest-weight", Number.isFinite(trendWeight) ? `${trendWeight.toFixed(1)} lb` : "--");
    setText("weight-current-phase", phase?.label || GOAL_PRESETS[phase?.goalId]?.label || "No active phase");
    setText("weight-goal-weight", Number.isFinite(goalWeight) ? `${goalWeight.toFixed(1)} lb` : "Not set");

    const phaseRate = Number(metrics.actualRateLbPerWeek);
    setText("weight-phase-rate", Number.isFinite(phaseRate) ? formatRate(phaseRate) : phase ? "Need more data" : "No active phase");
    const heading = document.getElementById("weight-phase-rate-heading");
    if (heading) heading.textContent = metrics.trend?.status === "preliminary" ? "Preliminary Phase Rate" : "Phase Weekly Rate";
}

function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener("change", event => {
        if (event.target?.id === "unified-goal-select") {
            const active = getActiveNutritionPhase();
            const startInput = document.getElementById("nutrition-phase-start-date");
            if (startInput) startInput.value = event.target.value === active?.goalId ? active.startDate : today();
        }
    }, true);

    document.addEventListener("click", event => {
        const saveButton = event.target.closest("#unified-save-plan");
        if (!saveButton) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        savePhaseFromNutrition();
    }, true);

    window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
    window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
}

function readDirectCalorieTarget() {
    const input = document.getElementById("unified-direct-calorie-target");
    if (!input) return null;
    const value = Math.round(Number(input.value));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function savePhaseFromNutrition() {
    const profile = getNutritionProfile();
    if (!profile || !Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        setText("unified-calorie-message", "Save an adult Body Profile first.");
        return;
    }

    const goalId = document.getElementById("unified-goal-select")?.value;
    const preset = GOAL_PRESETS[goalId];
    const maintenance = Math.round(Number(document.getElementById("unified-maintenance")?.value));
    const directTarget = readDirectCalorieTarget();
    const targetCalories = directTarget ?? Math.round(maintenance + Number(preset?.dailyCalorieAdjustment || 0));
    const startDate = document.getElementById("nutrition-phase-start-date")?.value || today();
    const goalWeightRaw = Number(document.getElementById("nutrition-phase-goal-weight")?.value);
    const goalWeight = Number.isFinite(goalWeightRaw) && goalWeightRaw > 0 ? Math.round(goalWeightRaw * 10) / 10 : null;
    if (!preset || !Number.isFinite(maintenance) || maintenance <= 0 || !Number.isFinite(targetCalories) || targetCalories <= 0 || !validStartDate(startDate)) {
        setText("unified-calorie-message", "Choose a phase, maintenance calories, a planned daily target, and a valid phase start date.");
        return;
    }

    const result = savePhaseRecord({ goalId, preset, maintenance, targetCalories, startDate, goalWeight, directTargetUsed: Number.isFinite(directTarget) });
    if (result.action === "invalid") {
        const message = result.reason === "start_before_active_phase"
            ? "A new phase cannot start before the current phase began. Adjust the current phase start first, or choose a later date."
            : result.reason === "start_before_previous_phase"
                ? "That start date would overlap the previous phase. Choose a later date."
                : "Check the phase details and try again.";
        setText("unified-calorie-message", message);
        return;
    }

    localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(maintenance));
    if (goalWeight) localStorage.setItem(GOAL_WEIGHT_KEY, String(goalWeight));
    saveNutritionGoal({ goalId, updatedAt: new Date().toISOString(), source: "nutrition-phase" });
    syncCalculatedCalories(targetCalories);
    window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));

    const message = result.action === "started"
        ? `Started ${preset.label} on ${formatDate(startDate)} at ${targetCalories} kcal/day.`
        : result.action === "adjusted"
            ? `Updated ${preset.label}. Calories are ${targetCalories} kcal/day and the phase still starts ${formatDate(result.phase.startDate)}.`
            : result.action === "updated"
                ? `Updated ${preset.label} phase details. The calorie target is ${targetCalories} kcal/day and trend analysis still starts ${formatDate(result.phase.startDate)}.`
                : `${preset.label} remains active at ${targetCalories} kcal/day.`;
    setText("unified-calorie-message", message);
    scheduleRefresh();
}

function savePhaseRecord({ goalId, preset, maintenance, targetCalories, startDate, goalWeight, directTargetUsed = false }) {
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
                {
                    date: now,
                    previousCalories,
                    newCalories: targetCalories,
                    maintenanceCalories: maintenance,
                    source: directTargetUsed ? "manual" : "planned"
                }
            ];
        }
        phases[index] = next;
        writePhases(phases);
        return {
            action: targetChanged ? "adjusted" : startChanged || goalChanged || maintenanceChanged ? "updated" : "unchanged",
            phase: next
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

function scheduleRefresh() {
    window.setTimeout(() => { enhanceGoalsAndCalories(); enhanceWeightProgress(); }, 0);
    window.setTimeout(() => { refreshNutritionPhaseGoalWeight(); enhanceWeightProgress(); }, 80);
}

function readPhases() {
    try { const value = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
}

function writePhases(value) { localStorage.setItem(PHASES_KEY, JSON.stringify(value)); }
function activePhaseIndex(phases) { for (let index = phases.length - 1; index >= 0; index -= 1) if (phases[index] && !phases[index].endDate && GOAL_PRESETS[phases[index].goalId]) return index; return -1; }
function previousPhaseIndex(phases, activeIndex) { for (let index = activeIndex - 1; index >= 0; index -= 1) if (phases[index]?.startDate && phases[index]?.goalId) return index; return -1; }

function readWeights() {
    try { return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]")); }
    catch { return []; }
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

function currentTrendWeight(entries) {
    if (!entries.length) return null;
    const latest = entries.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = entries.filter(entry => dateMs(entry.date) >= cutoff);
    return recent.length ? recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length : latest.weight;
}

function readGoalWeight(phase) {
    const phaseValue = Number(phase?.goalWeight ?? phase?.targetWeight);
    if (Number.isFinite(phaseValue) && phaseValue > 0) return phaseValue;
    const legacy = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
    return Number.isFinite(legacy) && legacy > 0 ? legacy : null;
}

function validStartDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && value <= today() && Number.isFinite(dateMs(value)); }
function previousDay(value) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() - 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function today() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateMs(value) { return new Date(`${value}T12:00:00`).getTime(); }
function positive(value) { const number = Math.round(Number(value)); return Number.isFinite(number) && number > 0 ? number : null; }
function sameNumber(a, b) { if (a == null && b == null) return true; return Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) < 0.05; }
function formatRate(value) { const number = Number(value); if (!Number.isFinite(number)) return "--"; if (Math.abs(number) < 0.005) return "Maintain"; return `${number > 0 ? "+" : "−"}${Math.abs(number).toFixed(2).replace(/0$/, "")} lb/week`; }
function formatDate(value) { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function setText(id, value) { const node = document.getElementById(id); if (node) node.textContent = value; }

function ensureStyles() {
    if (document.getElementById("phase-goal-controls-style")) return;
    const style = document.createElement("style");
    style.id = "phase-goal-controls-style";
    style.textContent = ".nutrition-phase-basics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.02)}.nutrition-phase-basics label{display:grid;gap:5px;font-size:11px;font-weight:800}.nutrition-phase-basics input{width:100%;min-width:0}.nutrition-phase-basics small{grid-column:1/-1;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.4}@media(max-width:390px){.nutrition-phase-basics{grid-template-columns:1fr}.nutrition-phase-basics small{grid-column:auto}}";
    document.head.appendChild(style);
}
