import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_KEY = "forge_weight_entries";
const FOOD_LOG_KEY = "level_up_food_log_v1";
const PHASES_KEY = "level_up_nutrition_phases";
const RANGE_KEY = "level_up_weight_chart_range";
const STYLE_ID = "level-up-weight-context-extended-styles";
const DAY_MS = 86400000;
const TREND_GREEN = "#45cb75";
const WEIGHT_POINT = "rgba(126, 194, 151, 0.82)";
const SODIUM_COLOR = "#d9a441";
const RANGE_OPTIONS = {
    "1w": 7,
    "1m": 30,
    "3m": 90,
    "6m": 180
};

const boundWeightCanvases = new WeakSet();
const boundSodiumCanvases = new WeakSet();
let observer = null;
let refreshQueued = false;
let selectedWeightDate = null;
let selectedSodiumDate = null;

export function initializeExtendedWeightContext(root = document) {
    ensureStyles();
    ensureExtendedContext(root);
    bindRefreshes();
}

function ensureExtendedContext(root = document) {
    const card = root.querySelector?.("#weight-progress .weight-chart-card")
        || document.querySelector("#weight-progress .weight-chart-card");
    if (!card) {
        requestAnimationFrame(() => ensureExtendedContext(root));
        return;
    }

    bindWeightPointSnapshot(card);
    ensureSodiumSlide(card);
    refreshSodiumSlide(card);

    if (!observer) {
        observer = new MutationObserver(() => {
            if (!card.isConnected) return;
            bindWeightPointSnapshot(card);
            ensureSodiumSlide(card);
        });
        observer.observe(card, { childList: true, subtree: true });
    }
}

function bindRefreshes() {
    if (document.documentElement.dataset.weightContextExtendedBound === "1") return;
    document.documentElement.dataset.weightContextExtendedBound = "1";

    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:units-changed", "levelup:nutrition-updated", "levelup:nutrition-phase-updated"]
        .forEach(name => window.addEventListener(name, scheduleRefresh));

    document.addEventListener("click", event => {
        if (event.target.closest?.("button[data-weight-chart-range], #weight-tab, #save-weight-btn, .remove-weight-entry")) {
            selectedWeightDate = null;
            selectedSodiumDate = null;
            setTimeout(scheduleRefresh, 0);
        }
    });
    window.addEventListener("resize", scheduleRefresh);
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        const card = document.querySelector("#weight-progress .weight-chart-card");
        if (!card) return;
        bindWeightPointSnapshot(card);
        ensureSodiumSlide(card);
        refreshSodiumSlide(card);
        updateWeightTooltip(card, selectedWeightDate);
    });
}

function bindWeightPointSnapshot(card) {
    const canvas = card.querySelector("#weight-trend-chart");
    if (!canvas || boundWeightCanvases.has(canvas)) return;
    boundWeightCanvases.add(canvas);

    ensureWeightTooltip(card);
    canvas.style.touchAction = "pan-y";

    canvas.addEventListener("pointerup", event => {
        const match = nearestWeightEntry(canvas, event.clientX);
        if (!match) return;
        selectedWeightDate = selectedWeightDate === match.date ? null : match.date;
        updateWeightTooltip(card, selectedWeightDate);
    });

    canvas.addEventListener("dblclick", () => {
        selectedWeightDate = null;
        updateWeightTooltip(card, null);
    });
}

function ensureWeightTooltip(card) {
    let tooltip = card.querySelector("[data-weight-trend-tooltip-extended]");
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "weight-trend-tooltip-extended";
    tooltip.dataset.weightTrendTooltipExtended = "1";
    tooltip.hidden = true;
    const trendSlide = card.querySelector('[data-weight-graph-slide-v2="trend"]') || card;
    trendSlide.appendChild(tooltip);
    return tooltip;
}

