import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "./calculated-maintenance.js?v=tdee-live-daily-1";
import { calculateTdee } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "./nutrition-storage.js?v=nutrition-phase-1";

const HISTORY_KEY = "level_up_accepted_expenditure_history_v1";
const HOLD_KEY = "level_up_phase_reassessment_hold";
const CHECK_IN_KEY = "level_up_maintenance_check_in_v1";
const PHASES_KEY = "level_up_nutrition_phases";
const RANGE_KEY = "level_up_tdee_chart_range_v1";
const STYLE_ID = "level-up-accepted-expenditure-point-styles";
const RANGE_OPTIONS = {
    "1w": { days: 7 },
    "1m": { days: 30 },
    "3m": { days: 90 },
    "6m": { days: 180 },
    phase: {},
    all: {}
};
let queued = false;
let lastSignature = "";

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeyFrom(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return String(value);
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? localDateKey(date) : null;
}

function shiftDateKey(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function activePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases) ? [...phases].reverse().find(phase => phase && !phase.endDate) || null : null;
}

function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try { return Math.round(Number(calculateTdee(profile).tdee)) || null; }
    catch { return null; }
}

function normalizeHistory(entries = []) {
    const byKey = new Map();
    (Array.isArray(entries) ? entries : []).forEach(entry => {
        const date = dateKeyFrom(entry?.date || entry?.acceptedAt || entry?.reviewedAt);
        const expenditureCalories = positive(entry?.expenditureCalories ?? entry?.maintenanceCalories ?? entry?.estimate);
        if (!date || expenditureCalories === null) return;
        const phaseId = String(entry?.phaseId || "");
        byKey.set(`${date}|${phaseId}|${expenditureCalories}`, {
            date,
            expenditureCalories,
            phaseId: phaseId || null,
            targetCalories: positive(entry?.targetCalories),
            source: entry?.source || "accepted-weekly-review"
        });
    });
    return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function writeHistory(entries) {
    const normalized = normalizeHistory(entries).slice(-104);
    const serialized = JSON.stringify(normalized);
    if (localStorage.getItem(HISTORY_KEY) !== serialized) localStorage.setItem(HISTORY_KEY, serialized);
    return normalized;
}

function currentAcceptedReviewFallbacks(phase) {
    const entries = [];
    const hold = readJson(HOLD_KEY, null);
    if (hold?.source === "accepted-weekly-calorie-review" && (!phase?.id || hold.phaseId === phase.id)) {
        const date = dateKeyFrom(hold.appliedAt);
        const expenditureCalories = positive(hold.maintenanceCalories);
        if (date && expenditureCalories !== null) {
            entries.push({
                date,
                expenditureCalories,
                phaseId: hold.phaseId || phase?.id || null,
                targetCalories: positive(hold.calories),
                source: "accepted-weekly-review"
            });
        }
    }

    const checkIn = readJson(CHECK_IN_KEY, null);
    if (checkIn?.action === "coordinated-weekly-review") {
        const date = dateKeyFrom(checkIn.reviewedAt);
        const expenditureCalories = positive(checkIn.estimate);
        if (date && expenditureCalories !== null) {
            entries.push({
                date,
                expenditureCalories,
                phaseId: phase?.id || null,
                targetCalories: positive(phase?.currentCalories ?? phase?.startCalories),
                source: "accepted-weekly-review"
            });
        }
    }
    return entries;
}

function acceptedReviewHistory(phase) {
    const stored = normalizeHistory(readJson(HISTORY_KEY, []));
    const merged = writeHistory([...stored, ...currentAcceptedReviewFallbacks(phase)]);
    return merged.filter(entry => !phase?.id || !entry.phaseId || entry.phaseId === phase.id);
}

function recordCurrentAcceptedReview() {
    const phase = activePhase();
    const expenditureCalories = positive(phase?.maintenanceCalories);
    if (!phase?.id || expenditureCalories === null) return;
    const current = normalizeHistory(readJson(HISTORY_KEY, []));
    writeHistory([...current, {
        date: localDateKey(),
        expenditureCalories,
        phaseId: phase.id,
        targetCalories: positive(phase.currentCalories ?? phase.startCalories),
        source: "accepted-weekly-review"
    }]);
}

function selectedRange(phase) {
    const requested = String(localStorage.getItem(RANGE_KEY) || "3m").toLowerCase();
    return RANGE_OPTIONS[requested] && (requested !== "phase" || phase?.startDate) ? requested : "3m";
}

function rangeStart(range, phase, endDate) {
    if (range === "all") return null;
    if (range === "phase") return String(phase?.startDate || endDate);
    return shiftDateKey(endDate, -(RANGE_OPTIONS[range].days - 1));
}

function liveGraphState() {
    const phase = activePhase();
    const range = selectedRange(phase);
    const endDate = localDateKey();
    const startDate = rangeStart(range, phase, endDate);
    const historyStart = startDate ? shiftDateKey(startDate, -28) : null;
    const profileEstimate = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(profileEstimate);
    const raw = getCalculatedMaintenanceHistory(profileEstimate, { startDate: historyStart });
    const currentLive = positive(current?.liveMaintenanceCalories);
    if (currentLive !== null && raw.at(-1)?.date === endDate) raw[raw.length - 1].liveMaintenanceCalories = currentLive;

    let lastUsable = null;
    const points = raw.map(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        if (live !== null) {
            lastUsable = live;
            return { ...point, expenditureCalories: live };
        }
        const held = lastUsable ?? reviewed;
        if (held !== null) {
            lastUsable = held;
            return { ...point, expenditureCalories: held };
        }
        return { ...point, expenditureCalories: null };
    });
    const visibleStart = startDate || points.find(point => positive(point.expenditureCalories) !== null)?.date || endDate;
    return {
        phase,
        startDate: visibleStart,
        endDate,
        points: points.filter(point => point.date >= visibleStart && point.date <= endDate && positive(point.expenditureCalories) !== null),
        reviews: acceptedReviewHistory(phase).filter(point => point.date >= visibleStart && point.date <= endDate)
    };
}

