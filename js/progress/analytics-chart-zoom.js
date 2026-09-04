import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";
import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=food-log-macro-bars-1";
import { calculateTdee } from "../nutrition/tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=nutrition-phase-1";

const STYLE_ID = "level-up-analytics-date-inspect-styles";
const WEIGHT_WINDOW_KEY = "level_up_weight_chart_inspect_window_v2";
const EXPENDITURE_WINDOW_KEY = "level_up_expenditure_chart_inspect_window_v2";
const instances = new WeakMap();
let attachQueued = false;

const RANGE_DAYS = {
    "1w": 7,
    "7d": 7,
    "1m": 30,
    "4w": 28,
    "3m": 90,
    "12w": 84,
    "6m": 180,
    "1y": 365,
    "365d": 365
};

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .analytics-inspect-host{position:relative;min-width:0}
        .analytics-inspect-stage{position:relative;overflow:hidden;border-radius:inherit;touch-action:pan-y}
        .analytics-inspect-stage>canvas{display:block;width:100%}
        .analytics-inspect-overlay{position:absolute;inset:0;width:100%;height:100%;z-index:3;touch-action:none}
        .analytics-inspect-tooltip{position:absolute;z-index:5;display:grid;gap:2px;min-width:112px;max-width:170px;padding:7px 9px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;background:var(--card,#17171a);box-shadow:0 8px 24px rgba(0,0,0,.2);pointer-events:none;color:var(--text,#f4f4f6);font-size:10px;line-height:1.25}
        .analytics-inspect-tooltip strong{font-size:11px}.analytics-inspect-tooltip span,.analytics-inspect-tooltip small{color:var(--muted,#8f8f98)}
        .analytics-inspect-controls{display:flex;align-items:center;gap:6px;margin:8px 0 2px;padding:5px 6px;border:1px solid var(--line,rgba(255,255,255,.10));border-radius:12px;background:var(--surface-raised,rgba(255,255,255,.035));color:var(--text,#f4f4f6)}
        .analytics-inspect-controls button{display:grid;place-items:center;min-width:34px;height:32px;margin:0;padding:0 9px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;background:var(--surface,rgba(255,255,255,.04));color:var(--text,#f4f4f6);font:inherit;font-size:15px;font-weight:850;line-height:1;touch-action:manipulation}
        .analytics-inspect-controls button:disabled{opacity:.35}
        .analytics-inspect-status{min-width:0;flex:1;display:grid;gap:1px;text-align:center}
        .analytics-inspect-status strong{overflow:hidden;color:var(--text,#f4f4f6);font-size:10px;font-weight:850;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
        .analytics-inspect-status small{color:var(--muted,#8f8f98);font-size:9px;line-height:1.2}
        .analytics-inspect-dates-toggle,.analytics-inspect-reset{font-size:10px!important;min-width:47px!important}
        .analytics-inspect-date-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:6px;align-items:end;margin:6px 0 2px;padding:8px;border:1px solid var(--line,rgba(255,255,255,.10));border-radius:12px;background:var(--surface-raised,rgba(255,255,255,.03))}
        .analytics-inspect-date-panel[hidden]{display:none!important}
        .analytics-inspect-date-panel label{display:grid;gap:3px;color:var(--muted,#8f8f98);font-size:9px;font-weight:800;letter-spacing:.03em}
        .analytics-inspect-date-panel input{min-width:0;width:100%;height:34px;box-sizing:border-box;padding:0 7px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;background:var(--surface,#111114);color:var(--text,#f4f4f6);font:inherit;font-size:10px;font-weight:750;color-scheme:inherit}
        .analytics-inspect-date-panel button{height:34px;padding:0 10px;border:0;border-radius:9px;background:var(--accent,#2f80ff);color:#fff;font:inherit;font-size:10px;font-weight:850;touch-action:manipulation}
        .analytics-inspect-hint{margin:5px 2px 0;color:var(--muted,#8f8f98);font-size:9px;line-height:1.35;text-align:center}
        .analytics-inspect-stage.is-inspecting{cursor:grab}.analytics-inspect-stage.is-dragging{cursor:grabbing}
        html[data-theme-mode="light"] .analytics-inspect-tooltip{box-shadow:0 8px 22px rgba(40,67,99,.13)}
        @media(max-width:390px){.analytics-inspect-controls{gap:4px}.analytics-inspect-controls button{min-width:31px;height:30px;padding-inline:7px}.analytics-inspect-date-panel{grid-template-columns:1fr 1fr}.analytics-inspect-date-panel button{grid-column:1/-1;width:100%}}
    `;
    document.head.appendChild(style);
}

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return localDateString(date);
}

function daysBetween(start, end) {
    const difference = dateMs(end) - dateMs(start);
    return Math.max(1, Math.round(difference / 86400000) + 1);
}

function formatDate(value, includeYear = false) {
    if (!value) return "";
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" } : {})
    });
}

function themeColor(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function phaseStartDate() {
    try {
        const phases = JSON.parse(localStorage.getItem("level_up_nutrition_phases") || "[]");
        const active = Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) : null;
        return active?.startDate || null;
    } catch {
        return null;
    }
}

function readWeightEntries() {
    try {
        const entries = normalizeWeightEntries(JSON.parse(localStorage.getItem("forge_weight_entries") || "[]"));
        const today = localDateString();
        return entries.filter(entry => entry.date <= today);
    } catch {
        return [];
    }
}

function earliestWeightDate() {
    return readWeightEntries()[0]?.date || null;
}

function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try {
        const value = Number(calculateTdee(profile).tdee);
        return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    } catch {
        return null;
    }
}

function expenditureHistory(startDate = null) {
    const formula = profileMaintenance();
    try {
        return getCalculatedMaintenanceHistory(formula, startDate ? { startDate } : undefined) || [];
    } catch {
        return [];
    }
}

function earliestExpenditureDate() {
    const history = expenditureHistory();
    return history.find(point => point?.date)?.date || null;
}

function chartKind(canvas) {
    return canvas?.id === "weight-trend-chart" ? "weight" : "expenditure";
}

function windowStorageKey(kind) {
    return kind === "weight" ? WEIGHT_WINDOW_KEY : EXPENDITURE_WINDOW_KEY;
}

function selectedRange(canvas) {
    const root = canvas.closest(".weight-chart-card, .calorie-stats-page, .expenditure-trend-card") || document;
    const selectors = chartKind(canvas) === "weight"
        ? ["[data-weight-chart-range][aria-pressed='true']"]
        : ["[data-tdee-chart-range][aria-pressed='true']"];
    for (const selector of selectors) {
        const button = root.querySelector?.(selector) || document.querySelector(selector);
        if (button) return String(button.dataset.weightChartRange || button.dataset.tdeeChartRange || "").toLowerCase();
    }
    return chartKind(canvas) === "weight"
        ? String(localStorage.getItem("level_up_weight_chart_range") || "3m").toLowerCase()
        : String(localStorage.getItem("level_up_tdee_chart_range_v1") || "3m").toLowerCase();
}

function domainForCanvas(canvas) {
    const range = selectedRange(canvas);
    const today = localDateString();
    if (range === "phase") {
        const start = phaseStartDate();
        if (start) return { start, end: today };
    }
    if (range === "all") {
        const start = chartKind(canvas) === "weight" ? earliestWeightDate() : earliestExpenditureDate();
        if (start) return { start, end: today };
    }
    const days = RANGE_DAYS[range] || 30;
    return { start: shiftDate(today, -(days - 1)), end: today };
}

function readStoredWindow(kind) {
    try {
        const value = JSON.parse(sessionStorage.getItem(windowStorageKey(kind)) || "null");
        return value?.start && value?.end ? value : null;
    } catch {
        return null;
    }
}

function clampWindow(window, domain) {
    if (!window?.start || !window?.end) return null;
    const start = window.start < domain.start ? domain.start : window.start > domain.end ? domain.end : window.start;
    const end = window.end > domain.end ? domain.end : window.end < domain.start ? domain.start : window.end;
    if (start > end) return null;
    if (start === domain.start && end === domain.end) return null;
    return { start, end };
}

function saveWindow(kind, window) {
    if (!window) sessionStorage.removeItem(windowStorageKey(kind));
    else sessionStorage.setItem(windowStorageKey(kind), JSON.stringify(window));
}

function effectiveWindow(instance) {
    const domain = domainForCanvas(instance.canvas);
    const stored = clampWindow(readStoredWindow(instance.kind), domain);
    if (!stored) return { domain, window: null, start: domain.start, end: domain.end };
    return { domain, window: stored, start: stored.start, end: stored.end };
}

function syncDateInputs(instance) {
    const { domain, start, end } = effectiveWindow(instance);
    instance.startInput.min = domain.start;
    instance.startInput.max = domain.end;
    instance.endInput.min = domain.start;
    instance.endInput.max = domain.end;
    if (document.activeElement !== instance.startInput) instance.startInput.value = start;
    if (document.activeElement !== instance.endInput) instance.endInput.value = end;
}

function updateStatus(instance) {
    const state = effectiveWindow(instance);
    const active = Boolean(state.window);
    const visibleDays = daysBetween(state.start, state.end);
    const sameYear = state.start.slice(0, 4) === state.end.slice(0, 4);
    instance.statusStrong.textContent = active
        ? `${formatDate(state.start, !sameYear)} – ${formatDate(state.end, true)}`
        : "Full selected range";
    instance.statusSmall.textContent = active
        ? `${visibleDays} ${visibleDays === 1 ? "day" : "days"} · drag to move through time`
        : "Pinch, use +, or choose exact dates";
    instance.minus.disabled = !active;
    instance.reset.disabled = !active;
    syncDateInputs(instance);
}

function prepareOverlay(instance) {
    const { canvas, overlay } = instance;
    const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 320);
    const height = Math.max(1, canvas.clientHeight || (instance.kind === "weight" ? 330 : 250));
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    overlay.width = Math.round(width * ratio);
    overlay.height = Math.round(height * ratio);
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    const context = overlay.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
}

function drawEmpty(context, message) {
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "600 12px Arial";
    context.textAlign = "left";
    context.fillText(message, 20, 44);
}

function drawDateAxis(context, start, end, x, y) {
    const first = dateMs(start);
    const last = dateMs(end);
    const middle = localDateString(new Date((first + last) / 2));
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "800 9px Arial";
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(formatDate(start), x.left, y);
    if (start !== end) {
        context.textAlign = "center";
        context.fillText(formatDate(middle), (x.left + x.right) / 2, y);
        context.textAlign = "right";
        context.fillText(formatDate(end), x.right, y);
    }
}

function drawWeightInspect(instance, start, end) {
    const prepared = prepareOverlay(instance);
    if (!prepared) return [];
    const { context, width, height } = prepared;
    const entries = readWeightEntries();
    const trend = calculateTrendWeightSeries(entries);
    const visibleEntries = entries.filter(entry => entry.date >= start && entry.date <= end);
    const visibleTrend = trend.filter(entry => entry.date >= start && entry.date <= end);
    const values = [...visibleEntries.map(entry => entry.weight), ...visibleTrend.map(entry => entry.weight)].filter(Number.isFinite);
    if (!values.length) {
        drawEmpty(context, "No weight data in these dates.");
        return [];
    }

    const minimumValue = Math.min(...values);
    const maximumValue = Math.max(...values);
    const span = Math.max(.35, maximumValue - minimumValue);
    const pad = Math.max(.35, span * .22);
    const minimum = minimumValue - pad;
    const maximum = maximumValue + pad;
    const padding = { left: 50, right: 18, top: 20, bottom: 42 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const firstTime = dateMs(start);
    const lastTime = dateMs(end);
    const elapsed = Math.max(1, lastTime - firstTime);
    const yRange = Math.max(.1, maximum - minimum);
    const x = date => padding.left + ((dateMs(date) - firstTime) / elapsed) * plotWidth;
    const y = weight => padding.top + ((maximum - weight) / yRange) * plotHeight;

    context.lineWidth = 1;
    context.font = "10px Arial";
    context.textAlign = "right";
    for (let index = 0; index <= 3; index += 1) {
        const fraction = index / 3;
        const yy = padding.top + plotHeight * fraction;
        const value = maximum - yRange * fraction;
        context.strokeStyle = themeColor("--line", "rgba(255,255,255,.07)");
        context.beginPath();
        context.moveTo(padding.left, yy);
        context.lineTo(width - padding.right, yy);
        context.stroke();
        const shown = displayMass(value);
        context.fillStyle = themeColor("--muted", "#85858f");
        context.fillText(Number.isFinite(shown) ? shown.toFixed(1) : "", padding.left - 8, yy + 3);
    }

    if (visibleEntries.length >= 2) {
        context.beginPath();
        visibleEntries.forEach((entry, index) => index ? context.lineTo(x(entry.date), y(entry.weight)) : context.moveTo(x(entry.date), y(entry.weight)));
        context.strokeStyle = "rgba(112,181,137,.34)";
        context.lineWidth = 1.4;
        context.stroke();
    }
    visibleEntries.forEach(entry => {
        context.beginPath();
        context.arc(x(entry.date), y(entry.weight), 2.7, 0, Math.PI * 2);
        context.fillStyle = "rgba(126,194,151,.82)";
        context.fill();
    });
    if (visibleTrend.length >= 2) {
        context.save();
        context.shadowColor = "rgba(69,203,117,.28)";
        context.shadowBlur = 7;
        context.beginPath();
        visibleTrend.forEach((entry, index) => index ? context.lineTo(x(entry.date), y(entry.weight)) : context.moveTo(x(entry.date), y(entry.weight)));
        context.strokeStyle = themeColor("--success", "#45cb75");
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();
        context.restore();
    } else if (visibleTrend.length === 1) {
        context.beginPath();
        context.arc(x(visibleTrend[0].date), y(visibleTrend[0].weight), 4, 0, Math.PI * 2);
        context.fillStyle = themeColor("--success", "#45cb75");
        context.fill();
    }

    drawDateAxis(context, start, end, { left: padding.left, right: width - padding.right }, height - 14);
    context.textAlign = "left";
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "9px Arial";
    context.fillText(massUnit(), 8, 14);

    return visibleEntries.map(entry => {
        const trendPoint = visibleTrend.find(point => point.date === entry.date);
        return { date: entry.date, value: entry.weight, trend: trendPoint?.weight ?? null, x: x(entry.date) };
    });
}

function niceCalorieStep(value) {
    return [25, 50, 100, 200, 250, 500, 1000].find(step => step >= value) || 2000;
}

function drawExpenditureInspect(instance, start, end) {
    const prepared = prepareOverlay(instance);
    if (!prepared) return [];
    const { context, width, height } = prepared;
    const formula = profileMaintenance();
    const history = expenditureHistory(shiftDate(start, -28));
    const current = getCalculatedMaintenanceEstimate(formula);
    const today = localDateString();
    const series = history.filter(point => point?.date >= start && point?.date <= end).map(point => ({ ...point }));
    const currentValue = Number(current?.maintenanceCalories);
    if (today >= start && today <= end && Number.isFinite(currentValue) && currentValue > 0) {
        const existing = series.find(point => point.date === today);
        if (existing) existing.maintenanceCalories = currentValue;
        else series.push({ date: today, maintenanceCalories: currentValue });
    }
    series.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const available = series.filter(point => Number.isFinite(Number(point.maintenanceCalories)) && Number(point.maintenanceCalories) > 0);
    if (!available.length) {
        drawEmpty(context, "No expenditure data in these dates.");
        return [];
    }

    const padding = { top: 18, right: 44, bottom: 30, left: 8 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const values = available.map(point => Number(point.maintenanceCalories));
    if (Number.isFinite(formula)) values.push(formula);
    const minimumValue = Math.min(...values);
    const maximumValue = Math.max(...values);
    const step = niceCalorieStep(Math.max(100, maximumValue - minimumValue) / 4);
    let yMin = Math.floor((minimumValue - step) / step) * step;
    let yMax = Math.ceil((maximumValue + step) / step) * step;
    if (yMax <= yMin) yMax = yMin + step * 4;
    const firstTime = dateMs(start);
    const lastTime = dateMs(end);
    const x = point => padding.left + ((dateMs(point.date) - firstTime) / Math.max(1, lastTime - firstTime)) * plotWidth;
    const y = value => padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;

    context.font = "800 9px Arial";
    context.textAlign = "left";
    context.textBaseline = "middle";
    for (let index = 0; index <= 4; index += 1) {
        const value = yMax - (yMax - yMin) * index / 4;
        const lineY = padding.top + plotHeight * index / 4;
        context.strokeStyle = themeColor("--line", "rgba(255,255,255,.09)");
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(padding.left, lineY);
        context.lineTo(width - padding.right + 4, lineY);
        context.stroke();
        context.fillStyle = themeColor("--muted", "#85858f");
        context.fillText(Math.round(value).toLocaleString(), width - padding.right + 9, lineY);
    }

    if (Number.isFinite(formula)) {
        context.save();
        context.setLineDash([5, 5]);
        context.strokeStyle = themeColor("--muted", "#777780");
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(padding.left, y(formula));
        context.lineTo(width - padding.right + 4, y(formula));
        context.stroke();
        context.restore();
    }

    if (available.length === 1) {
        context.beginPath();
        context.arc(x(available[0]), y(available[0].maintenanceCalories), 4, 0, Math.PI * 2);
        context.fillStyle = themeColor("--accent", "#ff3b4b");
        context.fill();
    } else {
        const area = context.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
        area.addColorStop(0, themeColor("--accent-glow", "rgba(255,59,75,.26)"));
        area.addColorStop(1, "rgba(255,59,75,0)");
        context.beginPath();
        available.forEach((point, index) => index ? context.lineTo(x(point), y(point.maintenanceCalories)) : context.moveTo(x(point), y(point.maintenanceCalories)));
        context.lineTo(x(available.at(-1)), padding.top + plotHeight);
        context.lineTo(x(available[0]), padding.top + plotHeight);
        context.closePath();
        context.fillStyle = area;
        context.fill();

        context.beginPath();
        available.forEach((point, index) => index ? context.lineTo(x(point), y(point.maintenanceCalories)) : context.moveTo(x(point), y(point.maintenanceCalories)));
        context.strokeStyle = themeColor("--accent", "#ff3b4b");
        context.lineWidth = 3;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke();
    }

    context.textBaseline = "alphabetic";
    drawDateAxis(context, start, end, { left: padding.left, right: width - padding.right }, height - 7);
    return available.map(point => ({ date: point.date, value: Number(point.maintenanceCalories), x: x(point) }));
}

function renderInspect(instance) {
    if (!instance.canvas.isConnected) return;
    const state = effectiveWindow(instance);
    if (!state.window) {
        instance.overlay.hidden = true;
        instance.overlay.style.pointerEvents = "none";
        instance.canvas.style.opacity = "";
        instance.stage.classList.remove("is-inspecting", "is-dragging");
        instance.points = [];
        instance.tooltip.hidden = true;
        updateStatus(instance);
        return;
    }

    instance.points = instance.kind === "weight"
        ? drawWeightInspect(instance, state.start, state.end)
        : drawExpenditureInspect(instance, state.start, state.end);
    instance.overlay.hidden = false;
    instance.overlay.style.pointerEvents = "auto";
    instance.canvas.style.opacity = "0";
    instance.stage.classList.add("is-inspecting");
    updateStatus(instance);
}

function applyWindow(instance, start, end) {
    const domain = domainForCanvas(instance.canvas);
    let nextStart = String(start || domain.start);
    let nextEnd = String(end || domain.end);
    if (nextStart < domain.start) nextStart = domain.start;
    if (nextEnd > domain.end) nextEnd = domain.end;
    if (nextStart > nextEnd) [nextStart, nextEnd] = [nextEnd, nextStart];
    const next = nextStart === domain.start && nextEnd === domain.end ? null : { start: nextStart, end: nextEnd };
    saveWindow(instance.kind, next);
    instance.tooltip.hidden = true;
    renderInspect(instance);
    window.dispatchEvent(new CustomEvent("levelup:analytics-inspect-window", { detail: { chart: instance.kind, startDate: next?.start || domain.start, endDate: next?.end || domain.end, active: Boolean(next) } }));
}

function zoomBy(instance, factor) {
    const state = effectiveWindow(instance);
    const totalDays = daysBetween(state.domain.start, state.domain.end);
    const currentDays = daysBetween(state.start, state.end);
    const nextDays = clamp(Math.round(currentDays / factor), 1, totalDays);
    if (nextDays >= totalDays) {
        applyWindow(instance, state.domain.start, state.domain.end);
        return;
    }
    const center = Math.round((dateMs(state.start) + dateMs(state.end)) / 2);
    let start = localDateString(new Date(center - Math.floor((nextDays - 1) / 2) * 86400000));
    let end = shiftDate(start, nextDays - 1);
    if (start < state.domain.start) { start = state.domain.start; end = shiftDate(start, nextDays - 1); }
    if (end > state.domain.end) { end = state.domain.end; start = shiftDate(end, -(nextDays - 1)); }
    applyWindow(instance, start, end);
}

function panWindow(instance, dayDelta) {
    const state = effectiveWindow(instance);
    if (!state.window || !dayDelta) return;
    const visibleDays = daysBetween(state.start, state.end);
    let start = shiftDate(state.start, dayDelta);
    let end = shiftDate(state.end, dayDelta);
    if (start < state.domain.start) { start = state.domain.start; end = shiftDate(start, visibleDays - 1); }
    if (end > state.domain.end) { end = state.domain.end; start = shiftDate(end, -(visibleDays - 1)); }
    applyWindow(instance, start, end);
}

function showNearestPoint(instance, clientX) {
    if (!instance.points?.length) return;
    const rect = instance.overlay.getBoundingClientRect();
    const x = clientX - rect.left;
    const nearest = instance.points.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best, instance.points[0]);
    const tooltip = instance.tooltip;
    const unit = instance.kind === "weight" ? massUnit() : "cal/day";
    const shown = instance.kind === "weight" ? displayMass(nearest.value) : nearest.value;
    const trendShown = instance.kind === "weight" && Number.isFinite(nearest.trend) ? displayMass(nearest.trend) : null;
    tooltip.innerHTML = `<strong>${formatDate(nearest.date, true)}</strong><span>${instance.kind === "weight" ? "Weight" : "Expenditure"}: ${Number(shown).toLocaleString(undefined, { maximumFractionDigits: instance.kind === "weight" ? 1 : 0 })} ${unit}</span>${Number.isFinite(trendShown) ? `<small>Trend Weight: ${trendShown.toFixed(1)} ${unit}</small>` : ""}`;
    tooltip.hidden = false;
    const desired = nearest.x < rect.width / 2 ? nearest.x + 9 : nearest.x - 150;
    tooltip.style.left = `${clamp(desired, 6, Math.max(6, rect.width - 166))}px`;
    tooltip.style.top = "8px";
}

function bindGestures(instance) {
    const pointers = new Map();
    let dragStart = null;
    let pinchStart = null;
    let lastTap = 0;

    instance.stage.addEventListener("pointerdown", event => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const state = effectiveWindow(instance);
        if (pointers.size === 2) {
            const values = [...pointers.values()];
            pinchStart = {
                distance: Math.max(1, Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y)),
                days: daysBetween(state.start, state.end)
            };
            event.preventDefault();
            return;
        }
        if (state.window && event.target === instance.overlay) {
            dragStart = { x: event.clientX, accumulated: 0 };
            instance.stage.classList.add("is-dragging");
            instance.overlay.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        }
    }, { passive: false });

    instance.stage.addEventListener("pointermove", event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const state = effectiveWindow(instance);
        if (pointers.size >= 2 && pinchStart) {
            const values = [...pointers.values()].slice(0, 2);
            const distance = Math.max(1, Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y));
            const totalDays = daysBetween(state.domain.start, state.domain.end);
            const nextDays = clamp(Math.round(pinchStart.days / Math.max(.15, distance / pinchStart.distance)), 1, totalDays);
            const currentDays = daysBetween(state.start, state.end);
            if (Math.abs(nextDays - currentDays) >= 1) {
                const factor = currentDays / nextDays;
                zoomBy(instance, factor);
            }
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (state.window && dragStart && pointers.size === 1) {
            const rect = instance.stage.getBoundingClientRect();
            const visibleDays = daysBetween(state.start, state.end);
            const deltaPx = event.clientX - dragStart.x;
            const days = Math.round((-deltaPx / Math.max(1, rect.width)) * visibleDays);
            if (days !== dragStart.accumulated) {
                panWindow(instance, days - dragStart.accumulated);
                dragStart.accumulated = days;
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }, { passive: false });

    const release = event => {
        const wasDrag = Boolean(dragStart && Math.abs(event.clientX - dragStart.x) > 8);
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinchStart = null;
        if (!pointers.size) {
            dragStart = null;
            instance.stage.classList.remove("is-dragging");
            if (!wasDrag && !instance.overlay.hidden && event.target === instance.overlay) {
                const now = Date.now();
                if (now - lastTap < 300) applyWindow(instance, domainForCanvas(instance.canvas).start, domainForCanvas(instance.canvas).end);
                else showNearestPoint(instance, event.clientX);
                lastTap = now;
            }
        }
    };
    instance.stage.addEventListener("pointerup", release);
    instance.stage.addEventListener("pointercancel", release);
}

function createInstance(canvas) {
    if (!canvas || instances.has(canvas) || canvas.dataset.analyticsInspectReady === "1") return;
    ensureStyles();
    const parent = canvas.parentElement;
    if (!parent) return;

    let stage = canvas.closest(".analytics-inspect-stage");
    if (!stage) {
        stage = document.createElement("div");
        stage.className = "analytics-inspect-stage";
        parent.insertBefore(stage, canvas);
        stage.appendChild(canvas);
    }
    stage.parentElement?.classList.add("analytics-inspect-host");

    const overlay = document.createElement("canvas");
    overlay.className = "analytics-inspect-overlay";
    overlay.hidden = true;
    overlay.style.pointerEvents = "none";
    stage.appendChild(overlay);

    const tooltip = document.createElement("div");
    tooltip.className = "analytics-inspect-tooltip";
    tooltip.hidden = true;
    stage.appendChild(tooltip);

    const controls = document.createElement("div");
    controls.className = "analytics-inspect-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Chart date inspection controls");
    controls.innerHTML = `
        <button type="button" data-chart-inspect-out aria-label="Zoom out">−</button>
        <span class="analytics-inspect-status"><strong>Full selected range</strong><small>Pinch, use +, or choose exact dates</small></span>
        <button type="button" data-chart-inspect-in aria-label="Zoom in">+</button>
        <button type="button" class="analytics-inspect-dates-toggle" data-chart-inspect-dates aria-expanded="false">Dates</button>
        <button type="button" class="analytics-inspect-reset" data-chart-inspect-reset>Reset</button>
    `;
    stage.insertAdjacentElement("afterend", controls);

    const datePanel = document.createElement("div");
    datePanel.className = "analytics-inspect-date-panel";
    datePanel.hidden = true;
    datePanel.innerHTML = `
        <label>From<input type="date" data-chart-inspect-start></label>
        <label>To<input type="date" data-chart-inspect-end></label>
        <button type="button" data-chart-inspect-apply>Inspect</button>
    `;
    controls.insertAdjacentElement("afterend", datePanel);

    const hint = document.createElement("p");
    hint.className = "analytics-inspect-hint";
    hint.textContent = "Your 1W / 1M / 3M range stays selected. Choose exact dates, pinch to zoom, or drag a zoomed view horizontally.";
    datePanel.insertAdjacentElement("afterend", hint);

    const instance = {
        canvas,
        kind: chartKind(canvas),
        stage,
        overlay,
        tooltip,
        controls,
        datePanel,
        hint,
        points: [],
        minus: controls.querySelector("[data-chart-inspect-out]"),
        plus: controls.querySelector("[data-chart-inspect-in]"),
        dates: controls.querySelector("[data-chart-inspect-dates]"),
        reset: controls.querySelector("[data-chart-inspect-reset]"),
        startInput: datePanel.querySelector("[data-chart-inspect-start]"),
        endInput: datePanel.querySelector("[data-chart-inspect-end]"),
        apply: datePanel.querySelector("[data-chart-inspect-apply]"),
        statusStrong: controls.querySelector(".analytics-inspect-status strong"),
        statusSmall: controls.querySelector(".analytics-inspect-status small")
    };
    instances.set(canvas, instance);
    canvas.dataset.analyticsInspectReady = "1";

    instance.minus.addEventListener("click", () => zoomBy(instance, 1 / 1.6));
    instance.plus.addEventListener("click", () => zoomBy(instance, 1.6));
    instance.reset.addEventListener("click", () => {
        const domain = domainForCanvas(canvas);
        applyWindow(instance, domain.start, domain.end);
    });
    instance.dates.addEventListener("click", () => {
        datePanel.hidden = !datePanel.hidden;
        instance.dates.setAttribute("aria-expanded", String(!datePanel.hidden));
        if (!datePanel.hidden) syncDateInputs(instance);
    });
    instance.apply.addEventListener("click", () => applyWindow(instance, instance.startInput.value, instance.endInput.value));
    bindGestures(instance);
    renderInspect(instance);

    if (typeof ResizeObserver !== "undefined") {
        const resize = new ResizeObserver(() => window.requestAnimationFrame(() => renderInspect(instance)));
        resize.observe(canvas);
    }
}

function refreshInstances() {
    document.querySelectorAll("#weight-trend-chart, [data-expenditure-chart]").forEach(canvas => {
        createInstance(canvas);
        const instance = instances.get(canvas);
        if (instance) renderInspect(instance);
    });
}

function scheduleAttach() {
    if (attachQueued) return;
    attachQueued = true;
    window.requestAnimationFrame(() => {
        attachQueued = false;
        refreshInstances();
    });
}

function resetForRangeButton(target) {
    const button = target?.closest?.("[data-weight-chart-range], [data-tdee-chart-range]");
    if (!button) return;
    const kind = button.hasAttribute("data-weight-chart-range") ? "weight" : "expenditure";
    saveWindow(kind, null);
    window.setTimeout(scheduleAttach, 40);
}

document.addEventListener("click", event => resetForRangeButton(event.target), true);
window.addEventListener("resize", scheduleAttach);
window.addEventListener("levelup:theme-changed", scheduleAttach);
window.addEventListener("levelup:nutrition-updated", scheduleAttach);
window.addEventListener("levelup:weight-updated", scheduleAttach);
window.addEventListener("levelup:food-log-updated", scheduleAttach);
new MutationObserver(scheduleAttach).observe(document.documentElement, { childList: true, subtree: true });
scheduleAttach();