function updateWeightTooltip(card, date) {
    const tooltip = ensureWeightTooltip(card);
    if (!date) {
        tooltip.hidden = true;
        return;
    }

    const entries = readWeights();
    const entry = entries.find(item => item.date === date);
    if (!entry) {
        tooltip.hidden = true;
        return;
    }
    const trend = movingAverageAt(entries, date);
    const unit = massUnit();
    tooltip.innerHTML = `
        <strong>${formatDate(date)}</strong>
        <span>Weight <b>${displayMass(entry.weight).toFixed(1)} ${unit}</b></span>
        <span>7-day trend <b>${Number.isFinite(trend) ? `${displayMass(trend).toFixed(1)} ${unit}` : "—"}</b></span>
    `;
    tooltip.hidden = false;
}

function nearestWeightEntry(canvas, clientX) {
    const entries = visibleWeightEntries();
    if (!entries.length) return null;
    const window = currentWindow(entries);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const paddingLeft = 48;
    const paddingRight = 18;
    const chartWidth = Math.max(1, width - paddingLeft - paddingRight);
    const x = Math.max(paddingLeft, Math.min(width - paddingRight, clientX - rect.left));
    const ratio = (x - paddingLeft) / chartWidth;
    const first = dateMs(window.startDate);
    const elapsed = Math.max(1, dateMs(window.endDate) - first);
    const target = first + ratio * elapsed;
    return entries.reduce((best, entry) => {
        const distance = Math.abs(dateMs(entry.date) - target);
        return !best || distance < best.distance ? { ...entry, distance } : best;
    }, null);
}

function ensureSodiumSlide(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    const pager = card.querySelector(".weight-graph-carousel-pager-v2");
    if (!track || !pager) return;

    let slide = track.querySelector('[data-weight-graph-slide-v2="sodium"]');
    if (!slide) {
        slide = document.createElement("section");
        slide.className = "weight-graph-carousel-slide-v2 is-sodium";
        slide.dataset.weightGraphSlideV2 = "sodium";
        slide.innerHTML = `
            <div class="weight-sodium-head-extended">
                <div>
                    <span class="weight-chart-kicker">WEIGHT CONTEXT</span>
                    <h3>Weight &amp; Sodium</h3>
                    <p>Same 7-day weight trend · daily sodium intake</p>
                </div>
            </div>
            <div class="weight-sodium-chart-shell-extended">
                <canvas data-weight-sodium-canvas-extended role="img" aria-label="Body weight, seven-day weight trend, and daily sodium intake"></canvas>
                <div class="weight-sodium-tooltip-extended" data-weight-sodium-tooltip-extended hidden></div>
            </div>
            <div class="weight-sodium-legend-extended" aria-hidden="true">
                <span><i class="is-weight"></i>Daily weight</span>
                <span><i class="is-trend"></i>7-day trend</span>
                <span><i class="is-sodium"></i>Sodium</span>
            </div>
            <p class="weight-sodium-note-extended">Tap or drag for day details. Double tap to clear details.</p>
            <div class="weight-sodium-empty-extended" data-weight-sodium-empty-extended hidden>
                <strong>More data needed</strong>
                <p>Log foods with sodium data and body weight to compare sodium intake with short-term scale fluctuations.</p>
            </div>
        `;
        track.appendChild(slide);
    }

    let sodiumButton = pager.querySelector('[data-weight-graph-page-v2="2"]');
    if (!sodiumButton) {
        sodiumButton = document.createElement("button");
        sodiumButton.type = "button";
        sodiumButton.dataset.weightGraphPageV2 = "2";
        sodiumButton.setAttribute("aria-pressed", "false");
        sodiumButton.textContent = "Weight + Sodium";
        pager.appendChild(sodiumButton);
    }

    if (pager.dataset.extendedSodiumBound !== "1") {
        pager.dataset.extendedSodiumBound = "1";
        pager.addEventListener("click", event => {
            const button = event.target.closest?.('[data-weight-graph-page-v2="2"]');
            if (!button) return;
            track.scrollTo({ left: 2 * track.clientWidth, behavior: "smooth" });
            setPagerState(pager, 2);
            setTimeout(() => refreshSodiumSlide(card), 80);
        });
        track.addEventListener("scroll", () => requestAnimationFrame(() => {
            const index = Math.max(0, Math.min(2, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
            setPagerState(pager, index);
            if (index === 2) refreshSodiumSlide(card);
        }), { passive: true });
    }
}

function setPagerState(pager, index) {
    pager.querySelectorAll("[data-weight-graph-page-v2]").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.weightGraphPageV2) === index));
    });
}

