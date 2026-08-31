import { normalizeWeightEntries } from "../core/weight-trend.js?v=weight-carousel-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const SHARED_RANGE_KEY = "level_up_weight_chart_range";
const DAY_MS = 86400000;
const CARB_COLOR = "#4fa8ff";
const TREND_GREEN = "#45cb75";
const TREND_GREEN_GLOW = "rgba(69, 203, 117, 0.32)";
const DAILY_WEIGHT_LINE = "rgba(112, 181, 137, 0.34)";
const DAILY_WEIGHT_POINT = "rgba(126, 194, 151, 0.82)";
const DAILY_WEIGHT_POINT_RADIUS = 2.6;
const RANGE_OPTIONS = {
    "1w": { days: 7, label: "1W" },
    "1m": { days: 30, label: "1M" },
    "3m": { days: 90, label: "3M" },
    "6m": { days: 180, label: "6M" },
    phase: { label: "PHASE" },
    all: { label: "ALL" }
};

let activeDate = null;
let queued = false;
let boundCanvas = null;
let boundShell = null;
let documentBound = false;

export function initializeWeightCarbsTrendParityFix(root = document) {
    const card = root.querySelector?.("#weight-progress .weight-chart-card") || document.querySelector("#weight-progress .weight-chart-card");
    if (!card) return;
    bindGlobalRefreshes(card);
    scheduleRedraw(card);
}

// Keep this implementation identical to the primary Weight Trend graph.
function calculateMovingAverage(entries) {
    return entries.map(entry => {
        const currentTime = dateMs(entry.date);
        const windowStart = currentTime - (6 * DAY_MS);
        const windowEntries = entries.filter(item => {
            const itemTime = dateMs(item.date);
            return itemTime >= windowStart && itemTime <= currentTime;
        });
        const average = windowEntries.reduce((sum, item) => sum + item.weight, 0) / windowEntries.length;
        return { date: entry.date, weight: average };
    });
}

function traceSmoothLine(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    if (points.length === 1) return;
    for (let index = 1; index < points.length - 1; index++) {
        const current = points[index];
        const next = points[index + 1];
        const midpointX = (current.x + next.x) / 2;
        const midpointY = (current.y + next.y) / 2;
        context.quadraticCurveTo(current.x, current.y, midpointX, midpointY);
    }
    context.lineTo(points.at(-1).x, points.at(-1).y);
}

function bindGlobalRefreshes(card) {
    if (card.dataset.weightCarbsParityBound !== "1") {
        card.dataset.weightCarbsParityBound = "1";
        ["levelup:food-log-updated", "levelup:weight-updated", "levelup:units-changed", "levelup:nutrition-updated", "levelup:nutrition-phase-updated"]
            .forEach(name => window.addEventListener(name, () => window.setTimeout(() => scheduleRedraw(card), 0)));
        window.addEventListener("resize", () => window.setTimeout(() => scheduleRedraw(card), 0));
        document.addEventListener("click", event => {
            if (event.target.closest?.("button[data-weight-chart-range], #weight-tab, #save-weight-btn, .remove-weight-entry")) {
                activeDate = null;
                window.setTimeout(() => scheduleRedraw(card), 0);
            }
        });
    }

    bindCanvas(card);

    if (!documentBound) {
        documentBound = true;
        document.addEventListener("pointerdown", event => {
            const tooltip = document.querySelector("#weight-progress [data-weight-carbs-tooltip]");
            if (!tooltip || tooltip.hidden) return;
            const canvas = document.querySelector("#weight-progress [data-weight-carbs-canvas]");
            if (event.target === canvas) return;
            activeDate = null;
            window.setTimeout(() => scheduleRedraw(card), 0);
        }, true);
    }
}

