import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";
import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const GOAL_WEIGHT_STORAGE_KEY = "level_up_goal_weight";
const NUTRITION_PHASES_STORAGE_KEY = "level_up_nutrition_phases";
const RANGE_STORAGE_KEY = "level_up_weight_chart_range";
const RANGE_STYLE_ID = "level-up-weight-chart-range-styles";
const TREND_GREEN = "#45cb75";
const DAILY_WEIGHT_LINE = "rgba(112, 181, 137, 0.34)";
const DAILY_WEIGHT_POINT = "rgba(126, 194, 151, 0.82)";
const RANGE_OPTIONS = [
    { id: "1w", label: "1W", days: 7 },
    { id: "1m", label: "1M", days: 30 },
    { id: "3m", label: "3M", days: 90 },
    { id: "6m", label: "6M", days: 180 },
    { id: "phase", label: "PHASE" },
    { id: "all", label: "ALL" }
];

let queued = false;

function themeColor(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return localDateString(date);
}

function readWeightEntries() {
    try {
        const entries = normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]"));
        const today = localDateString();
        return entries.filter(entry => entry.date <= today);
    } catch {
        return [];
    }
}

function readNutritionPhases() {
    try {
        const phases = JSON.parse(localStorage.getItem(NUTRITION_PHASES_STORAGE_KEY) || "[]");
        return Array.isArray(phases) ? phases : [];
    } catch {
        return [];
    }
}

function readActiveNutritionPhase() {
    return [...readNutritionPhases()].reverse().find(phase => phase?.startDate && !phase?.endDate) || null;
}

function readGoalWeight() {
    const phase = readActiveNutritionPhase();
    const phaseValue = Number(phase?.goalWeight ?? phase?.targetWeight);
    if (Number.isFinite(phaseValue) && phaseValue > 0) return phaseValue;
    const value = Number(localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function readSelectedRange(activePhase) {
    const saved = String(localStorage.getItem(RANGE_STORAGE_KEY) || "3m").toLowerCase();
    if (!RANGE_OPTIONS.some(option => option.id === saved)) return "3m";
    if (saved === "phase" && !activePhase?.startDate) return "3m";
    return saved;
}

function chartWindow(range, entries, activePhase) {
    const today = localDateString();
    if (range === "phase" && activePhase?.startDate) {
        return { startDate: String(activePhase.startDate), endDate: today, label: "Current phase" };
    }
    if (range === "all") {
        return {
            startDate: entries[0]?.date || today,
            endDate: entries.at(-1)?.date || today,
            label: "All time"
        };
    }
    const option = RANGE_OPTIONS.find(item => item.id === range) || RANGE_OPTIONS[2];
    return {
        startDate: shiftDate(today, -((Number(option.days) || 90) - 1)),
        endDate: today,
        label: option.label
    };
}

function filterWindow(entries, window) {
    return entries.filter(entry => entry.date >= window.startDate && entry.date <= window.endDate);
}

function ensureRangeStyles() {
    if (document.getElementById(RANGE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = RANGE_STYLE_ID;
    style.textContent = `
        #weight-progress .weight-chart-range-control{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin:10px 0 6px;padding:3px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.025)}
        #weight-progress .weight-chart-range-control button{min-width:0;min-height:32px;margin:0;padding:5px 3px;border:1px solid transparent;border-radius:8px;background:transparent;color:#8f8f98;font-size:10px;font-weight:900;letter-spacing:.02em;line-height:1;touch-action:manipulation}
        #weight-progress .weight-chart-range-control button[aria-pressed="true"]{border-color:rgba(69,203,117,.45);background:rgba(31,92,55,.52);color:#fff;box-shadow:inset 0 0 0 1px rgba(69,203,117,.08)}
        #weight-progress .weight-chart-range-control button:disabled{opacity:.32}
        @media(max-width:380px){#weight-progress .weight-chart-range-control{gap:3px;padding:3px}#weight-progress .weight-chart-range-control button{min-height:30px;padding-inline:2px;font-size:9px}}
    `;
    document.head.appendChild(style);
}

function ensureRangeControls(legacyCanvas, selectedRange, activePhase) {
    const card = legacyCanvas.closest(".weight-chart-card") || legacyCanvas.parentElement;
    if (!card) return;
    let controls = card.querySelector(".weight-chart-range-control");
    if (!controls) {
        controls = document.createElement("div");
        controls.className = "weight-chart-range-control";
        controls.setAttribute("role", "group");
        controls.setAttribute("aria-label", "Weight chart timeframe");
        controls.innerHTML = RANGE_OPTIONS.map(option => `<button type="button" data-weight-chart-range="${option.id}" aria-pressed="false">${option.label}</button>`).join("");
        legacyCanvas.insertAdjacentElement("beforebegin", controls);
    }
    controls.querySelectorAll("button[data-weight-chart-range]").forEach(button => {
        const range = button.dataset.weightChartRange;
        const unavailable = range === "phase" && !activePhase?.startDate;
        button.disabled = unavailable;
        button.setAttribute("aria-pressed", String(range === selectedRange));
        button.title = unavailable ? "Start a nutrition phase to use this timeframe" : "";
    });
}

function formatDate(value, includeYear = false) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "2-digit" } : {})
    });
}