function refreshSodiumSlide(card) {
    const canvas = card.querySelector("[data-weight-sodium-canvas-extended]");
    if (!canvas) return;
    const state = buildSodiumState();
    canvas.__weightSodiumState = state;

    const shell = card.querySelector(".weight-sodium-chart-shell-extended");
    const legend = card.querySelector(".weight-sodium-legend-extended");
    const empty = card.querySelector("[data-weight-sodium-empty-extended]");
    const available = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.sodium));

    if (available.length < 2 || !state.series.some(day => Number.isFinite(day.sodium))) {
        if (shell) shell.hidden = true;
        if (legend) legend.hidden = true;
        if (empty) empty.hidden = false;
        hideSodiumTooltip(card);
        return;
    }

    if (shell) shell.hidden = false;
    if (legend) legend.hidden = false;
    if (empty) empty.hidden = true;
    if (selectedSodiumDate && !available.some(day => day.date === selectedSodiumDate)) selectedSodiumDate = null;
    drawSodiumChart(canvas, state, selectedSodiumDate);
    bindSodiumInteraction(canvas, card);
    updateSodiumTooltip(card, state, selectedSodiumDate);
}

function buildSodiumState() {
    const weights = readWeights();
    const window = currentWindow(weights);
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const weightsByDate = new Map(weights.map(entry => [entry.date, entry.weight]));
    const trend = calculateMovingAverage(weights);
    const trendByDate = new Map(trend.map(entry => [entry.date, entry.weight]));
    const series = datesBetween(window.startDate, window.endDate).map(date => {
        const foods = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const sodiumValues = foods.map(readSodiumMg).filter(Number.isFinite);
        const sodium = sodiumValues.length ? sodiumValues.reduce((sum, value) => sum + Math.max(0, value), 0) : null;
        return {
            date,
            weight: weightsByDate.get(date) ?? null,
            trend: trendByDate.get(date) ?? null,
            sodium
        };
    });
    return { series, window };
}

function readSodiumMg(entry) {
    const nutrition = entry?.nutrition || {};
    const value = Number(nutrition.sodium ?? nutrition.sodiumMg ?? nutrition.sodium_mg);
    return Number.isFinite(value) ? value : null;
}

function bindSodiumInteraction(canvas, card) {
    if (boundSodiumCanvases.has(canvas)) return;
    boundSodiumCanvases.add(canvas);
    let dragging = false;
    let lastTapAt = 0;

    const select = event => {
        const state = canvas.__weightSodiumState || buildSodiumState();
        const available = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.sodium));
        if (!available.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const ratio = Math.max(0, Math.min(1, (x - 48) / Math.max(1, rect.width - 96)));
        const target = dateMs(state.window.startDate) + ratio * Math.max(1, dateMs(state.window.endDate) - dateMs(state.window.startDate));
        const nearest = available.reduce((best, day) => {
            const distance = Math.abs(dateMs(day.date) - target);
            return !best || distance < best.distance ? { ...day, distance } : best;
        }, null);
        selectedSodiumDate = nearest?.date || null;
        drawSodiumChart(canvas, state, selectedSodiumDate);
        updateSodiumTooltip(card, state, selectedSodiumDate);
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
    canvas.addEventListener("pointerup", event => {
        dragging = false;
        canvas.releasePointerCapture?.(event.pointerId);
        const now = performance.now();
        if (now - lastTapAt <= 360) {
            selectedSodiumDate = null;
            drawSodiumChart(canvas, canvas.__weightSodiumState || buildSodiumState(), null);
            hideSodiumTooltip(card);
            lastTapAt = 0;
            return;
        }
        lastTapAt = now;
    });
    canvas.addEventListener("pointercancel", () => { dragging = false; });
    canvas.addEventListener("dblclick", () => {
        selectedSodiumDate = null;
        drawSodiumChart(canvas, canvas.__weightSodiumState || buildSodiumState(), null);
        hideSodiumTooltip(card);
    });
}

