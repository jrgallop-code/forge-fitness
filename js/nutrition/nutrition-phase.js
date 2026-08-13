import { GOAL_PRESETS } from "./tdee-calculator.js?v=nutrition-phase-1";
import { calculateWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=nutrition-phase-1";

const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";

export function getActiveNutritionPhase() {
    return [...readPhases()].reverse().find(p => p && !p.endDate && GOAL_PRESETS[p.goalId]) || null;
}

export function getNutritionPhaseHistory() {
    return readPhases().filter(p => p?.startDate && p?.goalId).sort((a,b) => String(b.startDate).localeCompare(String(a.startDate)));
}

export function saveNutritionPhase({ goalId, maintenanceCalories, targetCalories }) {
    const preset = GOAL_PRESETS[goalId];
    const maintenance = positive(maintenanceCalories);
    const calories = positive(targetCalories);
    if (!preset || !maintenance || !calories) return { action: "invalid", phase: null };

    const phases = readPhases();
    const index = activeIndex(phases);
    const active = index >= 0 ? phases[index] : null;
    const now = new Date().toISOString();
    const today = localDate();

    if (active?.goalId === goalId) {
        const previous = positive(active.currentCalories ?? active.startCalories);
        const changed = previous !== calories || positive(active.maintenanceCalories) !== maintenance;
        const next = { ...active, label: preset.label, currentCalories: calories, maintenanceCalories: maintenance, targetWeeklyRate: preset.weeklyWeightChangeLb, dailyCalorieAdjustment: preset.dailyCalorieAdjustment, updatedAt: now };
        if (changed) next.adjustments = [...(Array.isArray(active.adjustments) ? active.adjustments : []), { date: now, previousCalories: previous, newCalories: calories, maintenanceCalories: maintenance }];
        phases[index] = next;
        writePhases(phases);
        notify();
        return { action: changed ? "adjusted" : "unchanged", phase: next };
    }

    if (index >= 0) phases[index] = { ...active, endDate: today, endTrendWeight: trendWeight(readWeights().filter(e => e.date <= today)), status: "completed", updatedAt: now };

    const phase = {
        id: `phase-${Date.now()}`,
        goalId,
        type: goalId === "maintain" ? "maintenance" : goalId.startsWith("cut_") ? "fat_loss" : "lean_bulk",
        label: preset.label,
        startDate: today,
        endDate: null,
        startingTrendWeight: trendWeight(readWeights()),
        targetWeeklyRate: preset.weeklyWeightChangeLb,
        dailyCalorieAdjustment: preset.dailyCalorieAdjustment,
        maintenanceCalories: maintenance,
        startCalories: calories,
        currentCalories: calories,
        adjustments: [],
        status: "active",
        createdAt: now,
        updatedAt: now
    };
    phases.push(phase);
    writePhases(phases);
    notify();
    return { action: "started", phase };
}

export function getActivePhaseMetrics(phase = getActiveNutritionPhase()) {
    if (!phase) return { status: "NO ACTIVE PHASE", trend: null, actualRateLbPerWeek: null, targetRateLbPerWeek: null };
    const entries = readWeights().filter(e => e.date >= phase.startDate && (!phase.endDate || e.date <= phase.endDate));
    const trend = calculateWeightTrend(entries);
    const actual = Number(trend.weeklyChange);
    const target = Number(phase.targetWeeklyRate);
    let status = "CALIBRATING";
    if (trend.status === "actual" && Number.isFinite(actual) && Number.isFinite(target)) {
        const tolerance = Math.max(0.1, Math.abs(target) * 0.25);
        const diff = actual - target;
        if (Math.abs(diff) <= tolerance) status = Math.abs(target) < 0.01 ? "MAINTAINING" : "ON TRACK";
        else if (Math.abs(target) < 0.01) status = actual > 0 ? "TRENDING ABOVE TARGET" : "TRENDING BELOW TARGET";
        else status = Math.abs(diff) <= tolerance * 2 ? ((target < 0 ? diff > 0 : diff < 0) ? "SLIGHTLY SLOWER THAN TARGET" : "SLIGHTLY FASTER THAN TARGET") : "TREND NEEDS ATTENTION";
    }
    return { status, trend, actualRateLbPerWeek: Number.isFinite(actual) ? actual : null, targetRateLbPerWeek: Number.isFinite(target) ? target : null };
}

export function getPhaseDayNumber(phase = getActiveNutritionPhase()) {
    if (!phase?.startDate) return null;
    return Math.max(1, Math.floor((dateMs(phase.endDate || localDate()) - dateMs(phase.startDate)) / 86400000) + 1);
}

function readPhases(){try{const v=JSON.parse(localStorage.getItem(PHASES_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function writePhases(v){localStorage.setItem(PHASES_KEY,JSON.stringify(v))}
function activeIndex(v){for(let i=v.length-1;i>=0;i-=1)if(v[i]&&!v[i].endDate&&GOAL_PRESETS[v[i].goalId])return i;return-1}
function readWeights(){try{return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY)||"[]"))}catch{return[]}}
function trendWeight(entries){if(!entries.length)return null;const latest=entries.at(-1),cut=dateMs(latest.date)-6*86400000,recent=entries.filter(e=>dateMs(e.date)>=cut);const n=recent.length?recent.reduce((s,e)=>s+e.weight,0)/recent.length:latest.weight;return Math.round(n*100)/100}
function positive(v){const n=Math.round(Number(v));return Number.isFinite(n)&&n>0?n:null}
function notify(){window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"))}
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function dateMs(v){return new Date(`${v}T12:00:00`).getTime()}
