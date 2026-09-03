import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_KEY = "forge_weight_entries";
const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const PHASES_KEY = "level_up_nutrition_phases";
const RANGE_KEY = "level_up_weight_chart_range";
const STYLE_ID = "level-up-weight-calorie-context-v2-styles";
const CALORIE_COLOR = "#ff5a5f";
const TREND_GREEN = "#45cb75";
const DAILY_WEIGHT = "rgba(126,194,151,.82)";
const DAILY_WEIGHT_LINE = "rgba(112,181,137,.34)";
const RANGE_OPTIONS = {
    "1w": { days: 7 },
    "1m": { days: 30 },
    "3m": { days: 90 },
    "6m": { days: 180 },
    phase: {},
    all: {}
};

let selectedDate = null;
let queued = false;

export function initializeWeightCalorieContextV2(root = document) {
    ensureStyles();
    ensureSlide(root);
    bindGlobalRefreshes();
    schedule(root);
}

function ensureSlide(root) {
    const card = root.querySelector?.("#weight-progress .weight-chart-card") || document.querySelector("#weight-progress .weight-chart-card");
    if (!card) return;
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    const pager = card.querySelector(".weight-graph-carousel-pager-v2");
    if (!track || !pager) return;

    let slide = track.querySelector('[data-weight-graph-slide-v2="calories"]');
    if (!slide) {
        slide = document.createElement("section");
        slide.className = "weight-graph-carousel-slide-v2 is-calories";
        slide.dataset.weightGraphSlideV2 = "calories";
        slide.innerHTML = renderSlide();
        track.appendChild(slide);
    }

    let button = pager.querySelector('[data-weight-graph-page-v2="2"]');
    if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.dataset.weightGraphPageV2 = "2";
        button.setAttribute("aria-pressed", "false");
        button.textContent = "Weight + Calories";
        pager.appendChild(button);
    }
    pager.classList.add("has-three-weight-pages");

    if (pager.dataset.calorieV2Bound !== "1") {
        pager.dataset.calorieV2Bound = "1";
        pager.addEventListener("click", event => {
            const target = event.target.closest?.('[data-weight-graph-page-v2="2"]');
            if (!target) return;
            track.scrollTo({ left: 2 * track.clientWidth, behavior: "smooth" });
        });
        track.addEventListener("scroll", () => requestAnimationFrame(() => syncPager(card)), { passive: true });
    }

    bindCanvas(card);
}

function renderSlide() {
    return `
        <div class="weight-calories-head">
            <div>
                <span class="weight-chart-kicker">WEIGHT CONTEXT</span>
                <h3>Weight &amp; Calories</h3>
                <p>Same smoothed Trend Weight · daily calorie intake</p>
            </div>
            <details class="weight-calories-info">
                <summary aria-label="How calorie intake relates to weight trend">i</summary>
                <div>
                    <strong>How calories relate to weight trend</strong>
                    <p>Daily calories can fluctuate, so the useful signal is how intake lines up with your smoothed Trend Weight across days and weeks.</p>
                    <small>Short-term scale changes can still reflect water, glycogen, food volume and training-related inflammation.</small>
                </div>
            </details>
        </div>
        <div class="weight-calories-chart-shell">
            <canvas data-weight-calories-canvas role="img" aria-label="Body weight, smoothed Trend Weight, and daily calorie intake"></canvas>
            <div class="weight-calories-tooltip" data-weight-calories-tooltip hidden></div>
        </div>
        <div class="weight-calories-legend" aria-hidden="true">
            <span><i class="is-weight"></i>Daily weight</span>
            <span><i class="is-trend"></i>Trend Weight</span>
            <span><i class="is-calories"></i>Calories</span>
        </div>
        <p class="weight-calories-note">Tap or drag for weight, Trend Weight and calorie values. Today appears after calorie tracking is marked complete.</p>
        <div class="weight-calories-empty" data-weight-calories-empty hidden>
            <strong>More calorie data needed</strong>
            <p>Log food to compare daily calorie intake with your weight trend.</p>
        </div>
    `;
}

function syncPager(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    if (!track) return;
    const index = Math.max(0, Math.min(2, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    card.querySelectorAll("[data-weight-graph-page-v2]").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.weightGraphPageV2) === index));
    });
    if (index === 2) schedule(card);
}