function drawSodiumChart(canvas, state, activeDate) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const { series, window } = state;
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
    const weightValues = series.flatMap(day => [day.weight, day.trend]).filter(Number.isFinite).map(displayMass);
    const sodiumValues = series.map(day => day.sodium).filter(Number.isFinite);
    if (!weightValues.length && !sodiumValues.length) return;

    const unit = massUnit();
    const rawMin = weightValues.length ? Math.min(...weightValues) : 0;
    const rawMax = weightValues.length ? Math.max(...weightValues) : 1;
    const span = Math.max(unit === "kg" ? .45 : 1, rawMax - rawMin);
    const weightPad = Math.max(unit === "kg" ? .35 : .75, span * .18);
    const weightMin = rawMin - weightPad;
    const weightMax = rawMax + weightPad;
    const sodiumMax = Math.max(500, Math.ceil(Math.max(1, ...sodiumValues) / 500) * 500);
    const first = dateMs(window.startDate);
    const elapsed = Math.max(1, dateMs(window.endDate) - first);
    const xForDate = date => padding.left + ((dateMs(date) - first) / elapsed) * chartWidth;
    const yWeight = canonical => padding.top + ((weightMax - displayMass(canonical)) / Math.max(.001, weightMax - weightMin)) * chartHeight;
    const ySodium = value => padding.top + chartHeight - (value / sodiumMax) * chartHeight;

    context.strokeStyle = "rgba(255,255,255,.055)";
    context.lineWidth = 1;
    context.fillStyle = "#777780";
    context.font = "800 9px Arial";
    context.textBaseline = "middle";
    for (let row = 0; row <= 2; row += 1) {
        const y = padding.top + chartHeight * row / 2;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.textAlign = "right";
        context.fillText((weightMax - (weightMax - weightMin) * row / 2).toFixed(1), padding.left - 7, y);
        context.textAlign = "left";
        context.fillText(String(Math.round(sodiumMax - sodiumMax * row / 2)), width - padding.right + 7, y);
    }
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("mg", width - 5, 12);

    const barWidth = Math.max(2, Math.min(14, chartWidth / Math.max(1, series.length) * .52));
    series.forEach(day => {
        if (!Number.isFinite(day.sodium)) return;
        const x = xForDate(day.date);
        const y = ySodium(day.sodium);
        context.globalAlpha = activeDate === day.date ? .92 : .34;
        context.fillStyle = SODIUM_COLOR;
        roundedRect(context, x - barWidth / 2, y, barWidth, padding.top + chartHeight - y, Math.min(4, barWidth / 2));
        context.fill();
    });
    context.globalAlpha = 1;

    const weights = series.filter(day => Number.isFinite(day.weight));
    if (weights.length) {
        context.strokeStyle = "rgba(112, 181, 137, 0.34)";
        context.lineWidth = 1.5;
        context.beginPath();
        weights.forEach((day, index) => {
            const x = xForDate(day.date);
            const y = yWeight(day.weight);
            if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
    }

    const trendPoints = series.filter(day => Number.isFinite(day.trend)).map(day => ({ x: xForDate(day.date), y: yWeight(day.trend) }));
    if (trendPoints.length) {
        context.strokeStyle = TREND_GREEN;
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        traceSmooth(context, trendPoints);
        context.stroke();
    }

    weights.forEach(day => {
        const selected = activeDate === day.date;
        context.beginPath();
        context.arc(xForDate(day.date), yWeight(day.weight), selected ? 5 : 2.6, 0, Math.PI * 2);
        context.fillStyle = selected ? "#fff" : WEIGHT_POINT;
        context.fill();
        if (selected) {
            context.strokeStyle = TREND_GREEN;
            context.lineWidth = 2;
            context.stroke();
        }
    });

    if (activeDate) {
        const x = xForDate(activeDate);
        context.strokeStyle = "rgba(255,255,255,.5)";
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(x, padding.top);
        context.lineTo(x, padding.top + chartHeight);
        context.stroke();
        context.setLineDash([]);
    }

    drawDates(context, series, xForDate, padding.top + chartHeight + 20);
}

function updateSodiumTooltip(card, state, date) {
    const tooltip = card.querySelector("[data-weight-sodium-tooltip-extended]");
    if (!tooltip || !date) {
        if (tooltip) tooltip.hidden = true;
        return;
    }
    const day = state.series.find(item => item.date === date);
    if (!day) {
        tooltip.hidden = true;
        return;
    }
    const unit = massUnit();
    tooltip.innerHTML = `
        <strong>${formatDate(date)}</strong>
        <span>${Number.isFinite(day.weight) ? `${displayMass(day.weight).toFixed(1)} ${unit}` : "No weight logged"}</span>
        <span>${Number.isFinite(day.trend) ? `${displayMass(day.trend).toFixed(1)} ${unit} trend` : "Trend unavailable"}</span>
        <span>${Number.isFinite(day.sodium) ? `${Math.round(day.sodium)} mg sodium` : "No sodium logged"}</span>
    `;
    tooltip.hidden = false;
}

function hideSodiumTooltip(card) {
    const tooltip = card?.querySelector?.("[data-weight-sodium-tooltip-extended]");
    if (tooltip) tooltip.hidden = true;
}

function readWeights() {
    const values = readJson(WEIGHT_KEY, []);
    return Array.isArray(values)
        ? values.map(entry => ({ date: String(entry?.date || ""), weight: Number(entry?.weight) }))
            .filter(entry => entry.date && Number.isFinite(entry.weight) && entry.weight > 0)
            .sort((a, b) => dateMs(a.date) - dateMs(b.date))
        : [];
}

function visibleWeightEntries() {
    const all = readWeights();
    const window = currentWindow(all);
    return all.filter(entry => entry.date >= window.startDate && entry.date <= window.endDate);
}

function currentWindow(weights) {
    const range = String(localStorage.getItem(RANGE_KEY) || "3m").toLowerCase();
    const today = localDate();
    if (range === "phase") {
        const phases = readJson(PHASES_KEY, []);
        const active = Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) : null;
        if (active?.startDate) return { startDate: String(active.startDate), endDate: today };
    }
    if (range === "all") return { startDate: weights[0]?.date || today, endDate: weights.at(-1)?.date || today };
    const days = RANGE_OPTIONS[range] || 90;
    return { startDate: shiftDate(today, -(days - 1)), endDate: today };
}

