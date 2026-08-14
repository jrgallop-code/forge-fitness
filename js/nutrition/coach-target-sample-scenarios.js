import { calculatePhaseMovingAverageTrend } from "../core/weight-trend.js?v=weekly-ma-coach-2";

const FIRST_CHECK_DAY = 14;
const MIN_ENTRIES_PER_WINDOW = 4;
const FULL_GAP_INCREMENT = 50;
const FIRST_STEP_FRACTION = 0.5;
const FIRST_STEP_INCREMENT = 25;
const MAX_FIRST_STEP = 150;
const BODYWEIGHT_TOLERANCE_PCT = 0.001;
const TARGET_TOLERANCE_FRACTION = 0.25;
const DEFAULT_TOLERANCE_LB = 0.1;
const START_WEIGHT = 165;
const NOISE_PATTERN = [0.20, -0.15, 0.05, -0.10, 0.15, -0.05, -0.10];
let refreshQueued = false;

const SAMPLE_SCENARIOS = [
    { id: "bulk-hit", label: "Lean Bulk · Hits target exactly", phaseLabel: "Lean Bulk", target: 0.25, actual: 0.25, currentCalories: 2400 },
    { id: "bulk-near", label: "Lean Bulk · Near target / within tolerance", phaseLabel: "Lean Bulk", target: 0.25, actual: 0.12, currentCalories: 2400 },
    { id: "bulk-slight-slow", label: "Lean Bulk · Slightly below target", phaseLabel: "Lean Bulk", target: 0.25, actual: 0.00, currentCalories: 2400 },
    { id: "bulk-miss-slow", label: "Lean Bulk · Clearly below target", phaseLabel: "Lean Bulk", target: 0.25, actual: -0.25, currentCalories: 2400 },
    { id: "bulk-miss-fast", label: "Lean Bulk · Clearly above target", phaseLabel: "Lean Bulk", target: 0.25, actual: 0.75, currentCalories: 2400 },
    { id: "bulk-cap", label: "Lean Bulk · Large miss / +150 cap", phaseLabel: "Lean Bulk", target: 0.25, actual: -0.75, currentCalories: 2400 },
    { id: "cut-hit", label: "Fat Loss · Hits target exactly", phaseLabel: "Fat Loss", target: -0.50, actual: -0.50, currentCalories: 1900 },
    { id: "cut-slow", label: "Fat Loss · Losing too slowly", phaseLabel: "Fat Loss", target: -0.50, actual: -0.10, currentCalories: 1900 },
    { id: "cut-fast", label: "Fat Loss · Losing too quickly", phaseLabel: "Fat Loss", target: -0.50, actual: -1.10, currentCalories: 1900 },
    { id: "maintain-hit", label: "Maintenance · Weight stable", phaseLabel: "Maintenance", target: 0, actual: 0.05, currentCalories: 2250 }
];

function evaluateRate(actual, target, referenceWeight) {
    const actualRate = Number(actual);
    const targetRate = Number(target);
    const weight = Number(referenceWeight);
    const bodyweightTolerance = Number.isFinite(weight) && weight > 0
        ? weight * BODYWEIGHT_TOLERANCE_PCT
        : DEFAULT_TOLERANCE_LB;
    const targetTolerance = Number.isFinite(targetRate)
        ? Math.abs(targetRate) * TARGET_TOLERANCE_FRACTION
        : 0;
    const tolerance = Math.max(bodyweightTolerance, targetTolerance);

    if (!Number.isFinite(actualRate) || !Number.isFinite(targetRate)) {
        return { status: "NEED MORE DATA", tolerance };
    }
    if (Math.abs(targetRate) < 0.005) {
        if (Math.abs(actualRate) <= tolerance) return { status: "MAINTAINING", tolerance };
        return { status: actualRate > 0 ? "TRENDING UP" : "TRENDING DOWN", tolerance };
    }
    const difference = actualRate - targetRate;
    const absoluteDifference = Math.abs(difference);
    if (absoluteDifference <= tolerance) return { status: "ON TRACK", tolerance };
    if (absoluteDifference <= tolerance * 2) {
        const paceDifference = difference * Math.sign(targetRate);
        return { status: paceDifference > 0 ? "SLIGHTLY FASTER" : "SLIGHTLY SLOWER", tolerance };
    }
    return { status: "NEEDS ATTENTION", tolerance };
}