function bindCanvas(card) {
    const canvas = card.querySelector("[data-weight-carbs-canvas]");
    const shell = card.querySelector(".weight-carbs-chart-shell");
    if (!canvas || !shell) {
        window.setTimeout(() => scheduleRedraw(card), 20);
        return;
    }

    if (boundCanvas !== canvas) {
        boundCanvas = canvas;
        let dragging = false;

        const select = event => {
            const state = buildState();
            if (!state.series.length) return;
            const available = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
            if (!available.length) return;
            const rect = canvas.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
            const chartWidth = Math.max(1, rect.width - 96);
            const ratio = Math.max(0, Math.min(1, (x - 48) / chartWidth));
            const targetIndex = Math.round(ratio * Math.max(0, state.series.length - 1));
            let nearest = available[0];
            let nearestDistance = Infinity;
            available.forEach(day => {
                const index = state.series.findIndex(item => item.date === day.date);
                const distance = Math.abs(index - targetIndex);
                if (distance < nearestDistance) {
                    nearest = day;
                    nearestDistance = distance;
                }
            });
            activeDate = nearest.date;
            window.setTimeout(() => {
                redraw(card, state);
                updateTooltip(card, state, activeDate);
            }, 0);
        };

        canvas.addEventListener("pointerdown", event => {
            dragging = true;
            select(event);
        });
        canvas.addEventListener("pointermove", event => {
            if (!dragging) return;
            select(event);
        });
        canvas.addEventListener("pointerup", () => { dragging = false; });
        canvas.addEventListener("pointercancel", () => { dragging = false; });
    }

    if (boundShell !== shell) {
        boundShell = shell;
        shell.addEventListener("pointerdown", event => {
            const tooltip = card.querySelector("[data-weight-carbs-tooltip]");
            if (!tooltip || tooltip.hidden || !activeDate) return;
            const rect = tooltip.getBoundingClientRect();
            const insideTooltip = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
            if (insideTooltip) return;

            // A tap anywhere outside the visible summary dismisses details first.
            // Stop the canvas handler from immediately selecting another day.
            event.preventDefault();
            event.stopImmediatePropagation();
            activeDate = null;
            const state = buildState();
            redraw(card, state);
            hideTooltip(card);
        }, true);
    }
}

function scheduleRedraw(card) {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
        queued = false;
        if (!card.isConnected) return;
        bindCanvas(card);
        const state = buildState();
        redraw(card, state);
        if (activeDate) updateTooltip(card, state, activeDate);
        else hideTooltip(card);
    });
}

function buildState() {
    const weights = readWeights();
    const phase = readActivePhase();
    const range = readSharedRange(phase);
    const chartWindow = getSharedWindow(range, weights, phase);
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const movingAverage = calculateMovingAverage(weights)
        .filter(entry => entry.date >= chartWindow.startDate && entry.date <= chartWindow.endDate);
    const trendByDate = new Map(movingAverage.map(entry => [entry.date, entry.weight]));
    const weightsByDate = new Map(weights.map(entry => [entry.date, entry.weight]));
    const series = datesBetween(chartWindow.startDate, chartWindow.endDate).map(date => {
        const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const carbs = entries.length
            ? entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.carbs) || 0), 0)
            : null;
        return {
            date,
            weight: weightsByDate.get(date) ?? null,
            trend: trendByDate.get(date) ?? null,
            carbs: Number.isFinite(carbs) ? carbs : null
        };
    });
    return { weights, movingAverage, series, chartWindow, range };
}