function bindCanvas(card) {
    const canvas = card.querySelector("[data-weight-calories-canvas]");
    if (!canvas || canvas.dataset.calorieV2Bound === "1") return;
    canvas.dataset.calorieV2Bound = "1";
    let dragging = false;

    const select = event => {
        const state = canvas.__weightCaloriesV2State || buildState();
        const candidates = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.calories));
        if (!candidates.length) return;
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - 48) / Math.max(1, rect.width - 96)));
        const first = dateMs(state.window.startDate);
        const target = first + ratio * Math.max(1, dateMs(state.window.endDate) - first);
        let nearest = candidates[0];
        let distance = Infinity;
        candidates.forEach(day => {
            const delta = Math.abs(dateMs(day.date) - target);
            if (delta < distance) { distance = delta; nearest = day; }
        });
        selectedDate = nearest.date;
        draw(canvas, state, selectedDate);
        updateTooltip(card, state, selectedDate);
    };

    canvas.addEventListener("pointerdown", event => {
        dragging = true;
        canvas.setPointerCapture?.(event.pointerId);
        select(event);
    });
    canvas.addEventListener("pointermove", event => {
        if (!dragging) return;
        event.preventDefault();
        select(event);
    });
    const stop = event => {
        dragging = false;
        canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
}

function buildState() {
    const today = localDate();
    const weights = normalizeWeightEntries(readJson(WEIGHT_KEY, [])).filter(entry => entry.date <= today);
    const phase = readActivePhase();
    const range = readRange(phase);
    const window = chartWindow(range, weights, phase);
    const trendSeries = calculateTrendWeightSeries(weights).filter(entry => entry.date >= window.startDate && entry.date <= window.endDate);
    const trendByDate = new Map(trendSeries.map(entry => [entry.date, entry.weight]));
    const weightByDate = new Map(weights.map(entry => [entry.date, entry.weight]));
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const completeDays = readJson(FOOD_COMPLETE_KEY, {});
    const series = datesBetween(window.startDate, window.endDate).map(date => {
        const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const include = date !== today || completeDays?.[date] === true;
        const calories = include && entries.length
            ? entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0)
            : null;
        return {
            date,
            weight: weightByDate.get(date) ?? null,
            trend: trendByDate.get(date) ?? null,
            calories: Number.isFinite(calories) ? calories : null
        };
    });
    return { weights, trendSeries, series, window, range };
}

function refresh(root = document) {
    queued = false;
    ensureSlide(root);
    const card = root.querySelector?.("#weight-progress .weight-chart-card") || document.querySelector("#weight-progress .weight-chart-card");
    const canvas = card?.querySelector("[data-weight-calories-canvas]");
    if (!card || !canvas) return;
    const state = buildState();
    canvas.__weightCaloriesV2State = state;
    const empty = card.querySelector("[data-weight-calories-empty]");
    if (empty) empty.hidden = state.series.some(day => Number.isFinite(day.calories));
    if (selectedDate && !state.series.some(day => day.date === selectedDate)) selectedDate = null;
    draw(canvas, state, selectedDate);
    updateTooltip(card, state, selectedDate);
    bindCanvas(card);
}

function schedule(root = document) {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => refresh(root));
}