function buildCalorieRecommendation({ actual, target, currentCalories }) {
    const rawGap = (Number(target) - Number(actual)) * 500;
    let fullGapCalories = Math.round(rawGap / FULL_GAP_INCREMENT) * FULL_GAP_INCREMENT;
    if (fullGapCalories === 0 && Math.abs(rawGap) > 0.001) {
        fullGapCalories = Math.sign(rawGap) * FULL_GAP_INCREMENT;
    }
    const estimatedTargetCalories = Math.max(1, Math.round(Number(currentCalories) + fullGapCalories));
    const uncappedFirstStep = Math.round((fullGapCalories * FIRST_STEP_FRACTION) / FIRST_STEP_INCREMENT) * FIRST_STEP_INCREMENT;
    let firstStepDelta = uncappedFirstStep;
    if (firstStepDelta === 0 && fullGapCalories !== 0) {
        firstStepDelta = Math.sign(fullGapCalories) * FIRST_STEP_INCREMENT;
    }
    firstStepDelta = Math.max(-MAX_FIRST_STEP, Math.min(MAX_FIRST_STEP, firstStepDelta));
    const firstStepCalories = Math.max(1, Math.round(Number(currentCalories) + firstStepDelta));
    return {
        fullGapCalories,
        estimatedTargetCalories,
        firstStepDelta,
        firstStepCalories,
        wasCapped: Math.abs(uncappedFirstStep) > MAX_FIRST_STEP
    };
}

function buildScenarioEntries(scenario) {
    const startDate = "2026-01-01";
    const rows = [];
    for (let day = 1; day <= FIRST_CHECK_DAY; day += 1) {
        const slope = Number(scenario.actual) / 7;
        const noise = NOISE_PATTERN[(day - 1) % NOISE_PATTERN.length];
        rows.push({
            date: addDays(startDate, day - 1),
            weight: round(START_WEIGHT + ((day - 1) * slope) + noise, 2)
        });
    }
    return { startDate, rows };
}

function ensureStyles() {
    if (document.getElementById("coach-target-sample-styles")) return;
    const style = document.createElement("style");
    style.id = "coach-target-sample-styles";
    style.textContent = `
        #coach-target-sample-lab{margin-top:10px;border-top:1px solid rgba(255,255,255,.10);padding-top:10px}
        #coach-target-sample-lab>summary{cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
        #coach-target-sample-lab select{width:100%;margin:10px 0 8px}
        .coach-target-result{padding:10px;border-radius:10px;background:rgba(255,255,255,.035);font-size:11px;line-height:1.45}
        .coach-target-result-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:7px}
        .coach-target-result-head strong{font-size:12px}
        .coach-target-status{font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
        .coach-target-response{margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,.10);border-radius:8px}
        .coach-target-response span{display:block;color:var(--muted,#a1a1aa);font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}
        .coach-target-weights-title{display:block;margin-top:10px;margin-bottom:5px;color:var(--muted,#a1a1aa);font-size:9px;text-transform:uppercase;letter-spacing:.04em}
        .coach-target-weights{display:grid;grid-template-columns:repeat(7,minmax(38px,1fr));gap:4px;min-width:294px}
        .coach-target-weight{padding:5px 3px;border:1px solid rgba(255,255,255,.08);border-radius:6px;text-align:center}
        .coach-target-weight small{display:block;color:var(--muted,#a1a1aa);font-size:8px}
        .coach-target-weight b{display:block;margin-top:1px;font-size:9px;font-weight:700}
        .coach-target-week{overflow-x:auto;padding-bottom:2px}
        .coach-target-week+.coach-target-week{margin-top:4px}
        .coach-target-note{display:block;margin-top:7px;color:var(--muted,#a1a1aa);font-size:9px}
    `;
    document.head.appendChild(style);
}