function calculateMovingAverage(entries) {
    return entries.map(entry => ({ date: entry.date, weight: movingAverageAt(entries, entry.date) }));
}

function movingAverageAt(entries, date) {
    const end = dateMs(date);
    const start = end - 6 * DAY_MS;
    const window = entries.filter(entry => {
        const time = dateMs(entry.date);
        return time >= start && time <= end;
    });
    return window.length ? window.reduce((sum, entry) => sum + entry.weight, 0) / window.length : null;
}

function datesBetween(startDate, endDate) {
    const dates = [];
    let cursor = startDate;
    while (cursor && cursor <= endDate) {
        dates.push(cursor);
        cursor = shiftDate(cursor, 1);
    }
    return dates;
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDate(date);
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(date) { return new Date(`${date}T12:00:00`).getTime(); }
function formatDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }

function traceSmooth(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    if (points.length > 1) context.lineTo(points.at(-1).x, points.at(-1).y);
}

function drawDates(context, series, xForDate, y) {
    const step = Math.max(1, Math.ceil(series.length / 6));
    context.fillStyle = "#777780";
    context.font = "800 8px Arial";
    context.textAlign = "center";
    series.forEach((day, index) => {
        if (index !== 0 && index !== series.length - 1 && index % step !== 0) return;
        context.fillText(formatDate(day.date), xForDate(day.date), y);
    });
}