function redraw(card, state) {
    const canvas = card.querySelector("[data-weight-carbs-canvas]");
    if (!canvas || canvas.hidden || card.querySelector(".weight-carbs-chart-shell")?.hidden) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { series, movingAverage, chartWindow, range } = state;
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
    const weightValues = series.flatMap(day => [day.weight, day.trend]).filter(Number.isFinite).map(value => displayMass(value));
    const carbValues = series.map(day => day.carbs).filter(Number.isFinite);
    if (!weightValues.length && !carbValues.length) return;

    const weightMinRaw = weightValues.length ? Math.min(...weightValues) : 0;
    const weightMaxRaw = weightValues.length ? Math.max(...weightValues) : 1;
    const span = Math.max(unit === "kg" ? .45 : 1, weightMaxRaw - weightMinRaw);
    const weightPadding = Math.max(unit === "kg" ? .35 : .75, span * .18);
    const weightMin = weightMinRaw - weightPadding;
    const weightMax = weightMaxRaw + weightPadding;
    const carbMax = Math.max(50, Math.ceil(Math.max(1, ...carbValues) / 50) * 50);
    const firstTime = dateMs(chartWindow.startDate);
    const lastTime = dateMs(chartWindow.endDate);
    const elapsed = Math.max(1, lastTime - firstTime);
    const xForDate = date => firstTime === lastTime
        ? padding.left + chartWidth / 2
        : padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth;
    const yWeight = canonical => {
        const value = displayMass(canonical);
        return padding.top + ((weightMax - value) / Math.max(.001, weightMax - weightMin)) * chartHeight;
    };
    const yCarbs = grams => padding.top + chartHeight - (grams / carbMax) * chartHeight;

    context.strokeStyle = "rgba(255,255,255,.055)";
    context.lineWidth = 1;
    context.font = "800 9px Arial";
    context.fillStyle = "#777780";
    context.textBaseline = "middle";
    for (let row = 0; row <= 2; row += 1) {
        const y = padding.top + chartHeight * row / 2;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        const weightLabel = weightMax - ((weightMax - weightMin) * row / 2);
        const carbLabel = carbMax - (carbMax * row / 2);
        context.textAlign = "right";
        context.fillText(weightLabel.toFixed(1), padding.left - 7, y);
        context.textAlign = "left";
        context.fillText(`${Math.round(carbLabel)}`, width - padding.right + 7, y);
    }
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("g", width - 5, 12);

    const barSlot = chartWidth / Math.max(1, series.length);
    const barWidth = Math.max(2, Math.min(14, barSlot * .52));
    series.forEach(day => {
        if (!Number.isFinite(day.carbs)) return;
        const x = xForDate(day.date);
        const y = yCarbs(day.carbs);
        context.globalAlpha = day.date === activeDate ? .92 : .34;
        context.fillStyle = CARB_COLOR;
        roundRect(context, x - barWidth / 2, y, barWidth, padding.top + chartHeight - y, Math.min(4, barWidth / 2));
        context.fill();
    });
    context.globalAlpha = 1;

    const visibleWeights = series.filter(day => Number.isFinite(day.weight));
    if (visibleWeights.length) {
        context.save();
        context.strokeStyle = DAILY_WEIGHT_LINE;
        context.lineWidth = 1.2;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        visibleWeights.forEach((entry, index) => {
            const x = xForDate(entry.date);
            const y = yWeight(entry.weight);
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });
        context.stroke();
        context.restore();
    }

    // Exact same trend series construction + smoothing routine as Weight Trend.
    if (movingAverage.length) {
        const trendPoints = movingAverage.map(entry => ({ x: xForDate(entry.date), y: yWeight(entry.weight) }));
        context.save();
        context.strokeStyle = TREND_GREEN;
        context.shadowColor = TREND_GREEN_GLOW;
        context.shadowBlur = 8;
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        traceSmoothLine(context, trendPoints);
        context.stroke();
        context.restore();
    }

    visibleWeights.forEach(entry => {
        context.beginPath();
        context.arc(xForDate(entry.date), yWeight(entry.weight), entry.date === activeDate ? 5 : DAILY_WEIGHT_POINT_RADIUS, 0, Math.PI * 2);
        context.fillStyle = entry.date === activeDate ? "#fff" : DAILY_WEIGHT_POINT;
        context.fill();
        if (entry.date === activeDate) {
            context.strokeStyle = TREND_GREEN;
            context.lineWidth = 2;
            context.stroke();
        }
    });

    if (activeDate) {
        const x = xForDate(activeDate);
        context.strokeStyle = "rgba(255,255,255,.5)";
        context.lineWidth = 1;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(x, padding.top);
        context.lineTo(x, padding.top + chartHeight);
        context.stroke();
        context.setLineDash([]);
    }

    drawDateLabels(context, series, xForDate, padding.top + chartHeight + 20, range);
}