function formatPeriodDateRange(startDate, endDate) {
    if (!startDate || !endDate) return "—";
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startLabel = start.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const endLabel = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return sameYear ? `${startLabel} – ${endLabel}` : `${startLabel}, ${start.getFullYear()} – ${endLabel}`;
}

function updatePeriodSummary(card, trendSeries) {
    if (!card) return;
    const averageNode = card.querySelector("[data-weight-chart-average]");
    const changeNode = card.querySelector("[data-weight-chart-change]");
    const periodNode = card.querySelector("[data-weight-chart-period]");
    const values = trendSeries.map(item => item.weight).filter(Number.isFinite);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const change = values.length >= 2 ? values.at(-1) - values[0] : null;
    const shownAverage = Number.isFinite(average) ? displayMass(average) : null;
    const shownChange = Number.isFinite(change) ? displayMass(change) : null;
    const unit = massUnit();

    if (averageNode) averageNode.textContent = Number.isFinite(shownAverage) ? `${shownAverage.toFixed(1)} ${unit}` : "—";
    if (changeNode) {
        changeNode.textContent = Number.isFinite(shownChange)
            ? `${shownChange > 0 ? "+" : shownChange < 0 ? "−" : ""}${Math.abs(shownChange).toFixed(1)} ${unit}`
            : "—";
    }
    if (periodNode) {
        periodNode.textContent = trendSeries.length
            ? formatPeriodDateRange(trendSeries[0].date, trendSeries.at(-1).date)
            : "No trend data in this period";
    }
}