function draw(canvas, state, activeDate) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const height = width <= 520 ? 330 : 380;
    const scale = globalThis.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { left: 48, right: 48, top: 20, bottom: 40 };
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const unit = massUnit();
    const weightValues = [...state.series.map(day => day.weight), ...state.trendSeries.map(day => day.weight)].filter(Number.isFinite).map(displayMass);
    const calorieValues = state.series.map(day => day.calories).filter(Number.isFinite);
    if (!weightValues.length && !calorieValues.length) return;

    const minRaw = weightValues.length ? Math.min(...weightValues) : 0;
    const maxRaw = weightValues.length ? Math.max(...weightValues) : 1;
    const span = Math.max(unit === "kg" ? .45 : 1, maxRaw - minRaw);
    const pad = Math.max(unit === "kg" ? .35 : .75, span * .18);
    const minimum = minRaw - pad;
    const maximum = maxRaw + pad;
    const calorieMax = Math.max(500, Math.ceil(Math.max(1, ...calorieValues) / 500) * 500);
    const first = dateMs(state.window.startDate);
    const elapsed = Math.max(1, dateMs(state.window.endDate) - first);
    const x = date => padding.left + ((dateMs(date) - first) / elapsed) * chartWidth;
    const yWeight = weight => padding.top + ((maximum - displayMass(weight)) / Math.max(.001, maximum - minimum)) * chartHeight;
    const yCalories = calories => padding.top + chartHeight - (calories / calorieMax) * chartHeight;

    context.strokeStyle = "rgba(255,255,255,.055)";
    context.fillStyle = "#777780";
    context.font = "800 9px Arial";
    context.lineWidth = 1;
    context.textBaseline = "middle";
    for (let row = 0; row <= 2; row += 1) {
        const yy = padding.top + chartHeight * row / 2;
        context.beginPath();
        context.moveTo(padding.left, yy);
        context.lineTo(width - padding.right, yy);
        context.stroke();
        context.textAlign = "right";
        context.fillText((maximum - (maximum - minimum) * row / 2).toFixed(1), padding.left - 7, yy);
        context.textAlign = "left";
        context.fillText(String(Math.round(calorieMax - calorieMax * row / 2)), width - padding.right + 7, yy);
    }
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("kcal", width - 5, 12);

    const barWidth = Math.max(2, Math.min(14, chartWidth / Math.max(1, state.series.length) * .52));
    state.series.forEach(day => {
        if (!Number.isFinite(day.calories)) return;
        const xx = x(day.date);
        const yy = yCalories(day.calories);
        context.globalAlpha = activeDate === day.date ? .94 : .35;
        context.fillStyle = CALORIE_COLOR;
        roundRect(context, xx - barWidth / 2, yy, barWidth, padding.top + chartHeight - yy, Math.min(4, barWidth / 2));
        context.fill();
    });
    context.globalAlpha = 1;

    const raw = state.series.filter(day => Number.isFinite(day.weight));
    if (raw.length > 1) {
        context.beginPath();
        raw.forEach((day, index) => index ? context.lineTo(x(day.date), yWeight(day.weight)) : context.moveTo(x(day.date), yWeight(day.weight)));
        context.strokeStyle = DAILY_WEIGHT_LINE;
        context.lineWidth = 1.5;
        context.stroke();
    }
    raw.forEach(day => {
        context.beginPath();
        context.arc(x(day.date), yWeight(day.weight), activeDate === day.date ? 5 : 2.6, 0, Math.PI * 2);
        context.fillStyle = activeDate === day.date ? "#fff" : DAILY_WEIGHT;
        context.fill();
    });

    if (state.trendSeries.length > 1) {
        const points = state.trendSeries.map(day => ({ x: x(day.date), y: yWeight(day.weight) }));
        context.save();
        context.shadowColor = "rgba(69,203,117,.3)";
        context.shadowBlur = 8;
        context.strokeStyle = TREND_GREEN;
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        traceSmoothLine(context, points);
        context.stroke();
        context.restore();
    }
}

function updateTooltip(card, state, date) {
    const tooltip = card.querySelector("[data-weight-calories-tooltip]");
    if (!tooltip) return;
    if (!date) { tooltip.hidden = true; return; }
    const day = state.series.find(item => item.date === date);
    if (!day) { tooltip.hidden = true; return; }
    const unit = massUnit();
    const weight = Number.isFinite(day.weight) ? displayMass(day.weight) : null;
    const trend = Number.isFinite(day.trend) ? displayMass(day.trend) : null;
    tooltip.innerHTML = `<strong>${formatDate(date)}</strong><span><b>Weight</b>${Number.isFinite(weight) ? `${weight.toFixed(1)} ${unit}` : "—"}</span><span><b>Trend Weight</b>${Number.isFinite(trend) ? `${trend.toFixed(1)} ${unit}` : "—"}</span><span><b>Calories</b>${Number.isFinite(day.calories) ? `${Math.round(day.calories)} kcal` : "—"}</span>`;
    tooltip.hidden = false;
}

function bindGlobalRefreshes() {
    if (document.documentElement.dataset.weightCaloriesV2Events === "1") return;
    document.documentElement.dataset.weightCaloriesV2Events = "1";
    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:units-changed", "levelup:nutrition-updated", "levelup:nutrition-phase-updated"]
        .forEach(name => window.addEventListener(name, () => schedule(document)));
    window.addEventListener("resize", () => schedule(document), { passive: true });
    document.addEventListener("click", event => {
        if (event.target.closest?.("button[data-weight-chart-range], #weight-tab, #save-weight-btn, .remove-weight-entry")) {
            selectedDate = null;
            window.setTimeout(() => schedule(document), 0);
        }
    });
}

function readActivePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null : null;
}
function readRange(phase) {
    const saved = String(localStorage.getItem(RANGE_KEY) || "3m").toLowerCase();
    if (!RANGE_OPTIONS[saved]) return "3m";
    if (saved === "phase" && !phase?.startDate) return "3m";
    return saved;
}
function chartWindow(range, weights, phase) {
    const today = localDate();
    if (range === "phase" && phase?.startDate) return { startDate: String(phase.startDate), endDate: today };
    if (range === "all") return { startDate: weights[0]?.date || today, endDate: weights.at(-1)?.date || today };
    return { startDate: shiftDate(today, -(Number(RANGE_OPTIONS[range]?.days || 90) - 1)), endDate: today };
}
function datesBetween(startDate, endDate) {
    const result = [];
    let cursor = startDate;
    while (cursor && cursor <= endDate) { result.push(cursor); cursor = shiftDate(cursor, 1); }
    return result;
}
function traceSmoothLine(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    if (points.length > 1) context.lineTo(points.at(-1).x, points.at(-1).y);
}
function roundRect(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    context.beginPath(); context.moveTo(x + r, y); context.arcTo(x + width, y, x + width, y + height, r); context.arcTo(x + width, y + height, x, y + height, r); context.arcTo(x, y + height, x, y, r); context.arcTo(x, y, x + width, y, r); context.closePath();
}
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function dateMs(date) { return new Date(`${date}T12:00:00`).getTime(); }
function shiftDate(value, days) { const date = new Date(`${value}T12:00:00`); if (!Number.isFinite(date.getTime())) return null; date.setDate(date.getDate() + Number(days || 0)); return localDate(date); }
function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .weight-graph-carousel-slide-v2.is-calories{padding:0 1px}.weight-calories-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.weight-calories-head h3{margin:3px 0;font-size:18px}.weight-calories-head p{margin:0;color:#9898a3;font-size:10px}
        .weight-calories-info{position:relative}.weight-calories-info summary{display:grid;place-items:center;width:30px;height:30px;border:1px solid #3b3b42;border-radius:50%;background:#242429;color:#c6c6cd;font-weight:900;list-style:none}.weight-calories-info summary::-webkit-details-marker{display:none}.weight-calories-info>div{position:absolute;z-index:8;top:36px;right:0;width:min(300px,calc(100vw - 52px));padding:12px;border:1px solid #3a3a41;border-radius:14px;background:#202024;box-shadow:0 14px 36px rgba(0,0,0,.5)}.weight-calories-info p{margin:6px 0;color:#a1a1aa;font-size:10px;line-height:1.45}.weight-calories-info small{color:#85858e;font-size:9px;line-height:1.4}
        .weight-calories-chart-shell{position:relative;min-height:330px;border-top:1px solid #303036;border-bottom:1px solid #303036}.weight-calories-chart-shell canvas{display:block;width:100%;height:330px;touch-action:pan-y}.weight-calories-tooltip{position:absolute;z-index:5;top:12px;left:12px;display:grid;gap:3px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(24,24,28,.97);box-shadow:0 10px 28px rgba(0,0,0,.4)}.weight-calories-tooltip strong{font-size:11px}.weight-calories-tooltip span{display:flex;justify-content:space-between;gap:14px;color:#d2d2d7;font-size:10px}.weight-calories-tooltip b{color:#8f8f99;font-size:9px}
        .weight-calories-legend{display:flex;flex-wrap:wrap;gap:8px 13px;margin-top:9px;color:#92929c;font-size:9px;font-weight:800}.weight-calories-legend span{display:flex;align-items:center;gap:5px}.weight-calories-legend i{display:block;width:13px;height:3px;border-radius:999px}.weight-calories-legend .is-weight{background:${DAILY_WEIGHT}}.weight-calories-legend .is-trend{background:${TREND_GREEN}}.weight-calories-legend .is-calories{height:8px;border-radius:3px;background:${CALORIE_COLOR}}
        .weight-calories-note{margin:0;color:#777780;font-size:8.5px}.weight-calories-empty{padding:15px;border:1px dashed #3a3a42;border-radius:14px;background:#1b1b1f}.weight-calories-empty strong{font-size:14px}.weight-calories-empty p{margin:5px 0 0;color:#9696a0;font-size:11px}
        @media(max-width:520px){.weight-calories-chart-shell,.weight-calories-chart-shell canvas{min-height:330px;height:330px}}
    `;
    document.head.appendChild(style);
}
