import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "./calculated-maintenance.js?v=tdee-live-daily-1";
import { calculateTdee } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "./nutrition-storage.js?v=nutrition-phase-1";

const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const STYLE_ID = "level-up-live-daily-expenditure-styles";
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
        #calorie-progress .expenditure-chart-legend .is-updating,
        #calorie-progress .expenditure-chart-legend .is-holding {
            width: 9px !important;
            height: 9px !important;
            border: 2px solid var(--accent) !important;
            background: var(--card) !important;
            box-sizing: border-box;
        }
        #calorie-progress .expenditure-chart-legend .is-updating { border-radius: 50% !important; }
        #calorie-progress .expenditure-chart-legend .is-holding { border-radius: 2px !important; opacity: .56; }
        #calorie-progress .expenditure-chart-legend .is-profile {
            width: 16px !important;
            height: 0 !important;
            border: 0 !important;
            border-top: 2px dashed var(--muted) !important;
            border-radius: 0 !important;
            background: transparent !important;
        }
        #calorie-progress .expenditure-state-legend-label {
            color: var(--text-secondary, var(--muted));
            font-weight: 850;
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

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
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
    const currentLive = positive(current?.liveMaintenanceCalories);
    if (currentLive !== null && raw.at(-1)?.date === today) raw[raw.length - 1].liveMaintenanceCalories = currentLive;

    let lastUsable = null;
    const enriched = raw.map(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        if (live !== null) {
            lastUsable = live;
            return { ...point, expenditureCalories: live, mode: "updating" };
        }
        const held = lastUsable ?? reviewed;
        if (held !== null) {
            lastUsable = held;
            return { ...point, expenditureCalories: held, mode: "holding" };
        }
        return { ...point, expenditureCalories: null, mode: "learning" };
    });

    const visibleStart = startDate
        || enriched.find(point => positive(point.expenditureCalories) !== null)?.date
        || endDate;
    const points = enriched.filter(point => point.date >= visibleStart && point.date <= endDate && positive(point.expenditureCalories) !== null);
    const currentMode = currentLive !== null ? "updating" : positive(current?.maintenanceCalories) !== null ? "holding" : "learning";
    return { range, startDate: visibleStart, endDate, points, profileEstimate, current, currentLive, currentMode };
}