function updateTooltip(card, state, date) {
    const tooltip = card.querySelector("[data-weight-carbs-tooltip]");
    if (!tooltip || !date) {
        hideTooltip(card);
        return;
    }
    const day = state.series.find(item => item.date === date);
    if (!day) {
        hideTooltip(card);
        return;
    }
    const unit = massUnit();
    const weight = Number.isFinite(day.weight) ? displayMass(day.weight) : null;
    const trend = Number.isFinite(day.trend) ? displayMass(day.trend) : null;
    const difference = Number.isFinite(weight) && Number.isFinite(trend) ? weight - trend : null;
    const recentAverage = recentCarbAverage(state.series, date);
    const carbDifference = Number.isFinite(day.carbs) && Number.isFinite(recentAverage) ? day.carbs - recentAverage : null;
    tooltip.innerHTML = `
        <strong>${formatDate(date)}</strong>
        <span>${Number.isFinite(weight) ? `${weight.toFixed(1)} ${unit}` : "No weight logged"}</span>
        <span>${Number.isFinite(day.carbs) ? `${Math.round(day.carbs)} g carbs` : "No carbs logged"}</span>
        <span>${Number.isFinite(difference) ? `${formatSigned(difference, 1)} ${unit} vs trend` : "Weight vs trend unavailable"}</span>
        ${Number.isFinite(carbDifference) ? `<small>${formatSigned(carbDifference, 0)} g vs recent average</small>` : ""}
    `;
    tooltip.hidden = false;
    positionTooltip(card, state.series, date, tooltip);
}

function positionTooltip(card, series, date, tooltip) {
    const shell = card.querySelector(".weight-carbs-chart-shell");
    const canvas = card.querySelector("[data-weight-carbs-canvas]");
    if (!shell || !canvas) return;
    const index = series.findIndex(day => day.date === date);
    const width = canvas.clientWidth || 1;
    const chartWidth = Math.max(1, width - 96);
    const x = 48 + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth);
    const tooltipWidth = Math.min(190, Math.max(150, shell.clientWidth - 24));
    tooltip.style.width = `${tooltipWidth}px`;
    tooltip.style.left = `${Math.max(8, Math.min(shell.clientWidth - tooltipWidth - 8, x - tooltipWidth / 2))}px`;
}

function hideTooltip(card) {
    const tooltip = card?.querySelector?.("[data-weight-carbs-tooltip]");
    if (tooltip) tooltip.hidden = true;
}

function readWeights() {
    return normalizeWeightEntries(readJson(WEIGHT_KEY, []));
}

function readActivePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null : null;
}

function readSharedRange(activePhase) {
    const saved = String(localStorage.getItem(SHARED_RANGE_KEY) || "3m").toLowerCase();
    if (!RANGE_OPTIONS[saved]) return "3m";
    if (saved === "phase" && !activePhase?.startDate) return "3m";
    return saved;
}

function getSharedWindow(range, weights, activePhase) {
    const today = localDate();
    if (range === "phase" && activePhase?.startDate) return { startDate: String(activePhase.startDate), endDate: today, label: "Current phase" };
    if (range === "all") return { startDate: weights[0]?.date || today, endDate: weights.at(-1)?.date || today, label: "All time" };
    const option = RANGE_OPTIONS[range] || RANGE_OPTIONS["3m"];
    return { startDate: shiftDate(today, -(Number(option.days || 90) - 1)), endDate: today, label: option.label };
}

function recentCarbAverage(series, selectedDate) {
    const index = series.findIndex(day => day.date === selectedDate);
    if (index <= 0) return null;
    const values = series.slice(Math.max(0, index - 7), index).map(day => day.carbs).filter(Number.isFinite);
    return values.length >= 2 ? mean(values) : null;
}

function drawDateLabels(context, series, xForDate, y, range) {
    const count = series.length;
    const desiredLabels = range === "1w" ? 7 : range === "1m" ? 6 : range === "3m" ? 6 : range === "6m" ? 6 : 7;
    const step = Math.max(1, Math.ceil(count / desiredLabels));
    context.fillStyle = "#777780";
    context.font = "800 8px Arial";
    context.textAlign = "center";
    series.forEach((day, index) => {
        if (index !== 0 && index !== count - 1 && index % step !== 0) return;
        context.fillText(new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }), xForDate(day.date), y);
    });
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

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return null;
    date.setDate(date.getDate() + Number(days || 0));
    return localDate(date);
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSigned(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(digits)}`;
}

function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function roundRect(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
}
