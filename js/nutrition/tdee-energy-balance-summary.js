import { getEnergyBalanceState, getEnergyBalanceWindow } from "./energy-balance-state.js?v=energy-balance-30d-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const STYLE_ID = "level-up-energy-balance-summary-styles";

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
        if ([FOOD_LOG_KEY, FOOD_COMPLETE_KEY].includes(event.key)) schedule();
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

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildState() {
    const endDate = localDateKey();
    const window = getEnergyBalanceWindow(endDate);
    return { ...getEnergyBalanceState(window), windowStart: window.startDate, windowEnd: window.endDate };
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
        setText(period, formatPeriod(state.windowStart, state.windowEnd));
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
    setText(period, formatPeriod(state.windowStart, state.windowEnd));
    setText(detail, `${state.matched.length} logged ${state.matched.length === 1 ? "day" : "days"} · Avg calories ${formatNumber(state.averageIntake)} · Avg expenditure ${formatNumber(state.averageExpenditure)}`);
}