function roundedRect(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress [data-weight-graph-slide-v2="trend"]{position:relative}
        .weight-trend-tooltip-extended{position:absolute;z-index:7;top:72px;left:50%;transform:translateX(-50%);display:grid;gap:5px;min-width:170px;padding:10px 12px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(24,24,28,.97);box-shadow:0 10px 28px rgba(0,0,0,.4);pointer-events:none}
        .weight-trend-tooltip-extended[hidden]{display:none!important}.weight-trend-tooltip-extended strong{font-size:11px}.weight-trend-tooltip-extended span{display:flex;justify-content:space-between;gap:16px;color:#aaaab3;font-size:10px}.weight-trend-tooltip-extended b{color:#f2f2f4;font-size:10px}
        #weight-progress .weight-graph-carousel-pager-v2{grid-template-columns:repeat(3,minmax(0,1fr))}
        #weight-progress .weight-graph-carousel-pager-v2 button{font-size:8.5px;padding-inline:2px}
        .weight-sodium-head-extended{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.weight-sodium-head-extended h3{margin:3px 0;font-size:18px}.weight-sodium-head-extended p{margin:0;color:#9898a3;font-size:10px}
        .weight-sodium-chart-shell-extended{position:relative;min-height:330px;border-top:1px solid #303036;border-bottom:1px solid #303036}.weight-sodium-chart-shell-extended canvas{display:block;width:100%;height:330px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
        .weight-sodium-tooltip-extended{position:absolute;z-index:5;top:12px;left:50%;transform:translateX(-50%);display:grid;gap:3px;min-width:160px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(24,24,28,.97);box-shadow:0 10px 28px rgba(0,0,0,.4);pointer-events:none}.weight-sodium-tooltip-extended[hidden]{display:none!important}.weight-sodium-tooltip-extended strong{font-size:11px}.weight-sodium-tooltip-extended span{color:#d2d2d7;font-size:10px}
        .weight-sodium-legend-extended{display:flex;flex-wrap:wrap;gap:8px 13px;margin-top:9px;color:#92929c;font-size:9px;font-weight:800}.weight-sodium-legend-extended span{display:flex;align-items:center;gap:5px}.weight-sodium-legend-extended i{display:block;width:13px;height:3px;border-radius:999px}.weight-sodium-legend-extended .is-weight{background:${WEIGHT_POINT}}.weight-sodium-legend-extended .is-trend{background:${TREND_GREEN}}.weight-sodium-legend-extended .is-sodium{height:8px;border-radius:3px;background:${SODIUM_COLOR}}
        .weight-sodium-note-extended{margin:0;color:#777780;font-size:8.5px}.weight-sodium-empty-extended{padding:15px;border:1px dashed #3a3a42;border-radius:14px;background:#1b1b1f}.weight-sodium-empty-extended strong{font-size:14px}.weight-sodium-empty-extended p{margin:5px 0 0;color:#9696a0;font-size:11px}
        @media(max-width:520px){.weight-sodium-chart-shell-extended,.weight-sodium-chart-shell-extended canvas{min-height:330px;height:330px}}
    `;
    document.head.appendChild(style);
}