function themeColor(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
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

function patchCurrentCard(state) {
    const card = document.querySelector("#calorie-progress .calculated-maintenance-card");
    if (!card) return;

    const displayValue = state.currentLive ?? positive(state.current?.maintenanceCalories);
    const valueBlock = card.querySelector(".expenditure-summary-value:not(.is-strategy)");
    setText(valueBlock?.querySelector("strong"), displayValue !== null ? formatNumber(displayValue) : "—");

    const copyBlocks = card.querySelectorAll(".expenditure-summary-copy");
    setText(copyBlocks[0]?.querySelector("strong"), "Current Expenditure");
    if (state.currentMode === "updating") {
        setText(copyBlocks[0]?.querySelector("p"), "Your current daily expenditure estimate from logged intake and smoothed Trend Weight.");
    } else if (state.currentMode === "holding") {
        setText(copyBlocks[0]?.querySelector("p"), "Your last usable expenditure estimate is being held until enough recent evidence is available to calculate a fresh value.");
    } else {
        setText(copyBlocks[0]?.querySelector("p"), "Keep logging nutrition and body weight to establish your expenditure estimate.");
    }

    const strategy = card.querySelector(".expenditure-summary-value.is-strategy strong");
    const modeLabel = state.currentMode === "updating" ? "Updating" : state.currentMode === "holding" ? "Holding" : "Learning";
    setText(strategy, modeLabel);
    setText(copyBlocks[1]?.querySelector("strong"), "Expenditure State");
    const modeDescription = state.currentMode === "updating"
        ? "This value can move day to day as new nutrition and Trend Weight evidence is incorporated. Calorie-target changes still wait for the weekly review."
        : state.currentMode === "holding"
            ? "Expenditure is temporarily carried forward. Your calorie target still follows the normal weekly review schedule."
            : "Level Up is still building enough evidence to calculate expenditure.";
    setText(copyBlocks[1]?.querySelector("p"), modeDescription);

    const breakdown = card.querySelector(".calculated-maintenance-breakdown");
    breakdown?.querySelectorAll(":scope > div").forEach(row => {
        const label = row.querySelector("span")?.textContent?.trim() || "";
        if (label === "Weekly stability limit") row.remove();
    });
}

function decorateGraphCard(card, state) {
    setText(card.querySelector(".expenditure-trend-heading h3"), "Expenditure Over Time");
    const available = state.points;
    const average = available.length ? available.reduce((sum, point) => sum + point.expenditureCalories, 0) / available.length : null;
    const change = available.length > 1 ? available.at(-1).expenditureCalories - available[0].expenditureCalories : null;
    const metrics = card.querySelectorAll(".expenditure-trend-metrics > span");
    if (metrics[0]) setText(metrics[0].querySelector("strong"), Number.isFinite(average) ? `${formatNumber(average)} cal` : "— cal");
    if (metrics[1]) {
        setText(metrics[1].querySelector("strong"), Number.isFinite(change) ? `${signedCalories(change)} cal` : "— cal");
        setText(metrics[1].querySelector("b"), !Number.isFinite(change) ? "Waiting" : change > 0 ? "Increase" : change < 0 ? "Decrease" : "No change");
    }

    const legend = card.querySelector(".expenditure-chart-legend");
    if (legend) {
        const generic = Number.isFinite(state.profileEstimate) ? '<span><i class="is-profile"></i>Generic expenditure</span>' : "";
        const next = `<span class="expenditure-state-legend-label">Expenditure:</span><span><i class="is-updating"></i>Updating</span><span><i class="is-holding"></i>Holding</span>${generic}`;
        if (legend.innerHTML !== next) legend.innerHTML = next;
    }
    setText(card.querySelector(".expenditure-chart-hint"), "Tap or drag for the daily expenditure calculation and state. Double-tap to close.");
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

    const canvas = oldCanvas.dataset.liveDailyExpenditure === "1" ? oldCanvas : oldCanvas.cloneNode(false);
    if (canvas !== oldCanvas) {
        canvas.dataset.liveDailyExpenditure = "1";
        oldCanvas.replaceWith(canvas);
    }
    canvas.dataset.liveDailyExpenditure = "1";

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
        const values = state.points.map(point => point.expenditureCalories);
        const { yMin, yMax } = expenditureAxis(values);
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

        if (Number.isFinite(state.profileEstimate) && state.profileEstimate >= yMin && state.profileEstimate <= yMax) {
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
            context.globalAlpha = point.mode === "holding" ? .46 : .96;
            context.setLineDash(point.mode === "holding" ? [5, 5] : []);
            context.beginPath();
            context.moveTo(x(previous), y(previous.expenditureCalories));
            context.lineTo(x(point), y(point.expenditureCalories));
            context.stroke();
            context.restore();
        }

        const stride = markerStride(state.points.length);
        state.points.forEach((point, index) => {
            const transition = index > 0 && point.mode !== state.points[index - 1].mode;
            if (index % stride !== 0 && !transition && index !== state.points.length - 1 && index !== selectedIndex) return;
            const pointX = x(point);
            const pointY = y(point.expenditureCalories);
            const selected = index === selectedIndex;
            context.save();
            context.strokeStyle = accent;
            context.fillStyle = cardColor;
            context.globalAlpha = point.mode === "holding" ? .56 : 1;
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
            const pointX = padding.left + index / Math.max(1, labelCount - 1) * plotWidth;
            context.fillText(formatDate(localDateKey(labelDate)), pointX, height - 7);
        }

        if (Number.isInteger(selectedIndex) && state.points[selectedIndex]) {
            const pointX = x(state.points[selectedIndex]);
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
        const updating = point.mode === "updating";
        tooltip.hidden = false;
        tooltip.innerHTML = `<strong>${formatDate(point.date)}</strong><span>${formatNumber(point.expenditureCalories)} cal/day</span><small class="expenditure-tooltip-state">${updating ? "Updating" : "Holding"}</small><small>${updating ? "Daily TDEE calculated from the evidence available on this date" : "Last usable expenditure carried forward"}</small>${Number.isFinite(state.profileEstimate) ? `<small>${signedCalories(point.expenditureCalories - state.profileEstimate)} vs generic expenditure</small>` : ""}`;
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

    card.__levelUpLiveDailyExpenditureDraw = draw;
    draw();
}

function refresh() {
    queued = false;
    ensureStyles();
    const state = buildState();
    patchCurrentCard(state);
    const graphCard = document.querySelector("#calorie-progress .expenditure-trend-card");
    if (!graphCard) return;
    decorateGraphCard(graphCard, state);
    installGraph(graphCard, state);
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
["pageshow", "levelup:nutrition-updated", "levelup:food-log-updated", "levelup:weight-updated", "levelup:appearance-changed"]
    .forEach(name => window.addEventListener(name, schedule));
if (!resizeBound) {
    resizeBound = true;
    window.addEventListener("resize", () => document.querySelector("#calorie-progress .expenditure-trend-card")?.__levelUpLiveDailyExpenditureDraw?.());
}
document.addEventListener("click", event => {
    if (event.target.closest?.("[data-tdee-chart-range], #nutrition-progress-tab, [data-page='progress']")) window.setTimeout(schedule, 0);
}, true);

schedule();
