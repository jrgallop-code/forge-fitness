import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "./calculated-maintenance.js?v=tdee-state-graph-1";
import { calculateTdee } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "./nutrition-storage.js?v=nutrition-phase-1";

const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const STYLE_ID = "level-up-tdee-state-graph-styles";
const RANGE_OPTIONS = {
    "1w": { days: 7, label: "1W" },
    "1m": { days: 30, label: "1M" },
    "3m": { days: 90, label: "3M" },
    "6m": { days: 180, label: "6M" },
    phase: { label: "PHASE" },
    all: { label: "ALL" }
};
let queued = false;
let resizeBound = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .expenditure-state-legend-label {
            color: var(--text-secondary, var(--muted));
            font-weight: 850;
        }
        #calorie-progress .expenditure-chart-legend .is-updating,
        #calorie-progress .expenditure-chart-legend .is-holding {
            width: 9px !important;
            height: 9px !important;
            border: 2px solid var(--accent) !important;
            background: var(--card) !important;
            box-sizing: border-box;
        }
        #calorie-progress .expenditure-chart-legend .is-updating {
            border-radius: 50% !important;
        }
        #calorie-progress .expenditure-chart-legend .is-holding {
            border-radius: 2px !important;
            opacity: .58;
        }
        #calorie-progress .expenditure-chart-legend .is-profile {
            width: 16px !important;
            height: 0 !important;
            border: 0 !important;
            border-top: 2px dashed var(--muted) !important;
            border-radius: 0 !important;
            background: transparent !important;
        }
        #calorie-progress .expenditure-chart-tooltip .expenditure-tooltip-state {
            display: block;
            margin-top: 2px;
            color: var(--text-secondary, var(--muted));
            font-size: 8px;
            font-weight: 850;
            letter-spacing: .04em;
            text-transform: uppercase;
        }
    `;
    document.head.appendChild(style);
}

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDateKey(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function activePhase() {
    const phases = readJson("level_up_nutrition_phases", []);
    return Array.isArray(phases) ? [...phases].reverse().find(phase => !phase?.endDate) || null : null;
}

function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try { return Math.round(Number(calculateTdee(profile).tdee)) || null; }
    catch { return null; }
}

function selectedRange(phase) {
    const requested = String(localStorage.getItem(TDEE_RANGE_KEY) || "3m").toLowerCase();
    return RANGE_OPTIONS[requested] && (requested !== "phase" || phase?.startDate) ? requested : "3m";
}

function rangeStart(range, phase, endDate) {
    if (range === "all") return null;
    if (range === "phase") return String(phase?.startDate || endDate);
    return shiftDateKey(endDate, -(RANGE_OPTIONS[range].days - 1));
}

function buildState() {
    const phase = activePhase();
    const range = selectedRange(phase);
    const endDate = localDateKey();
    const startDate = rangeStart(range, phase, endDate);
    const historyStart = startDate ? shiftDateKey(startDate, -28) : null;
    const profileEstimate = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(profileEstimate);
    const raw = getCalculatedMaintenanceHistory(profileEstimate, { startDate: historyStart });
    const today = localDateKey();
    const currentValue = Number(current?.maintenanceCalories);
    if (Number.isFinite(currentValue) && raw.at(-1)?.date === today) raw[raw.length - 1].maintenanceCalories = currentValue;

    let previousOfficial = null;
    const enriched = raw.map(point => {
        const official = Number(point.maintenanceCalories);
        let mode = "learning";
        if (Number.isFinite(official) && official > 0) {
            const changed = previousOfficial !== null && Math.round(official) !== Math.round(previousOfficial);
            mode = point.recorded || previousOfficial === null || changed ? "updating" : "holding";
            previousOfficial = official;
        }
        return { ...point, mode };
    });
    const visibleStart = startDate || enriched.find(point => Number(point.maintenanceCalories) > 0)?.date || endDate;
    const points = enriched.filter(point => point.date >= visibleStart && point.date <= endDate && Number(point.maintenanceCalories) > 0);
    return { range, startDate: visibleStart, endDate, points, profileEstimate };
}

function themeColor(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function formatNumber(value) {
    return Math.round(Number(value)).toLocaleString();
}

function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function signedCalories(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return `${number > 0 ? "+" : number < 0 ? "−" : ""}${formatNumber(Math.abs(number))}`;
}

function niceStep(value) {
    return [25, 50, 100, 200, 250, 500, 1000].find(step => step >= value) || 2000;
}

function decorateCard(card, state) {
    const heading = card.querySelector(".expenditure-trend-heading h3");
    if (heading && heading.textContent !== "Expenditure Over Time") heading.textContent = "Expenditure Over Time";
    const legend = card.querySelector(".expenditure-chart-legend");
    if (legend) {
        const generic = Number.isFinite(state.profileEstimate) ? '<span><i class="is-profile"></i>Generic expenditure</span>' : "";
        const next = `<span class="expenditure-state-legend-label">Expenditure:</span><span><i class="is-updating"></i>Updating</span><span><i class="is-holding"></i>Holding</span>${generic}`;
        if (legend.innerHTML !== next) legend.innerHTML = next;
    }
    const hint = card.querySelector(".expenditure-chart-hint");
    if (hint) hint.textContent = "Tap or drag for daily expenditure and update state. Double-tap to close.";
}

function markerStride(count) {
    if (count > 180) return 14;
    if (count > 90) return 7;
    if (count > 45) return 3;
    return 1;
}

function installGraph(card, state) {
    const oldCanvas = card.querySelector("[data-expenditure-chart]");
    const tooltip = card.querySelector("[data-expenditure-tooltip]");
    const shell = oldCanvas?.closest(".expenditure-chart-shell");
    if (!oldCanvas || !tooltip || !shell || !state.points.length) return;

    const canvas = oldCanvas.dataset.expenditureStateGraph === "1" ? oldCanvas : oldCanvas.cloneNode(false);
    if (canvas !== oldCanvas) {
        canvas.dataset.expenditureStateGraph = "1";
        oldCanvas.replaceWith(canvas);
    }
    canvas.dataset.expenditureStateGraph = "1";
    card.dataset.expenditureStateGraphReady = "1";

    const context = canvas.getContext("2d");
    if (!context) return;
    let selectedIndex = null;
    let dragging = false;
    const padding = { top: 18, right: 46, bottom: 30, left: 8 };
    const startMs = new Date(`${state.startDate}T12:00:00`).getTime();
    const endMs = new Date(`${state.endDate}T12:00:00`).getTime();

    const draw = () => {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(280, Math.round(shell.clientWidth || 320));
        const height = 250;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const values = state.points.map(point => Number(point.maintenanceCalories));
        if (Number.isFinite(state.profileEstimate)) values.push(Number(state.profileEstimate));
        const minimum = Math.min(...values);
        const maximum = Math.max(...values);
        const step = niceStep(Math.max(100, maximum - minimum) / 4);
        let yMin = Math.floor((minimum - step) / step) * step;
        let yMax = Math.ceil((maximum + step) / step) * step;
        if (yMax <= yMin) yMax = yMin + step * 4;
        const x = point => padding.left + ((new Date(`${point.date}T12:00:00`).getTime() - startMs) / Math.max(1, endMs - startMs)) * plotWidth;
        const y = value => padding.top + (1 - (Number(value) - yMin) / (yMax - yMin)) * plotHeight;
        const accent = themeColor("--accent", "#ff3b4b");
        const muted = themeColor("--muted", "#85858f");
        const cardColor = themeColor("--card", "#1b1b1f");

        context.font = "800 9px Arial";
        context.textAlign = "left";
        context.textBaseline = "middle";
        for (let index = 0; index <= 4; index += 1) {
            const value = yMax - (yMax - yMin) * index / 4;
            const lineY = padding.top + plotHeight * index / 4;
            context.strokeStyle = themeColor("--line", "rgba(255,255,255,.09)");
            context.lineWidth = 1;
            context.setLineDash([3, 3]);
            context.beginPath();
            context.moveTo(padding.left, lineY);
            context.lineTo(width - padding.right + 4, lineY);
            context.stroke();
            context.setLineDash([]);
            context.fillStyle = muted;
            context.fillText(formatNumber(value), width - padding.right + 9, lineY);
        }

        if (Number.isFinite(state.profileEstimate)) {
            context.save();
            context.setLineDash([5, 5]);
            context.strokeStyle = muted;
            context.globalAlpha = .72;
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(padding.left, y(state.profileEstimate));
            context.lineTo(width - padding.right + 4, y(state.profileEstimate));
            context.stroke();
            context.restore();
        }

        for (let index = 1; index < state.points.length; index += 1) {
            const previous = state.points[index - 1];
            const point = state.points[index];
            context.save();
            context.strokeStyle = accent;
            context.lineWidth = point.mode === "holding" ? 2 : 2.75;
            context.globalAlpha = point.mode === "holding" ? .48 : .96;
            context.setLineDash(point.mode === "holding" ? [5, 5] : []);
            context.beginPath();
            context.moveTo(x(previous), y(previous.maintenanceCalories));
            context.lineTo(x(point), y(point.maintenanceCalories));
            context.stroke();
            context.restore();
        }

        const stride = markerStride(state.points.length);
        state.points.forEach((point, index) => {
            const transition = index > 0 && point.mode !== state.points[index - 1].mode;
            if (index % stride !== 0 && !transition && index !== state.points.length - 1 && index !== selectedIndex) return;
            const pointX = x(point);
            const pointY = y(point.maintenanceCalories);
            const selected = index === selectedIndex;
            context.save();
            context.strokeStyle = accent;
            context.fillStyle = cardColor;
            context.globalAlpha = point.mode === "holding" ? .58 : 1;
            context.lineWidth = selected ? 3 : 2;
            if (point.mode === "holding") {
                const size = selected ? 9 : 6;
                context.beginPath();
                context.rect(pointX - size / 2, pointY - size / 2, size, size);
                context.fill();
                context.stroke();
            } else {
                context.beginPath();
                context.arc(pointX, pointY, selected ? 5 : 3.2, 0, Math.PI * 2);
                context.fill();
                context.stroke();
            }
            context.restore();
        });

        const labelCount = state.range === "1w" ? 7 : 5;
        context.fillStyle = muted;
        context.font = "800 8px Arial";
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        for (let index = 0; index < labelCount; index += 1) {
            const labelDate = new Date(startMs + (endMs - startMs) * index / Math.max(1, labelCount - 1));
            const date = localDateKey(labelDate);
            const pointX = padding.left + index / Math.max(1, labelCount - 1) * plotWidth;
            context.fillText(formatDate(date), pointX, height - 7);
        }

        if (Number.isInteger(selectedIndex) && state.points[selectedIndex]) {
            const point = state.points[selectedIndex];
            const pointX = x(point);
            context.save();
            context.strokeStyle = themeColor("--text-secondary", "rgba(255,255,255,.45)");
            context.globalAlpha = .58;
            context.lineWidth = 1;
            context.setLineDash([3, 3]);
            context.beginPath();
            context.moveTo(pointX, padding.top);
            context.lineTo(pointX, padding.top + plotHeight);
            context.stroke();
            context.restore();
        }
    };

    const select = event => {
        const bounds = canvas.getBoundingClientRect();
        const relative = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const plotWidth = Math.max(1, bounds.width - padding.left - padding.right);
        const proportion = Math.max(0, Math.min(1, (relative - padding.left) / plotWidth));
        const selectedTime = startMs + (endMs - startMs) * proportion;
        selectedIndex = state.points.reduce((nearest, point, index) => {
            const pointTime = new Date(`${point.date}T12:00:00`).getTime();
            const nearestTime = new Date(`${state.points[nearest].date}T12:00:00`).getTime();
            return Math.abs(pointTime - selectedTime) < Math.abs(nearestTime - selectedTime) ? index : nearest;
        }, 0);
        const point = state.points[selectedIndex];
        const modeLabel = point.mode === "updating" ? "Updating" : "Holding";
        const modeCopy = point.mode === "updating" ? "Expenditure updated from available evidence" : "Reviewed expenditure carried forward";
        tooltip.hidden = false;
        tooltip.innerHTML = `<strong>${formatDate(point.date)}</strong><span>${formatNumber(point.maintenanceCalories)} cal/day</span><small class="expenditure-tooltip-state">${modeLabel}</small><small>${modeCopy}</small>${Number.isFinite(state.profileEstimate) ? `<small>${signedCalories(point.maintenanceCalories - state.profileEstimate)} vs generic expenditure</small>` : ""}`;
        const desiredLeft = relative < bounds.width / 2 ? relative + 10 : relative - 140;
        tooltip.style.left = `${Math.max(8, Math.min(bounds.width - 132, desiredLeft))}px`;
        draw();
    };

    canvas.onpointerdown = event => {
        dragging = true;
        try { canvas.setPointerCapture(event.pointerId); } catch {}
        select(event);
    };
    canvas.onpointermove = event => { if (dragging) select(event); };
    canvas.onpointerup = event => {
        dragging = false;
        try { canvas.releasePointerCapture(event.pointerId); } catch {}
    };
    canvas.onpointercancel = () => { dragging = false; };
    canvas.ondblclick = () => {
        selectedIndex = null;
        tooltip.hidden = true;
        draw();
    };

    card.__levelUpExpenditureStateDraw = draw;
    draw();
}

function refresh() {
    queued = false;
    ensureStyles();
    const card = document.querySelector("#calorie-progress .expenditure-trend-card");
    if (!card) return;
    const state = buildState();
    decorateCard(card, state);
    installGraph(card, state);
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:food-log-updated", schedule);
window.addEventListener("levelup:weight-updated", schedule);
window.addEventListener("levelup:appearance-changed", schedule);
if (!resizeBound) {
    resizeBound = true;
    window.addEventListener("resize", () => {
        document.querySelector("#calorie-progress .expenditure-trend-card")?.__levelUpExpenditureStateDraw?.();
    });
}
document.addEventListener("click", event => {
    if (event.target.closest?.("[data-tdee-chart-range], #nutrition-progress-tab, [data-page='progress']")) window.setTimeout(schedule, 0);
}, true);

schedule();
