import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";
import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=food-log-macro-bars-1";
import { calculateTdee } from "../nutrition/tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=nutrition-phase-1";

const STYLE_ID = "level-up-analytics-viewport-styles";
const WEIGHT_WINDOW_KEY = "level_up_weight_chart_viewport_v4";
const EXPENDITURE_WINDOW_KEY = "level_up_expenditure_chart_viewport_v4";
const READY_VERSION = "9";
const MIN_VISIBLE_DAYS = 2;
const DAY_MS = 86400000;
const RANGE_DAYS = { "1w": 7, "7d": 7, "1m": 30, "4w": 28, "3m": 90, "12w": 84, "6m": 180, "1y": 365, "365d": 365 };
const instances = new WeakMap();
const liveInstances = new Set();
let attachQueued = false;
let weightDataCache = { raw: null, today: null, entries: [], trend: [] };
function weightData() {
    const raw = localStorage.getItem("forge_weight_entries") || "[]";
    const today = localDateString();
    if (raw !== weightDataCache.raw || today !== weightDataCache.today) {
        let entries = [];
        try { entries = normalizeWeightEntries(JSON.parse(raw)).filter(entry => entry.date <= today); } catch {}
        weightDataCache = { raw, today, entries, trend: calculateTrendWeightSeries(entries) };
    }
    return weightDataCache;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    document.getElementById("level-up-analytics-date-inspect-styles")?.remove();
    document.getElementById("level-up-analytics-chart-zoom-styles")?.remove();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-history-list .weight-history-month{padding:14px 10px 8px;color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border-bottom:1px solid var(--line)}
        .analytics-viewport-legacy{display:none!important}
        .analytics-viewport-host{position:relative;min-width:0}
        .analytics-viewport-stage{position:relative;overflow:hidden;border-radius:inherit;touch-action:pan-y;min-width:0}
        .analytics-viewport-stage>canvas[data-analytics-viewport-chart]{display:block!important;width:100%!important;max-width:100%;opacity:1!important;touch-action:pan-y}
        .analytics-viewport-stage[data-kind="weight"],.analytics-viewport-stage[data-kind="weight"]>canvas{touch-action:none!important}
        .analytics-viewport-tooltip{position:absolute;z-index:6;display:grid;gap:2px;min-width:116px;max-width:176px;padding:7px 9px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;background:var(--card,#17171a);box-shadow:0 8px 24px rgba(0,0,0,.2);pointer-events:none;color:var(--text,#f4f4f6);font-size:10px;line-height:1.25}
        .analytics-viewport-tooltip[hidden]{display:none!important}
        .analytics-viewport-tooltip strong{font-size:11px}
        .analytics-viewport-tooltip span,.analytics-viewport-tooltip small{color:var(--muted,#8f8f98)}
        .analytics-viewport-controls{display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;margin:8px 0 2px;padding:5px 6px;border:1px solid var(--line,rgba(255,255,255,.10));border-radius:12px;background:var(--surface-raised,rgba(255,255,255,.035));color:var(--text,#f4f4f6)}
        .analytics-viewport-controls button{display:grid;place-items:center;min-width:34px;height:32px;margin:0;padding:0 9px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;background:var(--surface,rgba(255,255,255,.04));color:var(--text,#f4f4f6);font:inherit;font-size:15px;font-weight:850;line-height:1;touch-action:manipulation}
        .analytics-viewport-controls button:disabled{opacity:.35}
        .analytics-viewport-status{min-width:0;flex:1;display:grid;gap:1px;text-align:center}
        .analytics-viewport-status strong{overflow:hidden;color:var(--text,#f4f4f6);font-size:10px;font-weight:850;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
        .analytics-viewport-status small{overflow:hidden;color:var(--muted,#8f8f98);font-size:9px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
        .analytics-viewport-dates,.analytics-viewport-reset{font-size:10px!important;min-width:47px!important}
        .analytics-viewport-date-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:8px;align-items:end;width:100%;min-width:0;box-sizing:border-box;margin:6px 0 2px;padding:9px;border:1px solid var(--line,rgba(255,255,255,.10));border-radius:12px;background:var(--surface-raised,rgba(255,255,255,.03));overflow:hidden}
        .analytics-viewport-date-panel[hidden]{display:none!important}
        .analytics-viewport-date-panel label{display:grid;gap:4px;min-width:0;max-width:100%;overflow:hidden;color:var(--muted,#8f8f98);font-size:9px;font-weight:800;letter-spacing:.03em}
        .analytics-viewport-date-panel input{display:block;inline-size:100%;min-inline-size:0;max-inline-size:100%;width:100%;min-width:0;max-width:100%;height:36px;box-sizing:border-box;margin:0;padding:0 7px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;background:var(--surface,#111114);color:var(--text,#f4f4f6);font:inherit;font-size:10px;font-weight:750;color-scheme:inherit}
        .analytics-viewport-date-panel button{height:36px;padding:0 12px;border:0;border-radius:9px;background:var(--accent,#2f80ff);color:#fff;font:inherit;font-size:10px;font-weight:850;touch-action:manipulation}
        .analytics-viewport-scrubber{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;width:100%;min-width:0;box-sizing:border-box;margin:7px 2px 1px;color:var(--muted,#8f8f98);font-size:8px;font-weight:750}
        .analytics-viewport-scrub-track{position:relative;height:20px;display:flex;min-width:0;align-items:center}
        .analytics-viewport-scrub-track::before{content:"";position:absolute;left:0;right:0;height:4px;border-radius:999px;background:var(--line,rgba(255,255,255,.10))}
        .analytics-viewport-scrub-window{position:absolute;left:var(--viewport-left,0%);width:var(--viewport-width,100%);height:6px;border-radius:999px;background:var(--accent,#2f80ff);opacity:.72;pointer-events:none}
        .analytics-viewport-scrub-track input{position:relative;z-index:2;width:100%;min-width:0;height:20px;margin:0;opacity:.001;cursor:grab;touch-action:pan-y}
        .analytics-viewport-scrub-track input:active{cursor:grabbing}
        .analytics-viewport-scrub-track input:disabled{cursor:default}
        .analytics-viewport-hint{margin:5px 2px 0;color:var(--muted,#8f8f98);font-size:9px;line-height:1.35;text-align:center}
        .analytics-viewport-stage.is-zoomed{cursor:grab}
        .analytics-viewport-stage.is-dragging{cursor:grabbing}
        html[data-theme-mode="light"] .analytics-viewport-tooltip{box-shadow:0 8px 22px rgba(40,67,99,.13)}

        #calorie-progress .expenditure-trend-card>.analytics-viewport-controls,
        #calorie-progress .expenditure-trend-card>.analytics-viewport-date-panel,
        #calorie-progress .expenditure-trend-card>.analytics-viewport-scrubber,
        #calorie-progress .expenditure-trend-card>.analytics-viewport-hint{position:relative;z-index:2;clear:both}
        #calorie-progress .expenditure-trend-card>.analytics-viewport-controls{margin-top:10px}
        #calorie-progress .expenditure-trend-card .expenditure-chart-hint{display:none!important}
        #calorie-progress .expenditure-trend-card .expenditure-chart-legend{margin-top:10px!important}
        #calorie-progress .expenditure-trend-card .expenditure-chart-ranges{position:relative!important;z-index:1!important;clear:both!important;margin-top:10px!important;margin-bottom:0!important}

        @media(max-width:520px){
            .analytics-viewport-controls{display:grid;grid-template-columns:32px minmax(0,1fr) 32px;gap:5px;padding:6px}
            .analytics-viewport-controls button{min-width:0;width:100%;height:31px;padding-inline:6px}
            .analytics-viewport-dates{grid-column:1/3;min-width:0!important}
            .analytics-viewport-reset{grid-column:3;min-width:0!important}
            .analytics-viewport-controls[data-kind="weight"]{grid-template-columns:32px minmax(0,1fr) 70px 32px}
            .analytics-viewport-controls[data-kind="weight"] .analytics-viewport-status{grid-column:2/4}
            .analytics-viewport-controls[data-kind="weight"] [data-viewport-in]{grid-column:4}
            .analytics-viewport-controls[data-kind="weight"] .analytics-viewport-dates{grid-column:1/3}
            .analytics-viewport-controls[data-kind="weight"] .analytics-viewport-reset{grid-column:3/5;min-width:70px!important;padding-inline:12px;white-space:nowrap}
            .analytics-viewport-date-panel{grid-template-columns:minmax(0,1fr);gap:8px;padding:9px}
            .analytics-viewport-date-panel button{grid-column:1;width:100%}
            .analytics-viewport-scrubber{gap:5px;margin-top:8px;font-size:7px}
        }

        #weight-progress .weight-chart-card.has-weight-hero{padding:12px 10px!important;border-radius:20px}
        .has-weight-hero .chart-header{align-items:center!important;gap:8px!important;margin-bottom:2px}
        .has-weight-hero .chart-header h3{font-size:18px!important;line-height:1.2;margin:0!important}
        .has-weight-hero .chart-header p,.has-weight-hero .weight-chart-kicker{display:none!important}
        .weight-chart-expand{display:grid;place-items:center;flex:none;width:38px;min-width:38px;height:38px;margin-left:auto;border:1px solid var(--line);border-radius:11px;background:var(--surface-raised,var(--card));color:var(--accent);touch-action:manipulation}
        .weight-chart-expand svg{width:19px;height:19px}
        .has-weight-hero .weight-chart-period-summary{padding:12px!important;margin:10px 0 0!important;border:1px solid var(--line);border-radius:14px;background:var(--surface-raised,var(--card));gap:5px 16px!important}
        .has-weight-hero .weight-chart-period-stat strong{font-size:21px!important}
        .has-weight-hero .weight-chart-period-dates{font-size:10px!important}
        .analytics-viewport-controls[data-kind="weight"],.weight-chart-expanded .analytics-viewport-controls[data-kind="weight"]{display:grid!important;grid-template-columns:44px 44px minmax(70px,1fr) minmax(70px,1fr)!important;gap:7px!important;padding:0!important;border:0!important;background:transparent!important;margin:8px 0 0!important}
        .analytics-viewport-controls[data-kind="weight"] .analytics-viewport-status{display:none!important}
        .analytics-viewport-controls[data-kind="weight"] button{grid-column:auto!important;min-width:0!important;width:100%;height:38px;white-space:nowrap;padding:0 8px!important;font-size:12px!important}
        .analytics-viewport-controls[data-kind="weight"] [data-viewport-out],.analytics-viewport-controls[data-kind="weight"] [data-viewport-in]{font-size:21px!important}
        .analytics-viewport-scrubber[data-kind="weight"],.has-weight-hero>.analytics-viewport-hint[data-kind="weight"]{display:none!important}
        .weight-chart-expanded{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;box-sizing:border-box;margin:0;border:0;border-radius:0;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px calc(env(safe-area-inset-bottom,0px) + 10px);background:var(--card,#fff);color:var(--text,#12213a);overflow-y:auto;overscroll-behavior:contain;z-index:2147483647}
        .weight-chart-expanded::backdrop{background:var(--card,#fff)}
        .weight-chart-expanded:not([open]){display:none}
        .weight-chart-expanded-header{display:grid;grid-template-columns:64px 1fr 64px;align-items:center;min-height:44px;gap:8px;margin-bottom:5px}
        .weight-chart-expanded-header strong{text-align:center;font-size:17px}
        .weight-chart-expanded-header button{height:40px;padding:0;border:0;background:transparent;color:var(--accent);font:inherit;font-size:15px;text-align:left}
        .weight-chart-expanded-header span{text-align:right;color:var(--muted);font-size:12px}
        .weight-chart-expanded .weight-chart-range-control{display:grid;grid-template-columns:repeat(7,minmax(34px,1fr));gap:4px;margin:8px 0 0;padding:3px;border-radius:12px;border:1px solid var(--line);background:var(--surface-raised,var(--card));overflow-x:auto}
        .weight-chart-expanded .weight-chart-range-control button{height:34px;min-width:0;margin:0;padding:0 3px;border:0;border-radius:9px;background:transparent;color:var(--muted);font:inherit;font-size:11px;font-weight:800;touch-action:manipulation}
        .weight-chart-expanded .weight-chart-range-control button[aria-pressed="true"]{background:var(--accent);color:#fff}
        .weight-chart-expanded .weight-chart-range-control button:disabled{opacity:.35}
        .weight-chart-expanded .analytics-viewport-stage{border-radius:0}
        .weight-chart-expanded .analytics-viewport-hint{margin:8px 0 0;font-size:10px}
        .has-weight-hero[data-weight-graph-view="carbs"]>.analytics-viewport-controls[data-kind="weight"],.has-weight-hero[data-weight-graph-view="carbs"]>.analytics-viewport-date-panel[data-kind="weight"],.has-weight-hero[data-weight-graph-view="carbs"]>.weight-chart-period-summary{display:none!important}
    `;
    document.head.appendChild(style);
}

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dateMs(value) { return new Date(`${value}T12:00:00`).getTime(); }
function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return localDateString(date);
}
function daysBetween(start, end) { return Math.max(1, Math.round((dateMs(end) - dateMs(start)) / DAY_MS) + 1); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function themeColor(token, fallback) { return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback; }
function formatDate(value, includeYear = false) {
    if (!value) return "";
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(includeYear ? { year: "numeric" } : {}) });
}
function formatLongRange(start, end) {
    if (!start || !end) return "—";
    const a = new Date(`${start}T12:00:00`);
    const b = new Date(`${end}T12:00:00`);
    const sameYear = a.getFullYear() === b.getFullYear();
    const left = a.toLocaleDateString("en-US", { month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
    const right = b.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return `${left} – ${right}`;
}
function stableText(node, value) { if (node && node.textContent !== String(value ?? "")) node.textContent = String(value ?? ""); }
function stableMetric(strong, value, suffix = "cal") {
    if (!strong) return;
    const wanted = `${value} ${suffix}`;
    if (strong.textContent.replace(/\s+/g, " ").trim() === wanted) return;
    const em = strong.querySelector("em");
    if (em) {
        if (strong.firstChild) strong.firstChild.data = `${value} `;
        else strong.prepend(document.createTextNode(`${value} `));
        stableText(em, suffix);
    } else {
        strong.textContent = wanted;
    }
}
function positive(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }

function readWeightEntries() { return weightData().entries; }
function phaseStartDate() {
    try {
        const phases = JSON.parse(localStorage.getItem("level_up_nutrition_phases") || "[]");
        return (Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) : null)?.startDate || null;
    } catch {
        return null;
    }
}
function goalWeight() {
    try {
        const phases = JSON.parse(localStorage.getItem("level_up_nutrition_phases") || "[]");
        const phase = Array.isArray(phases) ? [...phases].reverse().find(item => item?.startDate && !item?.endDate) : null;
        const phaseGoal = Number(phase?.goalWeight ?? phase?.targetWeight);
        if (Number.isFinite(phaseGoal) && phaseGoal > 0) return phaseGoal;
    } catch {}
    const stored = Number(localStorage.getItem("level_up_goal_weight"));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
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
function expenditureData(startDate = null) {
    try {
        const formula = profileMaintenance();
        const current = getCalculatedMaintenanceEstimate(formula);
        const raw = (getCalculatedMaintenanceHistory(formula, startDate ? { startDate } : undefined) || []).map(point => ({ ...point }));
        const today = localDateString();
        const currentLive = positive(current?.liveMaintenanceCalories);
        const currentReviewed = positive(current?.maintenanceCalories);
        const todayPoint = raw.find(point => point?.date === today);
        if (todayPoint) {
            if (currentLive !== null) todayPoint.liveMaintenanceCalories = currentLive;
            if (currentReviewed !== null) todayPoint.maintenanceCalories = currentReviewed;
        } else if (currentLive !== null || currentReviewed !== null) {
            raw.push({ date: today, liveMaintenanceCalories: currentLive, maintenanceCalories: currentReviewed });
        }
        raw.sort((a, b) => String(a.date).localeCompare(String(b.date)));
        let lastUsable = null;
        const points = raw.map(point => {
            const live = positive(point.liveMaintenanceCalories);
            const reviewed = positive(point.maintenanceCalories);
            if (live !== null) {
                lastUsable = live;
                return { date: point.date, value: live, mode: "updating" };
            }
            const held = lastUsable ?? reviewed;
            if (held !== null) {
                lastUsable = held;
                return { date: point.date, value: held, mode: "holding" };
            }
            return null;
        }).filter(Boolean);
        return { formula, current, points };
    } catch {
        return { formula: null, current: null, points: [] };
    }
}

function chartKind(canvas) { return canvas?.id === "weight-trend-chart" ? "weight" : "expenditure"; }
function storageKey(kind) { return kind === "weight" ? WEIGHT_WINDOW_KEY : EXPENDITURE_WINDOW_KEY; }
function selectedRange(instance) {
    const root = instance.legacy.closest(".weight-chart-card, .calorie-stats-page, .expenditure-trend-card") || document;
    const selector = instance.kind === "weight"
        ? "[data-weight-chart-range][aria-pressed='true']"
        : "[data-tdee-chart-range][aria-pressed='true']";
    const button = root.querySelector?.(selector) || document.querySelector(selector);
    if (button) return String(button.dataset.weightChartRange || button.dataset.tdeeChartRange || "").toLowerCase();
    return instance.kind === "weight"
        ? String(localStorage.getItem("level_up_weight_chart_range") || "3m").toLowerCase()
        : String(localStorage.getItem("level_up_tdee_chart_range_v1") || "3m").toLowerCase();
}
function domainFor(instance) {
    const range = selectedRange(instance);
    const today = localDateString();
    if (instance.kind === "weight") {
        const presetDays = RANGE_DAYS[range] || 90;
        const earliest = readWeightEntries()[0]?.date || today;
        if (range === "all") return { start: earliest, end: today };
        return { start: earliest < shiftDate(today, -(presetDays - 1)) ? earliest : shiftDate(today, -(presetDays - 1)), end: today };
    }
    if (range === "phase") {
        const start = phaseStartDate();
        if (start) return { start, end: today };
    }
    if (range === "all") {
        const start = instance.kind === "weight" ? readWeightEntries()[0]?.date : expenditureData().points[0]?.date;
        if (start) return { start, end: today };
    }
    const days = RANGE_DAYS[range] || 30;
    return { start: shiftDate(today, -(days - 1)), end: today };
}
function readStoredWindow(kind) {
    try {
        const value = JSON.parse(sessionStorage.getItem(storageKey(kind)) || "null");
        return value?.start && value?.end ? value : null;
    } catch {
        return null;
    }
}
function normalizeWindow(domain, start, end) {
    let a = String(start || domain.start);
    let b = String(end || domain.end);
    if (a > b) [a, b] = [b, a];
    if (a < domain.start) a = domain.start;
    if (b > domain.end) b = domain.end;
    if (a > domain.end || b < domain.start) return null;
    const total = daysBetween(domain.start, domain.end);
    if (total >= MIN_VISIBLE_DAYS && daysBetween(a, b) < MIN_VISIBLE_DAYS) {
        b = shiftDate(a, MIN_VISIBLE_DAYS - 1);
        if (b > domain.end) {
            b = domain.end;
            a = shiftDate(b, -(MIN_VISIBLE_DAYS - 1));
        }
    }
    return a === domain.start && b === domain.end ? null : { start: a, end: b };
}
function selectedWeightWindow(instance, domain) {
    const range = selectedRange(instance);
    if (range === "all") return null;
    const start = range === "phase" ? phaseStartDate() : shiftDate(domain.end, -((RANGE_DAYS[range] || 90) - 1));
    return normalizeWindow(domain, start || domain.start, domain.end);
}
function effectiveWindow(instance) {
    const domain = domainFor(instance);
    const candidate = instance.hasPreview ? instance.previewWindow : readStoredWindow(instance.kind);
    const stored = candidate ? normalizeWindow(domain, candidate.start, candidate.end) : null;
    const viewport = stored || (!instance.hasPreview && !candidate && instance.kind === "weight" ? selectedWeightWindow(instance, domain) : null);
    return viewport ? { domain, window: viewport, start: viewport.start, end: viewport.end } : { domain, window: null, start: domain.start, end: domain.end };
}
function saveWindow(kind, value) {
    if (!value) sessionStorage.removeItem(storageKey(kind));
    else sessionStorage.setItem(storageKey(kind), JSON.stringify(value));
}

function prepareCanvas(instance, fallbackHeight) {
    const canvas = instance.canvas;
    const width = Math.max(1, Math.round(instance.stage.clientWidth || canvas.clientWidth || 320));
    const height = Math.max(1, Math.round(fallbackHeight));
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;
    canvas.style.width = "100%";
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.setLineDash([]);
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    return { context, width, height };
}
function drawEmpty(context, message) {
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "600 12px Arial";
    context.textAlign = "left";
    context.fillText(message, 20, 44);
}
function drawDateAxis(context, start, end, left, right, y) {
    const first = dateMs(start);
    const last = dateMs(end);
    const middle = localDateString(new Date((first + last) / 2));
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "800 9px Arial";
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(formatDate(start), left, y);
    if (start !== end) {
        context.textAlign = "center";
        context.fillText(formatDate(middle), (left + right) / 2, y);
        context.textAlign = "right";
        context.fillText(formatDate(end), right, y);
    }
}
function weightScale(values, goal = null) {
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = Math.max(.5, rawMax - rawMin);
    const pad = Math.max(.75, span * .18);
    let min = rawMin - pad;
    let max = rawMax + pad;
    if (Number.isFinite(goal) && goal >= min && goal <= max) {
        min = Math.min(min, goal - .5);
        max = Math.max(max, goal + .5);
    }
    return { min, max };
}
function niceCalorieStep(value) { return [25, 50, 75, 100, 125, 150, 200, 250, 500, 1000].find(step => step >= value) || 2000; }
function expenditureScale(values) {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const spread = Math.max(0, maximum - minimum);
    const desiredSpan = Math.max(150, spread * 1.35);
    const step = niceCalorieStep(desiredSpan / 4);
    const span = step * 4;
    const midpoint = (minimum + maximum) / 2;
    let min = Math.floor((midpoint - span / 2) / step) * step;
    let max = min + span;
    if (minimum < min) {
        min = Math.floor(minimum / step) * step;
        max = min + span;
    }
    if (maximum > max) {
        max = Math.ceil(maximum / step) * step;
        min = max - span;
    }
    return { min, max };
}
function interpolateScale(from, to, t) {
    if (!from) return to;
    return { min: from.min + (to.min - from.min) * t, max: from.max + (to.max - from.max) * t };
}

function updateWeightSummary(instance, start, end, visibleEntries, visibleTrend) {
    const card = instance.legacy.closest(".weight-chart-card");
    if (!card) return;
    const series = visibleTrend.length ? visibleTrend : visibleEntries;
    const values = series.map(item => Number(item.weight)).filter(Number.isFinite);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const change = values.length >= 2 ? values.at(-1) - values[0] : null;
    const shownAverage = Number.isFinite(average) ? displayMass(average) : null;
    const shownChange = Number.isFinite(change) ? displayMass(change) : null;
    const unit = massUnit();
    stableText(card.querySelector("[data-weight-chart-average]"), Number.isFinite(shownAverage) ? `${shownAverage.toFixed(1)} ${unit}` : "—");
    stableText(card.querySelector("[data-weight-chart-change]"), Number.isFinite(shownChange)
        ? `${shownChange > 0 ? "+" : shownChange < 0 ? "−" : ""}${Math.abs(shownChange).toFixed(1)} ${unit}`
        : "—");
    stableText(card.querySelector("[data-weight-chart-period]"), formatLongRange(start, end));
}
function updateExpenditureSummary(instance, start, end, points) {
    const card = instance.legacy.closest(".expenditure-trend-card");
    if (!card) return;
    const values = points.map(point => Number(point.value)).filter(Number.isFinite);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const change = values.length >= 2 ? values.at(-1) - values[0] : null;
    stableText(card.querySelector(".expenditure-trend-heading p"), `${formatDate(start)} – ${formatDate(end)}`);
    const metrics = card.querySelectorAll(".expenditure-trend-metrics > span");
    stableMetric(metrics[0]?.querySelector("strong"), Number.isFinite(average) ? Math.round(average).toLocaleString() : "—");
    const sign = Number.isFinite(change) ? (change > 0 ? "+" : change < 0 ? "−" : "") : "";
    stableMetric(metrics[1]?.querySelector("strong"), Number.isFinite(change) ? `${sign}${Math.abs(Math.round(change)).toLocaleString()}` : "—");
    stableText(metrics[1]?.querySelector("b"), !Number.isFinite(change) ? "Waiting" : change > 0 ? "Increase" : change < 0 ? "Decrease" : "No change");
}

function sampleWeightPoints(points, x, bucketWidth) {
    if (points.length < 3) return points;
    const buckets = new Map();
    points.forEach((point, index) => {
        const key = Math.floor(x(point.date) / bucketWidth);
        const bucket = buckets.get(key) || { first: index, last: index, min: index, max: index };
        bucket.last = index;
        if (point.weight < points[bucket.min].weight) bucket.min = index;
        if (point.weight > points[bucket.max].weight) bucket.max = index;
        buckets.set(key, bucket);
    });
    const indices = new Set([0, points.length - 1]);
    buckets.forEach(bucket => [bucket.first, bucket.min, bucket.max, bucket.last].forEach(index => indices.add(index)));
    return [...indices].sort((a, b) => a - b).map(index => points[index]);
}
function calendarPeriods(start, end, unit) {
    const first = dateMs(start), last = dateMs(end), periods = [];
    const cursor = new Date(first);
    if (unit === "year") cursor.setMonth(0, 1); else cursor.setDate(1);
    while (cursor.getTime() <= last) {
        const from = cursor.getTime();
        const label = unit === "year" ? String(cursor.getFullYear()) : cursor.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
        const key = unit === "year" ? cursor.getFullYear() : cursor.getFullYear() * 12 + cursor.getMonth();
        if (unit === "year") cursor.setFullYear(cursor.getFullYear() + 1); else cursor.setMonth(cursor.getMonth() + 1);
        periods.push({ start: Math.max(first, from), end: Math.min(last, cursor.getTime()), label, key });
    }
    return periods;
}
function drawWeightCalendar(context, start, end, left, right, top, bottom) {
    const first = dateMs(start), elapsed = Math.max(1, dateMs(end) - first);
    const x = ms => left + (ms - first) / elapsed * (right - left);
    const days = daysBetween(start, end);
    const months = calendarPeriods(start, end, "month");
    const years = calendarPeriods(start, end, "year");
    context.save();
    context.fillStyle = themeColor("--accent", "#df141e");
    context.globalAlpha = .035;
    (days > 730 ? years : months).forEach(period => { if (period.key % 2 === 0) context.fillRect(x(period.start), top, x(period.end) - x(period.start), bottom - top); });
    context.globalAlpha = 1;
    context.textAlign = "center";
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "600 12px Arial";
    let previousRight = -Infinity;
    const upperPeriods = days <= 45 ? months.map(p => ({ ...p, label: p.label + " " + new Date(p.start).getFullYear() })) : years;
    upperPeriods.forEach(period => {
        const labelWidth = context.measureText(period.label).width;
        const center = clamp((x(period.start) + x(period.end)) / 2, left + labelWidth / 2, right - labelWidth / 2);
        if (center - labelWidth / 2 >= previousRight + 8) { context.fillText(period.label, center, 17); previousRight = center + labelWidth / 2; }
    });
    context.font = "10px Arial";
    previousRight = -Infinity;
    if (days <= 45) {
        const step = Math.max(1, Math.ceil(days / Math.max(2, (right - left) / 30)));
        for (let index = 0; index < days; index += step) {
            const date = shiftDate(start, index), xx = x(dateMs(date));
            context.fillText(String(new Date(dateMs(date)).getDate()), clamp(xx, left + 5, right - 5), 39);
        }
    } else {
        months.forEach(period => {
            const labelWidth = context.measureText(period.label).width;
            const center = (x(period.start) + x(period.end)) / 2;
            if (x(period.end) - x(period.start) >= labelWidth + 6 && center - labelWidth / 2 >= previousRight + 8) {
                context.fillText(period.label, center, 39); previousRight = center + labelWidth / 2;
            }
        });
    }
    context.strokeStyle = themeColor("--line", "rgba(255,255,255,.07)");
    context.lineWidth = 1;
    const boundaries = days > 730 ? years : months;
    boundaries.forEach(period => {
        context.beginPath(); context.moveTo(x(period.start), top); context.lineTo(x(period.start), bottom); context.stroke();
    });
    context.restore();
}

function weightChartHeight(instance) {
    const viewportHeight = window.visualViewport?.height || window.innerHeight || 700;
    if (!instance.expandedDialog) return Math.round(clamp(viewportHeight * .55, 360, 620));
    const modal = instance.expandedDialog;
    const style = getComputedStyle(modal);
    const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const footerHeight = [instance.expandedHeader, instance.expandedRanges, instance.controls, instance.datePanel, instance.hint]
        .reduce((sum, node) => sum + (node?.hidden ? 0 : (node?.offsetHeight || 0)), 0);
    return Math.round(Math.max(220, (modal.clientHeight || viewportHeight) - padding - footerHeight - 32));
}
function placeAfter(node, anchor) {
    if (node && anchor && (node.parentElement !== anchor.parentElement || node.previousElementSibling !== anchor)) anchor.insertAdjacentElement("afterend", node);
}
function layoutWeightCard(instance) {
    if (instance.kind !== "weight" || instance.expandedDialog) return;
    const card = instance.legacy.closest(".weight-chart-card");
    if (!card) return;
    card.classList.add("has-weight-hero");
    const header = card.querySelector(".chart-header");
    if (header && !header.querySelector(".weight-chart-expand")) {
        const button = document.createElement("button");
        button.type = "button"; button.className = "weight-chart-expand";
        button.setAttribute("aria-label", "Expand weight chart");
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>';
        button.addEventListener("click", () => openExpandedWeightChart(instance, button));
        header.appendChild(button);
    }
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    const ranges = card.querySelector(".weight-chart-range-control");
    if (ranges) placeAfter(ranges, track || instance.stage);
    let anchor = ranges || track || instance.stage;
    for (const node of [instance.controls, instance.datePanel, instance.scrubber, instance.hint, card.querySelector(".weight-chart-period-summary")]) {
        placeAfter(node, anchor); if (node) anchor = node;
    }
    placeAfter(card.querySelector(".weight-graph-carousel-pager-v2"), anchor);
}
function syncExpandedRanges(instance) {
    if (!instance.expandedRanges) return;
    stableText(instance.expandedHeader?.querySelector("span"), massUnit());
    const card = instance.legacy.closest(".weight-chart-card");
    instance.expandedRanges.querySelectorAll("[data-expanded-weight-range]").forEach(button => {
        const source = card?.querySelector(`[data-weight-chart-range="${button.dataset.expandedWeightRange}"]`);
        if (!source) return;
        button.disabled = source.disabled;
        button.setAttribute("aria-pressed", source.getAttribute("aria-pressed") || "false");
        button.title = source.title;
    });
}
function closeExpandedWeightChart(instance) {
    const modal = instance.expandedDialog;
    if (!modal) return;
    instance.expandedDialog = null;
    for (const { node, marker } of instance.expandedMoves || []) {
        if (marker.parentNode) marker.replaceWith(node);
    }
    instance.expandedMoves = null;
    instance.expandedRanges = null;
    instance.expandedHeader = null;
    document.body.style.overflow = instance.previousBodyOverflow;
    if (instance.backgroundApp) instance.backgroundApp.inert = instance.previousAppInert;
    if (modal.open && typeof modal.close === "function") modal.close();
    modal.remove();
    document.removeEventListener("keydown", instance.expandedKeydown);
    window.removeEventListener("popstate", instance.expandedBack);
    layoutWeightCard(instance);
    renderInstance(instance);
    instance.expandTrigger?.focus({ preventScroll: true });
}
function openExpandedWeightChart(instance, trigger) {
    if (instance.expandedDialog) return;
    const card = instance.legacy.closest(".weight-chart-card");
    if (!card) return;
    const modal = document.createElement("dialog");
    modal.className = "weight-chart-expanded";
    modal.setAttribute("aria-label", "Expanded weight trend chart");
    modal.setAttribute("aria-modal", "true");
    const header = document.createElement("header");
    header.className = "weight-chart-expanded-header";
    header.innerHTML = '<button type="button" data-close-weight-chart>Done</button><strong>Weight trend</strong><span></span>';
    stableText(header.querySelector("span"), massUnit());
    modal.appendChild(header);
    instance.expandedDialog = modal;
    instance.expandedHeader = header;
    instance.expandTrigger = trigger;
    instance.previousBodyOverflow = document.body.style.overflow;
    instance.backgroundApp = document.getElementById("app");
    instance.previousAppInert = Boolean(instance.backgroundApp?.inert);
    instance.expandedMoves = [];
    const move = node => {
        const marker = document.createComment("expanded weight chart placeholder");
        node.parentNode.insertBefore(marker, node);
        instance.expandedMoves.push({ node, marker });
        modal.appendChild(node);
    };
    move(instance.stage);
    const ranges = document.createElement("div");
    ranges.className = "weight-chart-range-control";
    ranges.setAttribute("role", "group"); ranges.setAttribute("aria-label", "Weight chart timeframe");
    card.querySelectorAll(".weight-chart-range-control [data-weight-chart-range]").forEach(source => {
        const button = source.cloneNode(true);
        button.dataset.expandedWeightRange = source.dataset.weightChartRange;
        button.removeAttribute("data-weight-chart-range");
        button.addEventListener("click", () => { source.click(); requestAnimationFrame(() => { syncExpandedRanges(instance); renderInstance(instance); }); });
        ranges.appendChild(button);
    });
    instance.expandedRanges = ranges;
    modal.appendChild(ranges);
    move(instance.controls); move(instance.datePanel); move(instance.hint);
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
    if (instance.backgroundApp) instance.backgroundApp.inert = true;
    header.querySelector("button").addEventListener("click", () => closeExpandedWeightChart(instance));
    modal.addEventListener("cancel", event => { event.preventDefault(); closeExpandedWeightChart(instance); });
    instance.expandedKeydown = event => { if (event.key === "Escape") { event.preventDefault(); closeExpandedWeightChart(instance); } };
    instance.expandedBack = () => closeExpandedWeightChart(instance);
    document.addEventListener("keydown", instance.expandedKeydown);
    window.addEventListener("popstate", instance.expandedBack);
    syncExpandedRanges(instance);
    renderInstance(instance);
    requestAnimationFrame(() => renderInstance(instance));
    header.querySelector("button").focus();
}

function traceWeightTrendCurve(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index], next = points[index + 1];
        context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const last = points.at(-1);
    if (points.length > 1) context.lineTo(last.x, last.y);
}

function drawWeight(instance, state, scaleOverride = null) {
    const prepared = prepareCanvas(instance, weightChartHeight(instance));
    if (!prepared) return { points: [], scale: null };
    const { context, width, height } = prepared;
    const entries = readWeightEntries();
    const trend = weightData().trend;
    const visibleEntries = entries.filter(entry => entry.date >= state.start && entry.date <= state.end);
    const visibleTrend = trend.filter(entry => entry.date >= state.start && entry.date <= state.end);
    updateWeightSummary(instance, state.start, state.end, visibleEntries, visibleTrend);
    const values = [...visibleEntries.map(entry => entry.weight), ...visibleTrend.map(entry => entry.weight)].filter(Number.isFinite);
    if (!values.length) {
        drawEmpty(context, "No weight data in these dates.");
        return { points: [], scale: scaleOverride };
    }
    const goal = goalWeight();
    const targetScale = weightScale(values, goal);
    const scale = scaleOverride || targetScale;
    const padding = { left: 50, right: 18, top: 58, bottom: 18 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const first = dateMs(state.start);
    const last = dateMs(state.end);
    const elapsed = Math.max(1, last - first);
    const x = date => padding.left + ((dateMs(date) - first) / elapsed) * plotWidth;
    const yRange = Math.max(.1, scale.max - scale.min);
    const y = value => padding.top + ((scale.max - value) / yRange) * plotHeight;

    drawWeightCalendar(context, state.start, state.end, padding.left, width - padding.right, padding.top, height - padding.bottom);
    context.font = "10px Arial";
    context.textAlign = "right";
    for (let index = 0; index <= 3; index += 1) {
        const fraction = index / 3;
        const yy = padding.top + plotHeight * fraction;
        const value = scale.max - yRange * fraction;
        context.strokeStyle = themeColor("--line", "rgba(255,255,255,.07)");
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(padding.left, yy);
        context.lineTo(width - padding.right, yy);
        context.stroke();
        const shown = displayMass(value);
        context.fillStyle = themeColor("--muted", "#85858f");
        context.fillText(Number.isFinite(shown) ? shown.toFixed(1) : "", padding.left - 8, yy + 3);
    }
    const trendByDate = new Map(visibleTrend.map(point => [point.date, point.weight]));
    const sampledTrend = sampleWeightPoints(visibleTrend, x, 1);
    context.save();
    context.beginPath();
    context.rect(padding.left - 3, padding.top, plotWidth + 6, plotHeight);
    context.clip();
    if (sampledTrend.length >= 2) {
        const accent = themeColor("--accent", "#df141e");
        context.beginPath();
        traceWeightTrendCurve(context, sampledTrend.map(entry => ({ x: x(entry.date), y: y(entry.weight) })));
        context.lineTo(x(sampledTrend.at(-1).date), height - padding.bottom);
        context.lineTo(x(sampledTrend[0].date), height - padding.bottom);
        context.closePath();
        context.fillStyle = accent;
        context.globalAlpha = .09;
        context.fill();
        context.globalAlpha = 1;
        context.beginPath();
        traceWeightTrendCurve(context, sampledTrend.map(entry => ({ x: x(entry.date), y: y(entry.weight) })));
        context.strokeStyle = accent;
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();
    }
    const sampledEntries = sampleWeightPoints(visibleEntries, x, 4);
    sampledEntries.forEach(entry => {
        const trendWeight = trendByDate.get(entry.date);
        context.strokeStyle = themeColor("--accent", "#df141e");
        context.fillStyle = themeColor("--accent", "#df141e");
        if (Number.isFinite(trendWeight)) {
            context.globalAlpha = .4;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(x(entry.date), y(trendWeight));
            context.lineTo(x(entry.date), y(entry.weight));
            context.stroke();
        }
        context.globalAlpha = .8;
        context.beginPath();
        context.arc(x(entry.date), y(entry.weight), visibleEntries.length > plotWidth / 3 ? 1.6 : 2.7, 0, Math.PI * 2);
        context.fill();
    });
    context.restore();
    if (Number.isFinite(goal) && goal >= scale.min && goal <= scale.max) {
        context.save();
        context.setLineDash([5, 5]);
        context.strokeStyle = themeColor("--muted", "rgba(255,255,255,.35)");
        context.beginPath();
        context.moveTo(padding.left, y(goal));
        context.lineTo(width - padding.right, y(goal));
        context.stroke();
        context.restore();
    }

    context.textAlign = "left";
    context.fillStyle = themeColor("--muted", "#85858f");
    context.font = "9px Arial";
    context.fillText(massUnit(), 8, 14);
    const points = visibleEntries.map(entry => {
        const trendWeight = trendByDate.get(entry.date);
        return { date: entry.date, value: entry.weight, trend: trendWeight ?? null, x: x(entry.date) };
    });
    return { points, scale: targetScale };
}

function drawExpenditure(instance, state, scaleOverride = null) {
    const prepared = prepareCanvas(instance, 250);
    if (!prepared) return { points: [], scale: null };
    const { context, width, height } = prepared;
    const data = expenditureData(shiftDate(state.start, -28));
    const points = data.points.filter(point => point.date >= state.start && point.date <= state.end);
    updateExpenditureSummary(instance, state.start, state.end, points);
    if (!points.length) {
        drawEmpty(context, "No expenditure data in these dates.");
        return { points: [], scale: scaleOverride };
    }
    const values = points.map(point => point.value);
    if (Number.isFinite(data.formula)) values.push(data.formula);
    const targetScale = expenditureScale(values);
    const scale = scaleOverride || targetScale;
    const padding = { top: 18, right: 46, bottom: 30, left: 8 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const first = dateMs(state.start);
    const last = dateMs(state.end);
    const elapsed = Math.max(1, last - first);
    const x = point => padding.left + ((dateMs(point.date) - first) / elapsed) * plotWidth;
    const y = value => padding.top + (1 - (value - scale.min) / Math.max(1, scale.max - scale.min)) * plotHeight;

    context.font = "800 9px Arial";
    context.textAlign = "left";
    context.textBaseline = "middle";
    for (let index = 0; index <= 4; index += 1) {
        const value = scale.max - (scale.max - scale.min) * index / 4;
        const yy = padding.top + plotHeight * index / 4;
        context.strokeStyle = themeColor("--line", "rgba(255,255,255,.09)");
        context.lineWidth = 1;
        context.setLineDash([3, 3]);
        context.beginPath();
        context.moveTo(padding.left, yy);
        context.lineTo(width - padding.right + 4, yy);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = themeColor("--muted", "#85858f");
        context.fillText(Math.round(value).toLocaleString(), width - padding.right + 9, yy);
    }
    if (Number.isFinite(data.formula) && data.formula >= scale.min && data.formula <= scale.max) {
        context.save();
        context.setLineDash([5, 5]);
        context.strokeStyle = themeColor("--muted", "#777780");
        context.globalAlpha = .72;
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(padding.left, y(data.formula));
        context.lineTo(width - padding.right + 4, y(data.formula));
        context.stroke();
        context.restore();
    }
    const accent = themeColor("--accent", "#ff3b4b");
    const cardColor = themeColor("--card", "#1b1b1f");
    for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const point = points[index];
        context.save();
        context.strokeStyle = accent;
        context.lineWidth = point.mode === "holding" ? 2 : 2.75;
        context.globalAlpha = point.mode === "holding" ? .46 : .96;
        context.setLineDash(point.mode === "holding" ? [5, 5] : []);
        context.beginPath();
        context.moveTo(x(previous), y(previous.value));
        context.lineTo(x(point), y(point.value));
        context.stroke();
        context.restore();
    }
    const stride = points.length > 180 ? 14 : points.length > 90 ? 7 : points.length > 45 ? 3 : 1;
    points.forEach((point, index) => {
        if (index % stride !== 0 && index !== points.length - 1) return;
        context.save();
        context.strokeStyle = accent;
        context.fillStyle = cardColor;
        context.globalAlpha = point.mode === "holding" ? .56 : 1;
        context.lineWidth = 2;
        if (point.mode === "holding") {
            context.beginPath();
            context.rect(x(point) - 3, y(point.value) - 3, 6, 6);
            context.fill();
            context.stroke();
        } else {
            context.beginPath();
            context.arc(x(point), y(point.value), 3.2, 0, Math.PI * 2);
            context.fill();
            context.stroke();
        }
        context.restore();
    });
    context.textBaseline = "alphabetic";
    drawDateAxis(context, state.start, state.end, padding.left, width - padding.right, height - 7);
    return { points: points.map(point => ({ ...point, x: x(point) })), scale: targetScale };
}

function updateStatus(instance) {
    const state = effectiveWindow(instance);
    const active = Boolean(state.window);
    const visibleDays = daysBetween(state.start, state.end);
    const sameYear = state.start.slice(0, 4) === state.end.slice(0, 4);
    stableText(instance.statusStrong, instance.kind === "weight" ? formatLongRange(state.start, state.end) : active ? `Viewing ${formatDate(state.start, !sameYear)} – ${formatDate(state.end, true)}` : "Full selected range");
    stableText(instance.statusSmall, instance.kind === "weight" ? `${visibleDays} days · pinch to zoom · drag for history` : active ? `${visibleDays} days · drag chart or scrubber to move` : "Pinch, use +, or choose exact dates");
    instance.minus.disabled = !active;
    instance.plus.disabled = visibleDays <= Math.min(MIN_VISIBLE_DAYS, daysBetween(state.domain.start, state.domain.end));
    instance.reset.disabled = instance.kind === "weight" ? state.end === state.domain.end : !active;
    instance.startInput.min = state.domain.start;
    instance.startInput.max = state.domain.end;
    instance.endInput.min = state.domain.start;
    instance.endInput.max = state.domain.end;
    if (document.activeElement !== instance.startInput) instance.startInput.value = state.start;
    if (document.activeElement !== instance.endInput) instance.endInput.value = state.end;
    const total = daysBetween(state.domain.start, state.domain.end);
    const maxOffset = Math.max(0, total - visibleDays);
    const offset = Math.max(0, daysBetween(state.domain.start, state.start) - 1);
    instance.scrub.min = "0";
    instance.scrub.max = String(maxOffset);
    instance.scrub.value = String(Math.min(offset, maxOffset));
    instance.scrub.disabled = maxOffset === 0;
    const left = total > 1 ? (offset / (total - 1)) * 100 : 0;
    const width = total > 0 ? (visibleDays / total) * 100 : 100;
    instance.scrubTrack.style.setProperty("--viewport-left", `${Math.min(100, left)}%`);
    instance.scrubTrack.style.setProperty("--viewport-width", `${Math.min(100, width)}%`);
    stableText(instance.scrubStart, formatDate(state.domain.start));
    stableText(instance.scrubEnd, formatDate(state.domain.end));
    instance.stage.classList.toggle("is-zoomed", active);
}
function renderInstance(instance, { freezeY = false, scaleOverride = null } = {}) {
    if (!instance.legacy.isConnected || !instance.canvas.isConnected || instance.rendering) return;
    instance.rendering = true;
    try {
        layoutWeightCard(instance);
        syncExpandedRanges(instance);
        const state = effectiveWindow(instance);
        const override = scaleOverride || (freezeY ? instance.yScale : null);
        const result = instance.kind === "weight" ? drawWeight(instance, state, override) : drawExpenditure(instance, state, override);
        instance.points = result.points;
        if (!freezeY && result.scale) instance.yScale = result.scale;
        instance.tooltip.hidden = true;
        updateStatus(instance);
    } finally {
        instance.rendering = false;
    }
}
function animateCommittedScale(instance, fromScale) {
    const state = effectiveWindow(instance);
    const probe = instance.kind === "weight" ? drawWeight(instance, state, fromScale) : drawExpenditure(instance, state, fromScale);
    const target = probe.scale;
    if (!fromScale || !target) {
        instance.yScale = target;
        renderInstance(instance);
        return;
    }
    const started = performance.now();
    const duration = 140;
    const tick = now => {
        const t = clamp((now - started) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        renderInstance(instance, { freezeY: true, scaleOverride: interpolateScale(fromScale, target, eased) });
        if (t < 1) requestAnimationFrame(tick);
        else {
            instance.yScale = target;
            renderInstance(instance);
        }
    };
    requestAnimationFrame(tick);
}
function commitWindow(instance, start, end, { animate = true } = {}) {
    const domain = domainFor(instance);
    const next = normalizeWindow(domain, start, end);
    const oldScale = instance.yScale;
    instance.previewWindow = null;
    instance.hasPreview = false;
    saveWindow(instance.kind, instance.kind === "weight" ? (next || { start: domain.start, end: domain.end }) : next);
    if (animate) animateCommittedScale(instance, oldScale);
    else renderInstance(instance);
}
function previewWindow(instance, start, end) {
    const domain = domainFor(instance);
    instance.previewWindow = normalizeWindow(domain, start, end);
    instance.hasPreview = true;
    renderInstance(instance, { freezeY: true });
}
function windowAroundAnchor(domain, anchorMs, fraction, days) {
    const total = daysBetween(domain.start, domain.end);
    const visible = clamp(Math.round(days), Math.min(MIN_VISIBLE_DAYS, total), total);
    const span = (visible - 1) * DAY_MS;
    const startMs = anchorMs - clamp(fraction, 0, 1) * span;
    let start = localDateString(new Date(startMs));
    let end = shiftDate(start, visible - 1);
    if (start < domain.start) {
        start = domain.start;
        end = shiftDate(start, visible - 1);
    }
    if (end > domain.end) {
        end = domain.end;
        start = shiftDate(end, -(visible - 1));
    }
    return { start, end };
}
function zoomBy(instance, factor) {
    const state = effectiveWindow(instance);
    const total = daysBetween(state.domain.start, state.domain.end);
    const current = daysBetween(state.start, state.end);
    const nextDays = clamp(Math.round(current / factor), Math.min(MIN_VISIBLE_DAYS, total), total);
    const anchor = (dateMs(state.start) + dateMs(state.end)) / 2;
    const next = windowAroundAnchor(state.domain, anchor, .5, nextDays);
    commitWindow(instance, next.start, next.end);
}
function shiftedWindow(domain, start, end, delta) {
    const visible = daysBetween(start, end);
    let a = shiftDate(start, delta);
    let b = shiftDate(end, delta);
    if (a < domain.start) {
        a = domain.start;
        b = shiftDate(a, visible - 1);
    }
    if (b > domain.end) {
        b = domain.end;
        a = shiftDate(b, -(visible - 1));
    }
    return { start: a, end: b };
}
function showNearestPoint(instance, clientX) {
    if (!instance.points?.length) return;
    const rect = instance.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const nearest = instance.points.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best, instance.points[0]);
    const unit = instance.kind === "weight" ? massUnit() : "cal/day";
    const shown = instance.kind === "weight" ? displayMass(nearest.value) : nearest.value;
    const trendShown = instance.kind === "weight" && Number.isFinite(nearest.trend) ? displayMass(nearest.trend) : null;
    stableText(instance.tooltipDate, formatDate(nearest.date, true));
    stableText(instance.tooltipValue, `${instance.kind === "weight" ? "Weight" : "Expenditure"}: ${Number(shown).toLocaleString(undefined, { maximumFractionDigits: instance.kind === "weight" ? 1 : 0 })} ${unit}`);
    const extra = Number.isFinite(trendShown)
        ? `Trend: ${trendShown.toFixed(1)} ${unit} · ${shown - trendShown > 0 ? "+" : ""}${(shown - trendShown).toFixed(1)} vs trend`
        : instance.kind === "expenditure"
            ? (nearest.mode === "holding" ? "Holding last usable estimate" : "Updating from current evidence")
            : "";
    stableText(instance.tooltipExtra, extra);
    instance.tooltipExtra.hidden = !extra;
    instance.tooltip.hidden = false;
    const desired = nearest.x < rect.width / 2 ? nearest.x + 9 : nearest.x - 154;
    instance.tooltip.style.left = `${clamp(desired, 6, Math.max(6, rect.width - 172))}px`;
    instance.tooltip.style.top = "8px";
}

function bindGestures(instance) {
    const pointers = new Map();
    let tapStart = null;
    let dragStart = null;
    let pinchStart = null;
    let lastTap = 0;
    let longPressTimer = 0;
    let longPressed = false;
    const cancelLong = () => {
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = 0;
    };
    const down = event => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.stopPropagation();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        instance.stage.setPointerCapture?.(event.pointerId);
        const state = effectiveWindow(instance);
        if (pointers.size === 2) {
            cancelLong();
            const values = [...pointers.values()];
            const rect = instance.stage.getBoundingClientRect();
            const centerX = (values[0].x + values[1].x) / 2;
            const fraction = clamp((centerX - rect.left - (instance.kind === "weight" ? 50 : 0)) / Math.max(1, rect.width - (instance.kind === "weight" ? 68 : 0)), 0, 1);
            pinchStart = {
                distance: Math.max(1, Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y)),
                days: daysBetween(state.start, state.end),
                anchorMs: dateMs(state.start) + (dateMs(state.end) - dateMs(state.start)) * fraction,
                fraction,
                domain: state.domain
            };
            dragStart = null;
            tapStart = null;
            instance.stage.classList.add("is-dragging");
            event.preventDefault();
            return;
        }
        tapStart = { x: event.clientX, y: event.clientY };
        longPressed = false;
        longPressTimer = setTimeout(() => {
            longPressed = true;
            showNearestPoint(instance, event.clientX);
        }, 360);
        if (state.window) dragStart = { x: event.clientX, start: state.start, end: state.end, domain: state.domain, moved: false };
    };
    const move = event => {
        if (!pointers.has(event.pointerId)) return;
        event.stopPropagation();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size >= 2 && pinchStart) {
            cancelLong();
            const values = [...pointers.values()].slice(0, 2);
            const distance = Math.max(1, Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y));
            const total = daysBetween(pinchStart.domain.start, pinchStart.domain.end);
            const nextDays = clamp(Math.round(pinchStart.days / Math.max(.2, distance / pinchStart.distance)), Math.min(MIN_VISIBLE_DAYS, total), total);
            const next = windowAroundAnchor(pinchStart.domain, pinchStart.anchorMs, pinchStart.fraction, nextDays);
            previewWindow(instance, next.start, next.end);
            event.preventDefault();
            return;
        }
        if (dragStart && pointers.size === 1) {
            const rect = instance.stage.getBoundingClientRect();
            const visible = daysBetween(dragStart.start, dragStart.end);
            const deltaPx = event.clientX - dragStart.x;
            if (Math.abs(deltaPx) > 7) {
                cancelLong();
                dragStart.moved = true;
                instance.stage.classList.add("is-dragging");
                const dayDelta = Math.round((-deltaPx / Math.max(1, rect.width)) * visible);
                if (dayDelta !== 0) {
                    const next = shiftedWindow(dragStart.domain, dragStart.start, dragStart.end, dayDelta);
                    previewWindow(instance, next.start, next.end);
                    event.preventDefault();
                }
            }
        }
    };
    const release = event => {
        if (!pointers.has(event.pointerId)) return;
        event.stopPropagation();
        cancelLong();
        const hadPinch = Boolean(pinchStart);
        const moved = Boolean(dragStart?.moved) || Boolean(tapStart && (Math.abs(event.clientX - tapStart.x) > 8 || Math.abs(event.clientY - tapStart.y) > 8));
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinchStart = null;
        if (!pointers.size) {
            instance.stage.classList.remove("is-dragging");
            if (instance.hasPreview) {
                const preview = instance.previewWindow;
                const domain = domainFor(instance);
                commitWindow(instance, preview?.start || domain.start, preview?.end || domain.end);
            } else if (event.type !== "pointercancel" && !hadPinch && !moved && !longPressed) {
                const now = Date.now();
                if (now - lastTap < 300 && effectiveWindow(instance).window) {
                    const domain = domainFor(instance);
                    commitWindow(instance, domain.start, domain.end);
                } else {
                    showNearestPoint(instance, event.clientX);
                }
                lastTap = now;
            }
            dragStart = null;
            tapStart = null;
            longPressed = false;
        }
    };
    instance.stage.addEventListener("pointerdown", down, { capture: true, passive: false });
    instance.stage.addEventListener("pointermove", move, { capture: true, passive: false });
    instance.stage.addEventListener("pointerup", release, { capture: true, passive: false });
    instance.stage.addEventListener("pointercancel", release, { capture: true, passive: false });
}

function cleanupInstance(instance) {
    closeExpandedWeightChart(instance);
    liveInstances.delete(instance);
    try {
        instance.stage.remove();
        instance.controls.remove();
        instance.datePanel.remove();
        instance.scrubber.remove();
        instance.hint.remove();
    } catch {}
}

function createInstance(legacy) {
    if (!legacy || instances.has(legacy)) return;
    ensureStyles();
    const parent = legacy.parentElement;
    if (!parent) return;
    const kind = chartKind(legacy);
    const expenditureShell = kind === "expenditure" && parent.classList.contains("expenditure-chart-shell") ? parent : null;
    const footerHost = expenditureShell?.parentElement || parent;

    parent.querySelectorAll(`.analytics-viewport-stage[data-kind="${kind}"]`).forEach(node => node.remove());
    footerHost.querySelectorAll(`:scope > .analytics-viewport-controls[data-kind="${kind}"],:scope > .analytics-viewport-date-panel[data-kind="${kind}"],:scope > .analytics-viewport-scrubber[data-kind="${kind}"],:scope > .analytics-viewport-hint[data-kind="${kind}"]`).forEach(node => node.remove());

    legacy.classList.add("analytics-viewport-legacy");
    legacy.setAttribute("aria-hidden", "true");

    const stage = document.createElement("div");
    stage.className = "analytics-viewport-stage";
    stage.dataset.kind = kind;
    if (kind === "weight") stage.style.touchAction = "none";
    const canvas = legacy.cloneNode(false);
    canvas.removeAttribute("id");
    canvas.removeAttribute("data-expenditure-chart");
    canvas.removeAttribute("aria-hidden");
    canvas.classList.remove("analytics-viewport-legacy");
    canvas.dataset.analyticsViewportChart = kind;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${kind === "weight" ? "Weight" : "Expenditure"} chart with interactive date viewport`);
    stage.appendChild(canvas);
    legacy.insertAdjacentElement("afterend", stage);
    parent.classList.add("analytics-viewport-host");
    footerHost.classList.add("analytics-viewport-footer-host");

    const tooltip = document.createElement("div");
    tooltip.className = "analytics-viewport-tooltip";
    tooltip.hidden = true;
    tooltip.innerHTML = "<strong></strong><span></span><small></small>";
    stage.appendChild(tooltip);

    const controls = document.createElement("div");
    controls.className = "analytics-viewport-controls";
    controls.dataset.kind = kind;
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Chart viewport controls");
    controls.innerHTML = '<button type="button" data-viewport-out aria-label="Zoom out">−</button><span class="analytics-viewport-status"><strong>Full selected range</strong><small>Pinch, use +, or choose exact dates</small></span><button type="button" data-viewport-in aria-label="Zoom in">+</button><button type="button" class="analytics-viewport-dates" data-viewport-dates aria-expanded="false">Dates</button><button type="button" class="analytics-viewport-reset" data-viewport-reset>Reset</button>';

    if (kind === "weight") {
        controls.querySelector("[data-viewport-reset]").textContent = "Today";
        controls.querySelector("[data-viewport-reset]").setAttribute("aria-label", "Return to latest weigh-ins");
    }
    const footerAnchor = expenditureShell || stage;
    footerAnchor.insertAdjacentElement("afterend", controls);

    const datePanel = document.createElement("div");
    datePanel.className = "analytics-viewport-date-panel";
    datePanel.dataset.kind = kind;
    datePanel.hidden = true;
    datePanel.innerHTML = '<label>From<input type="date" data-viewport-start></label><label>To<input type="date" data-viewport-end></label><button type="button" data-viewport-apply>Inspect</button>';
    controls.insertAdjacentElement("afterend", datePanel);

    const scrubber = document.createElement("div");
    scrubber.className = "analytics-viewport-scrubber";
    scrubber.dataset.kind = kind;
    scrubber.innerHTML = '<span data-scrub-start></span><div class="analytics-viewport-scrub-track"><i class="analytics-viewport-scrub-window"></i><input type="range" step="1" value="0" aria-label="Move visible date window through selected range"></div><span data-scrub-end></span>';
    datePanel.insertAdjacentElement("afterend", scrubber);

    const hint = document.createElement("p");
    hint.className = "analytics-viewport-hint";
    hint.dataset.kind = kind;
    hint.textContent = kind === "weight" ? "Pinch to zoom · Drag through history · Tap a weigh-in for details" : "The graph, average, change, and date span all use the same visible window. Pinch to zoom, drag to pan, or hold for daily details.";
    scrubber.insertAdjacentElement("afterend", hint);

    const instance = {
        legacy,
        canvas,
        kind,
        stage,
        tooltip,
        tooltipDate: tooltip.querySelector("strong"),
        tooltipValue: tooltip.querySelector("span"),
        tooltipExtra: tooltip.querySelector("small"),
        controls,
        datePanel,
        scrubber,
        hint,
        scrub: scrubber.querySelector("input"),
        scrubTrack: scrubber.querySelector(".analytics-viewport-scrub-track"),
        scrubStart: scrubber.querySelector("[data-scrub-start]"),
        scrubEnd: scrubber.querySelector("[data-scrub-end]"),
        minus: controls.querySelector("[data-viewport-out]"),
        plus: controls.querySelector("[data-viewport-in]"),
        dates: controls.querySelector("[data-viewport-dates]"),
        reset: controls.querySelector("[data-viewport-reset]"),
        startInput: datePanel.querySelector("[data-viewport-start]"),
        endInput: datePanel.querySelector("[data-viewport-end]"),
        apply: datePanel.querySelector("[data-viewport-apply]"),
        statusStrong: controls.querySelector(".analytics-viewport-status strong"),
        statusSmall: controls.querySelector(".analytics-viewport-status small"),
        points: [],
        previewWindow: null,
        hasPreview: false,
        yScale: null,
        rendering: false
    };

    instances.set(legacy, instance);
    liveInstances.add(instance);
    legacy.dataset.analyticsViewportReady = READY_VERSION;
    instance.minus.addEventListener("click", () => zoomBy(instance, 1 / 1.6));
    instance.plus.addEventListener("click", () => zoomBy(instance, 1.6));
    instance.reset.addEventListener("click", () => {
        const domain = domainFor(instance);
        const state = effectiveWindow(instance);
        const start = instance.kind === "weight" ? shiftDate(domain.end, -(daysBetween(state.start, state.end) - 1)) : domain.start;
        commitWindow(instance, start, domain.end);
    });
    instance.dates.addEventListener("click", () => {
        datePanel.hidden = !datePanel.hidden;
        instance.dates.setAttribute("aria-expanded", String(!datePanel.hidden));
        updateStatus(instance);
        if (instance.expandedDialog) renderInstance(instance);
    });
    instance.apply.addEventListener("click", () => commitWindow(instance, instance.startInput.value, instance.endInput.value));
    instance.scrub.addEventListener("input", () => {
        const state = effectiveWindow(instance);
        const visible = daysBetween(state.start, state.end);
        const start = shiftDate(state.domain.start, Number(instance.scrub.value) || 0);
        previewWindow(instance, start, shiftDate(start, visible - 1));
    });
    instance.scrub.addEventListener("change", () => {
        if (!instance.hasPreview) return;
        const preview = instance.previewWindow;
        const domain = domainFor(instance);
        commitWindow(instance, preview?.start || domain.start, preview?.end || domain.end);
    });
    bindGestures(instance);
    renderInstance(instance);
}

function refreshInstances() {
    for (const instance of [...liveInstances]) {
        if (!instance.legacy.isConnected || !instance.canvas.isConnected) cleanupInstance(instance);
    }
    document.querySelectorAll("#weight-trend-chart, [data-expenditure-chart]").forEach(createInstance);
    liveInstances.forEach(instance => {
        if (!instance.hasPreview) renderInstance(instance);
    });
}
function scheduleAttach() {
    if (attachQueued) return;
    attachQueued = true;
    requestAnimationFrame(() => {
        attachQueued = false;
        refreshInstances();
    });
}
function resetForRangeButton(target) {
    const button = target?.closest?.("[data-weight-chart-range], [data-tdee-chart-range]");
    if (!button) return;
    const kind = button.hasAttribute("data-weight-chart-range") ? "weight" : "expenditure";
    setTimeout(() => {
        saveWindow(kind, null);
        for (const instance of liveInstances) {
            if (instance.kind !== kind) continue;
            instance.previewWindow = null;
            instance.hasPreview = false;
            instance.yScale = null;
            renderInstance(instance);
        }
    }, 0);
}

document.addEventListener("click", event => resetForRangeButton(event.target));
window.addEventListener("resize", scheduleAttach, { passive: true });
["levelup:units-changed", "levelup:theme-changed", "levelup:appearance-changed", "levelup:nutrition-updated", "levelup:weight-updated", "levelup:food-log-updated", "levelup:nutrition-phase-updated"]
    .forEach(name => window.addEventListener(name, scheduleAttach));
const mutationRoot = document.getElementById("content") || document.body;
if (mutationRoot) new MutationObserver(() => scheduleAttach()).observe(mutationRoot, { childList: true, subtree: true, characterData: true });
scheduleAttach();