function drawChart(canvas, entries, trendSeries, goalWeight, window, totalEntries) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const height = width <= 520 ? 330 : 380;
    const scale = globalThis.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);

    if (!entries.length && !trendSeries.length) {
        context.fillStyle = themeColor("--text", "#d6d6db");
        context.font = "600 14px Arial";
        context.fillText(totalEntries ? "No weight entries in this range." : "Add a weight entry to display the graph.", 20, 50);
        return;
    }

    const values = [...entries.map(item => item.weight), ...trendSeries.map(item => item.weight)].filter(Number.isFinite);
    if (!values.length) return;
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = Math.max(0.5, rawMax - rawMin);
    const yPad = Math.max(0.75, span * 0.18);
    let minimum = rawMin - yPad;
    let maximum = rawMax + yPad;
    const showGoal = Number.isFinite(goalWeight) && goalWeight > 0 && (goalWeight >= minimum && goalWeight <= maximum);
    if (showGoal) {
        minimum = Math.min(minimum, goalWeight - .5);
        maximum = Math.max(maximum, goalWeight + .5);
    }

    const padding = { left: 50, right: 18, top: 20, bottom: 42 };
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const firstTime = dateMs(window.startDate);
    const lastTime = dateMs(window.endDate);
    const elapsed = Math.max(1, lastTime - firstTime);
    const yRange = Math.max(1, maximum - minimum);
    const x = date => padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth;
    const y = weight => padding.top + ((maximum - weight) / yRange) * chartHeight;

    context.lineWidth = 1;
    context.strokeStyle = themeColor("--line", "rgba(255,255,255,.07)");
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "10px Arial";
    context.textAlign = "right";
    for (let index = 0; index <= 3; index++) {
        const fraction = index / 3;
        const yy = padding.top + chartHeight * fraction;
        const weight = maximum - yRange * fraction;
        context.beginPath();
        context.moveTo(padding.left, yy);
        context.lineTo(width - padding.right, yy);
        context.stroke();
        const shown = displayMass(weight);
        context.fillText(Number.isFinite(shown) ? shown.toFixed(1) : "", padding.left - 8, yy + 3);
    }

    if (entries.length >= 2) {
        context.beginPath();
        entries.forEach((entry, index) => {
            const xx = x(entry.date);
            const yy = y(entry.weight);
            if (index === 0) context.moveTo(xx, yy); else context.lineTo(xx, yy);
        });
        context.strokeStyle = DAILY_WEIGHT_LINE;
        context.lineWidth = 1.4;
        context.stroke();
    }

    entries.forEach(entry => {
        context.beginPath();
        context.arc(x(entry.date), y(entry.weight), 2.7, 0, Math.PI * 2);
        context.fillStyle = DAILY_WEIGHT_POINT;
        context.fill();
    });

    if (trendSeries.length >= 2) {
        context.save();
        context.shadowColor = "rgba(69,203,117,.3)";
        context.shadowBlur = 8;
        context.beginPath();
        trendSeries.forEach((entry, index) => {
            const xx = x(entry.date);
            const yy = y(entry.weight);
            if (index === 0) context.moveTo(xx, yy); else context.lineTo(xx, yy);
        });
        context.strokeStyle = themeColor("--success", TREND_GREEN);
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();
        context.restore();
    }

    if (showGoal) {
        context.save();
        context.setLineDash([5, 5]);
        context.strokeStyle = themeColor("--muted", "rgba(255,255,255,.35)");
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(padding.left, y(goalWeight));
        context.lineTo(width - padding.right, y(goalWeight));
        context.stroke();
        context.restore();
    }

    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "10px Arial";
    context.textAlign = "left";
    context.fillText(formatDate(window.startDate, window.startDate.slice(0, 4) !== window.endDate.slice(0, 4)), padding.left, height - 14);
    context.textAlign = "center";
    const mid = new Date((firstTime + lastTime) / 2);
    context.fillText(formatDate(localDateString(mid)), padding.left + chartWidth / 2, height - 14);
    context.textAlign = "right";
    context.fillText(formatDate(window.endDate), width - padding.right, height - 14);

    context.textAlign = "left";
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "9px Arial";
    context.fillText(massUnit(), 8, 14);
}

function enhanceWeightChart() {
    queued = false;
    const legacyCanvas = document.getElementById("weight-chart");
    if (!legacyCanvas) return;
    ensureRangeStyles();
    legacyCanvas.hidden = true;

    const entries = readWeightEntries();
    const activePhase = readActiveNutritionPhase();
    const selectedRange = readSelectedRange(activePhase);
    const window = chartWindow(selectedRange, entries, activePhase);
    const trendSeries = calculateTrendWeightSeries(entries);
    const visibleEntries = filterWindow(entries, window);
    const visibleTrend = filterWindow(trendSeries, window);
    ensureRangeControls(legacyCanvas, selectedRange, activePhase);

    let canvas = document.getElementById("weight-trend-chart");
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "weight-trend-chart";
        canvas.className = legacyCanvas.className;
        canvas.setAttribute("role", "img");
        legacyCanvas.insertAdjacentElement("afterend", canvas);
    }
    canvas.setAttribute("aria-label", `Weight chart for ${window.label}, showing daily weigh-ins and smoothed Trend Weight`);

    const card = legacyCanvas.closest(".weight-chart-card");
    updatePeriodSummary(card, visibleTrend);
    drawChart(canvas, visibleEntries, visibleTrend, readGoalWeight(), window, entries.length);
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(enhanceWeightChart);
}

document.addEventListener("click", event => {
    const button = event.target.closest?.("button[data-weight-chart-range]");
    if (!button) return;
    const range = String(button.dataset.weightChartRange || "");
    if (!RANGE_OPTIONS.some(option => option.id === range)) return;
    localStorage.setItem(RANGE_STORAGE_KEY, range);
    schedule();
});

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:nutrition-phase-updated", schedule);

document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 60);
        window.setTimeout(schedule, 220);
    }
}, true);

schedule();