function niceStep(value) {
    return [25, 50, 75, 100, 125, 150, 200, 250, 500, 1000].find(step => step >= value) || 2000;
}

function expenditureAxis(values = []) {
    const usable = values.map(Number).filter(Number.isFinite);
    if (!usable.length) return { yMin: 0, yMax: 200 };
    const minimum = Math.min(...usable);
    const maximum = Math.max(...usable);
    const spread = Math.max(0, maximum - minimum);
    const desiredSpan = Math.max(150, spread * 1.35);
    const step = niceStep(desiredSpan / 4);
    const span = step * 4;
    const midpoint = (minimum + maximum) / 2;
    let yMin = Math.floor((midpoint - span / 2) / step) * step;
    let yMax = yMin + span;
    if (minimum < yMin) {
        yMin = Math.floor(minimum / step) * step;
        yMax = yMin + span;
    }
    if (maximum > yMax) {
        yMax = Math.ceil(maximum / step) * step;
        yMin = yMax - span;
    }
    return { yMin, yMax };
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .expenditure-chart-shell{position:relative}
        #calorie-progress .accepted-expenditure-overlay{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:visible}
        #calorie-progress .accepted-expenditure-point{position:absolute;width:0;height:0}
        #calorie-progress .accepted-expenditure-point i{position:absolute;left:0;top:0;width:10px;height:10px;transform:translate(-50%,-50%) rotate(45deg);border:2px solid var(--accent);border-radius:2px;background:var(--card);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 14%,transparent)}
        #calorie-progress .accepted-expenditure-point b{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);padding:3px 6px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));border-radius:7px;background:color-mix(in srgb,var(--card) 94%,transparent);color:var(--text);font-size:8px;font-weight:900;line-height:1;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.12)}
        #calorie-progress .accepted-expenditure-point small{position:absolute;left:50%;top:8px;transform:translateX(-50%);color:var(--text-secondary,var(--muted));font-size:7px;font-weight:800;white-space:nowrap}
    `;
    document.head.appendChild(style);
}

function render() {
    queued = false;
    ensureStyles();
    const card = document.querySelector("#calorie-progress .expenditure-trend-card");
    const shell = card?.querySelector(".expenditure-chart-shell");
    const canvas = shell?.querySelector("[data-expenditure-chart]");
    if (!card || !shell || !canvas) return;

    const state = liveGraphState();
    if (!state.points.length || !state.reviews.length) {
        shell.querySelector(".accepted-expenditure-overlay")?.remove();
        lastSignature = "";
        return;
    }

    const canvasWidth = canvas.clientWidth || shell.clientWidth || 320;
    const canvasHeight = canvas.clientHeight || 250;
    const padding = { top: 18, right: 46, bottom: 30, left: 8 };
    const plotWidth = Math.max(1, canvasWidth - padding.left - padding.right);
    const plotHeight = Math.max(1, canvasHeight - padding.top - padding.bottom);
    const startMs = new Date(`${state.startDate}T12:00:00`).getTime();
    const endMs = new Date(`${state.endDate}T12:00:00`).getTime();
    const { yMin, yMax } = expenditureAxis(state.points.map(point => point.expenditureCalories));
    const visibleReviews = state.reviews.filter(review => review.expenditureCalories >= yMin && review.expenditureCalories <= yMax);
    if (!visibleReviews.length) return;

    const signature = JSON.stringify({
        width: canvasWidth,
        height: canvasHeight,
        start: state.startDate,
        end: state.endDate,
        yMin,
        yMax,
        reviews: visibleReviews
    });
    if (signature === lastSignature && shell.querySelector(".accepted-expenditure-overlay")) return;
    lastSignature = signature;

    let overlay = shell.querySelector(".accepted-expenditure-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "accepted-expenditure-overlay";
        overlay.setAttribute("aria-hidden", "true");
        shell.appendChild(overlay);
    }
    overlay.innerHTML = "";

    visibleReviews.forEach((review, index) => {
        const reviewMs = new Date(`${review.date}T12:00:00`).getTime();
        const x = padding.left + ((reviewMs - startMs) / Math.max(1, endMs - startMs)) * plotWidth;
        const y = padding.top + (1 - (review.expenditureCalories - yMin) / (yMax - yMin)) * plotHeight;
        const point = document.createElement("span");
        point.className = "accepted-expenditure-point";
        point.style.left = `${canvas.offsetLeft + x}px`;
        point.style.top = `${canvas.offsetTop + y}px`;
        const latest = index === visibleReviews.length - 1;
        point.innerHTML = `<i></i>${latest ? `<b>${review.expenditureCalories.toLocaleString()} cal</b><small>accepted review</small>` : ""}`;
        overlay.appendChild(point);
    });
}

function schedule(delay = 0) {
    if (delay) {
        window.setTimeout(schedule, delay);
        return;
    }
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        render();
        window.setTimeout(render, 80);
        window.setTimeout(render, 240);
    });
}

window.addEventListener("levelup:calorie-target-applied", event => {
    if (event?.detail?.source === "weekly-calorie-review") recordCurrentAcceptedReview();
    lastSignature = "";
    schedule();
});
[
    "pageshow",
    "levelup:nutrition-updated",
    "levelup:nutrition-phase-updated",
    "levelup:maintenance-check-in-updated",
    "levelup:weight-updated",
    "levelup:food-log-updated",
    "levelup:appearance-changed"
].forEach(name => window.addEventListener(name, () => {
    lastSignature = "";
    schedule();
}));
window.addEventListener("resize", () => {
    lastSignature = "";
    schedule();
});
document.addEventListener("click", event => {
    if (event.target.closest?.("[data-tdee-chart-range], #nutrition-progress-tab, [data-page='progress']")) {
        lastSignature = "";
        schedule(60);
        schedule(320);
    }
}, true);

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => {
        const shell = document.querySelector("#calorie-progress .expenditure-chart-shell");
        if (shell && !shell.querySelector(".accepted-expenditure-overlay")) schedule();
    }).observe(content, { childList: true, subtree: true });
}

schedule(350);
