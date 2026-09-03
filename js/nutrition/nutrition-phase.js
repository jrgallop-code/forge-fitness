import { GOAL_PRESETS } from "./tdee-calculator.js?v=phase-tolerance-1";
import { calculatePhaseMovingAverageTrend, calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=nutrition-phase-authority-1";

const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const BODYWEIGHT_TOLERANCE_PCT = 0.001;
const TARGET_TOLERANCE_FRACTION = 0.25;
const DEFAULT_TOLERANCE_LB = 0.1;
const FIRST_PHASE_CHECK_DAY = 14;

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
        if (previous !== calories) next.adjustments = [...(Array.isArray(active.adjustments) ? active.adjustments : []), { date: now, previousCalories: previous, newCalories: calories, maintenanceCalories: maintenance }];
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

export function getActivePhaseMetrics(phase = getActiveNutritionPhase(), options = {}) {
    if (!phase) {
        return {
            status: "NO ACTIVE PHASE",
            trend: null,
            actualRateLbPerWeek: null,
            targetRateLbPerWeek: null,
            toleranceLbPerWeek: null,
            referenceWeight: null,
            recommendationReady: false,
            asOfDate: null,
            isFutureTest: false
        };
    }

    const allWeights = readWeights();
    const asOfDate = resolveMetricsAsOfDate(phase, allWeights, options.asOfDate);
    const today = localDate();
    const metadata = {
        asOfDate,
        isFutureTest: !phase.endDate && asOfDate > today
    };
    const phaseEntries = allWeights.filter(e =>
        e.date >= phase.startDate &&
        e.date <= asOfDate &&
        (!phase.endDate || e.date <= phase.endDate)
    );
    const startingTrendWeight = finiteNumber(phase.startingTrendWeight) ?? trendWeight(allWeights.filter(e => e.date <= phase.startDate));
    const phaseTrend = calculatePhaseMovingAverageTrend(phaseEntries, {
        phaseStartDate: phase.startDate,
        asOfDate,
        startingTrendWeight,
        minEntriesPerWindow: 4,
        rolling: options.rolling !== false
    });

    // There is only one user-facing weight-rate signal in Level Up. Progress,
    // expenditure and phase coaching all consume the same smoothed Trend Weight
    // model. Phase-specific logic still controls phase age, check dates and when
    // a calorie recommendation is allowed; it no longer creates a second rate.
    const latestMeasurementDate = allWeights.filter(e => e.date <= asOfDate).at(-1)?.date || null;
    const visibleTrend = latestMeasurementDate
        ? calculateVisibleWeightTrend(allWeights, {
            endDate: latestMeasurementDate,
            rateDays: 20,
            minEntries: 3,
            minSpanDays: 5,
            fullEntries: 6,
            fullSpanDays: 14
        })
        : null;
    const useVisibleTrend = Number.isFinite(Number(visibleTrend?.weeklyChange));
    const trend = useVisibleTrend
        ? {
            ...phaseTrend,
            status: visibleTrend.status || phaseTrend.status,
            label: visibleTrend.label || phaseTrend.label,
            weeklyChange: Number(visibleTrend.weeklyChange),
            reason: null,
            measurementDate: latestMeasurementDate,
            visibleTrend: true
        }
        : phaseTrend;

    const actual = finiteNumber(trend?.weeklyChange);
    const target = finiteNumber(phase.targetWeeklyRate);
    const referenceWeight = finiteNumber(trend?.currentAverage) ?? trendWeight(allWeights.filter(e => e.date <= asOfDate)) ?? startingTrendWeight;
    const bodyweightTolerance = Number.isFinite(referenceWeight)
        ? referenceWeight * BODYWEIGHT_TOLERANCE_PCT
        : DEFAULT_TOLERANCE_LB;
    const targetTolerance = Number.isFinite(target) ? Math.abs(target) * TARGET_TOLERANCE_FRACTION : 0;
    const tolerance = Math.max(bodyweightTolerance, targetTolerance);

    if (trend.status === "insufficient" || !Number.isFinite(actual)) {
        const waitingStatus = phaseTrend.reason === "before-first-trend" ? "BUILDING TREND" : "NEED MORE DATA";
        return buildMetrics(waitingStatus, trend, actual, target, tolerance, referenceWeight, false, metadata);
    }

    if (trend.status === "preliminary") {
        return buildMetrics("PRELIMINARY TREND", trend, actual, target, tolerance, referenceWeight, false, metadata);
    }

    const checkDay = Number(phaseTrend.checkDay);
    const dataPhaseDay = Number(phaseTrend.dataPhaseDay);
    const waitingForScheduledWeighIn = Number.isFinite(checkDay)
        && Number.isFinite(dataPhaseDay)
        && Number(phaseTrend.phaseDay) >= checkDay
        && dataPhaseDay < checkDay;

    if (phaseTrend.awaitingNewWeighIn || waitingForScheduledWeighIn) {
        return buildMetrics("AWAITING WEIGH-IN", trend, actual, target, tolerance, referenceWeight, false, metadata);
    }

    if (!Number.isFinite(target)) {
        return buildMetrics("NEED MORE DATA", trend, actual, null, tolerance, referenceWeight, false, metadata);
    }

    let status;
    if (Math.abs(target) < 0.005) {
        if (Math.abs(actual) <= tolerance) status = "MAINTAINING";
        else status = actual > 0 ? "TRENDING UP" : "TRENDING DOWN";
    } else {
        const difference = actual - target;
        const absoluteDifference = Math.abs(difference);
        if (absoluteDifference <= tolerance) {
            status = "ON TRACK";
        } else if (absoluteDifference <= tolerance * 2) {
            const paceDifference = difference * Math.sign(target);
            status = paceDifference > 0 ? "SLIGHTLY FASTER" : "SLIGHTLY SLOWER";
        } else {
            status = "NEEDS ATTENTION";
        }
    }

    const checkReachedByWeighIn = Number.isFinite(checkDay)
        && Number.isFinite(dataPhaseDay)
        && dataPhaseDay >= checkDay;
    const recommendationReady = trend.status === "actual"
        && !phaseTrend.awaitingNewWeighIn
        && checkReachedByWeighIn
        && checkDay >= FIRST_PHASE_CHECK_DAY;
    return buildMetrics(status, trend, actual, target, tolerance, referenceWeight, recommendationReady, metadata);
}

export function getPhaseDayNumber(phase = getActiveNutritionPhase(), options = {}) {
    if (!phase?.startDate) return null;
    const weights = readWeights();
    const asOfDate = resolveMetricsAsOfDate(phase, weights, options.asOfDate);
    return Math.max(1, Math.floor((dateMs(asOfDate) - dateMs(phase.startDate)) / 86400000) + 1);
}

function resolveMetricsAsOfDate(phase, weights, requestedDate) {
    if (validDate(requestedDate)) return String(requestedDate);
    if (validDate(phase?.endDate)) return String(phase.endDate);

    // Live coaching and calorie decisions always stop at today. Future-dated
    // weigh-ins belong to the isolated test preview and must never change the
    // saved target, review banner, or live phase metrics.
    return localDate();
}

function buildMetrics(status, trend, actual, target, tolerance, referenceWeight, recommendationReady, metadata = {}) {
    return {
        status,
        trend,
        actualRateLbPerWeek: Number.isFinite(actual) ? actual : null,
        targetRateLbPerWeek: Number.isFinite(target) ? target : null,
        toleranceLbPerWeek: Number.isFinite(tolerance) ? tolerance : null,
        referenceWeight: Number.isFinite(referenceWeight) ? referenceWeight : null,
        recommendationReady: Boolean(recommendationReady),
        asOfDate: metadata.asOfDate || null,
        isFutureTest: metadata.isFutureTest === true
    };
}

function readPhases(){try{const v=JSON.parse(localStorage.getItem(PHASES_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function writePhases(v){localStorage.setItem(PHASES_KEY,JSON.stringify(v))}
function activeIndex(v){for(let i=v.length-1;i>=0;i-=1)if(v[i]&&!v[i].endDate&&GOAL_PRESETS[v[i].goalId])return i;return-1}
function readWeights(){try{return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY)||"[]"))}catch{return[]}}
function trendWeight(entries){if(!entries.length)return null;const latest=entries.at(-1),cut=dateMs(latest.date)-6*86400000,recent=entries.filter(e=>dateMs(e.date)>=cut);const n=recent.length?recent.reduce((s,e)=>s+e.weight,0)/recent.length:latest.weight;return Math.round(n*100)/100}
function finiteNumber(value){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)?n:null}
function positive(v){const n=Math.round(Number(v));return Number.isFinite(n)&&n>0?n:null}
function notify(){window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"))}
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||""))&&Number.isFinite(dateMs(String(v)))}
function dateMs(v){return new Date(`${v}T12:00:00`).getTime()}