function ensurePanel() {
    const existing = document.getElementById("coach-target-sample-lab");
    if (existing) return existing;
    const originalLab = document.getElementById("weekly-coach-test-lab");
    if (!originalLab) return null;

    const panel = document.createElement("details");
    panel.id = "coach-target-sample-lab";
    panel.innerHTML = `
        <summary>Target Response Samples</summary>
        <small class="weekly-test-note">Synthetic Day-14 examples using the same 7-day-average, tolerance and calorie-adjustment rules as the coach. Your saved data is never changed.</small>
        <select id="coach-target-sample-select" aria-label="Target response sample"></select>
        <div id="coach-target-sample-result" class="coach-target-result"></div>
    `;
    originalLab.insertAdjacentElement("afterend", panel);

    const select = panel.querySelector("#coach-target-sample-select");
    select.innerHTML = SAMPLE_SCENARIOS.map(scenario => `<option value="${scenario.id}">${scenario.label}</option>`).join("");
    select.addEventListener("change", renderSelectedScenario);
    renderSelectedScenario();
    return panel;
}

function renderSelectedScenario() {
    const select = document.getElementById("coach-target-sample-select");
    const host = document.getElementById("coach-target-sample-result");
    if (!select || !host) return;
    const scenario = SAMPLE_SCENARIOS.find(item => item.id === select.value) || SAMPLE_SCENARIOS[0];
    const generated = buildScenarioEntries(scenario);
    const trend = calculatePhaseMovingAverageTrend(generated.rows, {
        phaseStartDate: generated.startDate,
        asOfDate: addDays(generated.startDate, FIRST_CHECK_DAY - 1),
        startingTrendWeight: START_WEIGHT,
        minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW
    });

    if (trend.status !== "actual" || !Number.isFinite(trend.weeklyChange)) {
        host.innerHTML = `<strong>NEED MORE DATA</strong><br>This sample did not produce a valid Day-14 check.`;
        return;
    }

    const evaluation = evaluateRate(trend.weeklyChange, scenario.target, trend.currentAverage);
    const keep = ["ON TRACK", "MAINTAINING"].includes(evaluation.status);
    const recommendation = keep ? null : buildCalorieRecommendation({
        actual: trend.weeklyChange,
        target: scenario.target,
        currentCalories: scenario.currentCalories
    });
    const response = recommendation
        ? `Recommend ${formatSignedCalories(recommendation.firstStepDelta)} kcal/day: ${scenario.currentCalories} → ${recommendation.firstStepCalories} kcal/day. Estimated full-gap target: ${recommendation.estimatedTargetCalories} kcal/day.${recommendation.wasCapped ? ` Weekly step capped at ±${MAX_FIRST_STEP} kcal/day.` : ""}`
        : `Keep calories at ${scenario.currentCalories} kcal/day. No adjustment recommended.`;

    host.innerHTML = `
        <div class="coach-target-result-head">
            <strong>${scenario.phaseLabel} · Day 14</strong>
            <span class="coach-target-status">${evaluation.status}</span>
        </div>
        Previous 7-day avg: <b>${trend.previousAverage.toFixed(2)} lb</b><br>
        Current 7-day avg: <b>${trend.currentAverage.toFixed(2)} lb</b><br>
        Weekly change: <b>${formatRate(trend.weeklyChange)}</b> · Target: <b>${formatRate(scenario.target)}</b><br>
        Tolerance: about <b>±${evaluation.tolerance.toFixed(2)} lb/week</b>
        <div class="coach-target-response"><span>Level Up response</span><strong>${response}</strong></div>
        <span class="coach-target-weights-title">Sample weigh-ins · Week 1</span>
        ${renderWeightWeek(generated.rows.slice(0, 7), 1)}
        <span class="coach-target-weights-title">Sample weigh-ins · Week 2</span>
        ${renderWeightWeek(generated.rows.slice(7, 14), 8)}
        <small class="coach-target-note">Day-to-day noise is repeated across both weeks so the two 7-day averages preserve the intended test rate.</small>
    `;
}

function renderWeightWeek(rows, firstDay) {
    return `<div class="coach-target-week"><div class="coach-target-weights">${rows.map((entry, index) => `<div class="coach-target-weight"><small>D${firstDay + index}</small><b>${entry.weight.toFixed(1)}</b></div>`).join("")}</div></div>`;
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        ensureStyles();
        ensurePanel();
    });
}

function formatRate(value) {
    const number = Number(value);
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/week`;
}

function formatSignedCalories(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) < 0.5) return "0";
    return `${number > 0 ? "+" : "−"}${Math.abs(Math.round(number))}`;
}

function addDays(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return localDate(date);
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function round(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(Number(value) * factor) / factor;
}

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", scheduleRefresh);
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
scheduleRefresh();
