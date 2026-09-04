import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "./calculated-maintenance.js?v=tdee-live-daily-1";
import { calculateTdee } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "./nutrition-storage.js?v=nutrition-phase-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const STYLE_ID = "level-up-energy-balance-summary-styles";
const RANGE_OPTIONS = {
    "1w": { days: 7 },
    "1m": { days: 30 },
    "3m": { days: 90 },
    "6m": { days: 180 },
    phase: {},
    all: {}
};

let queued = false;

install();

function install() {
    ensureStyles();
    schedule();

    new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    document.addEventListener("click", event => {
        if (!event.target.closest?.("#calorie-progress")) return;
        window.setTimeout(schedule, 60);
        window.setTimeout(schedule, 180);
    }, true);

    window.addEventListener("storage", event => {
        if ([TDEE_RANGE_KEY, FOOD_LOG_KEY, FOOD_COMPLETE_KEY, "level_up_nutrition_phases"].includes(event.key)) schedule();
    });
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .energy-balance-range-summary {
            display: grid;
            justify-items: start;
            gap: 1px;
            margin: 2px 0 11px;
            padding: 4px 1px 0;
            color: var(--text);
        }
        #calorie-progress .energy-balance-range-summary small {
            color: var(--text-secondary, var(--muted));
            font-size: 9px;
            font-weight: 800;
            line-height: 1.2;
        }
        #calorie-progress .energy-balance-range-summary strong {
            margin-top: 1px;
            color: var(--text);
            font-size: 27px;
            font-weight: 800;
            line-height: 1.08;
            letter-spacing: -.02em;
        }
        #calorie-progress .energy-balance-range-summary strong span {
            margin-left: 3px;
            color: var(--text-secondary, var(--muted));
            font-size: 10px;
            font-weight: 750;
            letter-spacing: 0;
        }
        #calorie-progress .energy-balance-range-summary b {
            margin-top: 3px;
            color: var(--text-secondary, var(--muted));
            font-size: 9px;
            font-weight: 750;
            line-height: 1.3;
        }
        #calorie-progress .energy-balance-range-summary em {
            margin-top: 2px;
            color: var(--muted);
            font-size: 8px;
            font-style: normal;
            font-weight: 650;
            line-height: 1.3;
        }
        #calorie-progress .energy-balance-range-summary[data-state="deficit"] small { color: var(--accent); }
        #calorie-progress .energy-balance-range-summary[data-state="surplus"] small { color: var(--accent); }
    `;
    document.head.appendChild(style);
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        renderSummary();
    });
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

function caloriesForDay(entries) {
    if (!Array.isArray(entries) || !entries.length) return null;
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0);
    return total > 0 ? total : null;
}

function buildState() {
    const phase = activePhase();
    const range = selectedRange(phase);
    const endDate = localDateKey();
    const requestedStart = rangeStart(range, phase, endDate);
    const historyStart = requestedStart ? shiftDateKey(requestedStart, -28) : null;
    const profileEstimate = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(profileEstimate);
    const history = getCalculatedMaintenanceHistory(profileEstimate, { startDate: historyStart });
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const completedDays = readJson(FOOD_COMPLETE_KEY, {});
    const today = localDateKey();
    const currentLive = positive(current?.liveMaintenanceCalories);

    if (currentLive !== null && history.at(-1)?.date === today) {
        history[history.length - 1].liveMaintenanceCalories = currentLive;
    }

    let lastUsable = null;
    const enriched = history.map(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        let expenditureCalories = null;

        if (live !== null) {
            expenditureCalories = live;
            lastUsable = live;
        } else {
            const held = lastUsable ?? reviewed;
            if (held !== null) {
                expenditureCalories = held;
                lastUsable = held;
            }
        }

        const isToday = point.date === today;
        const intakeCalories = isToday && completedDays?.[today] !== true
            ? null
            : caloriesForDay(foodLog?.[point.date]);

        return { ...point, expenditureCalories, intakeCalories };
    });

    const visibleStart = requestedStart
        || enriched.find(point => positive(point.expenditureCalories) !== null)?.date
        || endDate;

    const visible = enriched.filter(point => point.date >= visibleStart && point.date <= endDate && positive(point.expenditureCalories) !== null);
    const matched = visible.filter(point => Number.isFinite(Number(point.intakeCalories)) && Number.isFinite(Number(point.expenditureCalories)));

    if (!matched.length) {
        return { startDate: visibleStart, endDate, matched, averageIntake: null, averageExpenditure: null, balance: null };
    }

    const averageIntake = matched.reduce((sum, point) => sum + Number(point.intakeCalories), 0) / matched.length;
    const averageExpenditure = matched.reduce((sum, point) => sum + Number(point.expenditureCalories), 0) / matched.length;
    const balance = averageIntake - averageExpenditure;

    return { startDate: visibleStart, endDate, matched, averageIntake, averageExpenditure, balance };
}

function formatNumber(value) {
    return Math.round(Number(value)).toLocaleString();
}

function formatPeriod(startDate, endDate) {
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "";

    const sameYear = start.getFullYear() === end.getFullYear();
    const startText = start.toLocaleDateString(undefined, sameYear
        ? { month: "short", day: "numeric" }
        : { month: "short", day: "numeric", year: "numeric" });
    const endText = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return startDate === endDate ? endText : `${startText} – ${endText}`;
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureSummary(card) {
    let summary = card.querySelector("[data-energy-balance-range-summary]");
    if (summary) return summary;

    summary = document.createElement("div");
    summary.className = "energy-balance-range-summary";
    summary.dataset.energyBalanceRangeSummary = "1";
    summary.setAttribute("aria-live", "polite");
    summary.innerHTML = `<small data-energy-balance-label></small><strong data-energy-balance-value></strong><b data-energy-balance-period></b><em data-energy-balance-detail></em>`;

    const shell = card.querySelector(".calorie-expenditure-shell");
    if (shell) shell.insertAdjacentElement("beforebegin", summary);
    else card.appendChild(summary);
    return summary;
}

function renderSummary() {
    const card = document.querySelector("#calorie-progress [data-calorie-expenditure-comparison-card]");
    if (!card) return;

    const state = buildState();
    const summary = ensureSummary(card);
    const label = summary.querySelector("[data-energy-balance-label]");
    const value = summary.querySelector("[data-energy-balance-value]");
    const period = summary.querySelector("[data-energy-balance-period]");
    const detail = summary.querySelector("[data-energy-balance-detail]");

    if (!Number.isFinite(state.balance)) {
        summary.dataset.state = "learning";
        setText(label, "Energy balance");
        value.innerHTML = `— <span>kcal/day</span>`;
        setText(period, formatPeriod(state.startDate, state.endDate));
        setText(detail, "Not enough matched calorie and expenditure days yet.");
        return;
    }

    const rounded = Math.round(state.balance);
    const isDeficit = rounded < 0;
    const isSurplus = rounded > 0;
    summary.dataset.state = isDeficit ? "deficit" : isSurplus ? "surplus" : "maintenance";
    setText(label, isDeficit ? "Deficit" : isSurplus ? "Surplus" : "Maintenance");

    const sign = rounded < 0 ? "−" : rounded > 0 ? "+" : "";
    value.innerHTML = `${sign}${formatNumber(Math.abs(rounded))} <span>kcal/day</span>`;
    setText(period, formatPeriod(state.startDate, state.endDate));
    setText(detail, `${state.matched.length} logged ${state.matched.length === 1 ? "day" : "days"} · Avg calories ${formatNumber(state.averageIntake)} · Avg expenditure ${formatNumber(state.averageExpenditure)}`);
}
