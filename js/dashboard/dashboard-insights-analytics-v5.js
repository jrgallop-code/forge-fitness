import { energyDateKey, getEnergyBalanceState, shiftEnergyDateKey } from "../nutrition/energy-balance-state.js?v=energy-summary-1";
import { isNutritionEnabled } from "../core/app-feature-preferences.js?v=nutrition-dashboard-visibility-1";
import { getGoalTimelineViewModel, goalTimelinePreviewMarkup } from "./dashboard-goal-timeline.js?v=goal-timeline-2";

const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const SCREEN_ID = "dashboard-insights-analytics-screen";
const STYLE_ID = "dashboard-see-more-preview-v5-styles";
const DAY_MS = 86400000;
let queued = false;
let animatedWeightPath = null;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .dashboard.dashboard-command-insights{align-items:start}
        .dashboard-weight-see-more-wrap{position:relative;display:block;min-width:0;height:148px;align-self:start}
        .dashboard-weight-see-more-wrap>.metric-card{width:100%;min-width:0;height:148px!important;min-height:148px!important;max-height:148px!important}
        .dashboard-weight-see-more-action{position:absolute;right:2px;top:-28px;z-index:3;display:flex;justify-content:flex-end;pointer-events:none}
        .dashboard-weight-see-more-action button{pointer-events:auto;padding:3px 0;border:0;background:transparent;color:var(--accent-text,var(--accent));font:inherit;font-size:.7rem;font-weight:850;cursor:pointer}
        .dashboard-weight-see-more-action button:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
        .dashboard.dashboard-command-insights .metric-card.dashboard-seven-day-sets-card{height:148px!important;min-height:148px!important;max-height:148px!important;align-self:start!important;box-sizing:border-box}
        body.dashboard-insights-open{overflow:hidden}
        .dashboard-analytics-screen{position:fixed;inset:0;z-index:13050;overflow-y:auto;background:var(--bg);color:var(--text);-webkit-overflow-scrolling:touch}
        .dashboard-preview-header{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:40px minmax(0,1fr) 40px;align-items:center;min-height:68px;padding:calc(env(safe-area-inset-top) + 8px) 14px 10px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .dashboard-preview-header>div{grid-column:2;text-align:center}.dashboard-preview-header h2{margin:0;font-size:1rem}.dashboard-preview-header small{display:block;margin-bottom:2px;color:var(--muted);font-size:.55rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
        .dashboard-preview-back{grid-column:1;width:36px;height:36px;padding:0 0 3px;border:0;border-radius:999px;background:var(--surface-raised);color:var(--text);font-size:1.8rem;line-height:1;cursor:pointer}
        .dashboard-preview-body{width:min(100%,680px);margin:0 auto;padding:20px 16px calc(32px + env(safe-area-inset-bottom))}
        .dashboard-preview-section-title{margin:0 0 12px;color:var(--heading,var(--text));font-size:1.15rem}
        .dashboard-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:stretch}
        .dashboard-preview-card{position:relative;display:flex;min-width:0;min-height:166px;padding:14px;border:1px solid var(--card-border,var(--line));border-radius:17px;background:var(--card);color:var(--text);box-shadow:var(--shadow);flex-direction:column;box-sizing:border-box}
        button.dashboard-preview-card{width:100%;font:inherit;text-align:left;cursor:pointer}
        .dashboard-preview-card h3{margin:0;color:var(--heading,var(--text));font-size:.86rem;line-height:1.15}.dashboard-preview-card .sub{display:block;margin-top:3px;color:var(--muted);font-size:.57rem;line-height:1.15}
        .dashboard-preview-chart{display:flex;height:58px;margin:10px 0 8px;align-items:center}
        .dashboard-preview-svg{display:block;width:100%;height:58px;overflow:visible}
        .dashboard-preview-exp-line{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
        .dashboard-preview-calorie-bar{fill:var(--accent);opacity:.25;stroke:var(--accent);stroke-width:.6}
        .dashboard-preview-energy-line{fill:none;stroke:var(--text);stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
        .dashboard-preview-axis{stroke:var(--line);stroke-width:1;vector-effect:non-scaling-stroke}
        .dashboard-preview-empty{display:grid;width:100%;height:58px;place-items:center;color:var(--muted);font-size:.58rem;text-align:center}
        .dashboard-preview-card .value{display:flex;min-width:0;margin-top:auto;padding-top:9px;border-top:1px solid var(--line);align-items:baseline;gap:4px;padding-right:20px}.dashboard-preview-card .value strong{overflow:hidden;color:var(--heading,var(--text));font-size:1.25rem;line-height:1;text-overflow:ellipsis;white-space:nowrap}.dashboard-preview-card .value span{color:var(--muted);font-size:.55rem;white-space:nowrap}
        .dashboard-preview-chevron{position:absolute;right:12px;bottom:10px;color:var(--muted);font-size:1.35rem;line-height:1}
        .dashboard-preview-goal-visual{display:flex;height:58px;margin:10px 0 8px;align-items:center}
        .dashboard-preview-goal-track{width:100%;height:12px;overflow:hidden;border-radius:999px;background:var(--surface-raised)}.dashboard-preview-goal-track span{display:block;height:100%;border-radius:inherit;background:var(--success,#22c55e)}
        .dashboard-preview-goal .value strong{font-size:1.25rem}.dashboard-preview-goal .value span{overflow:hidden;text-overflow:ellipsis}
        .dashboard-preview-hint{margin:12px 0 0;color:var(--muted);font-size:.58rem;text-align:center}
        @media(max-width:380px){.dashboard-preview-body{padding-left:12px;padding-right:12px}.dashboard-preview-grid{gap:8px}.dashboard-preview-card{min-height:158px;padding:12px}.dashboard-preview-card h3{font-size:.8rem}.dashboard-preview-card .value strong{font-size:1.12rem}.dashboard-preview-card .value span{font-size:.5rem}}
    `;
    document.head.appendChild(style);
}

function formatNumber(value) {
    return Math.round(Number(value)).toLocaleString();
}

function sevenDayEnergy() {
    const today = energyDateKey();
    const start = shiftEnergyDateKey(today, -6);
    const state = getEnergyBalanceState({ startDate: start, endDate: today });
    const points = state.points.map(point => ({
        date: point.date,
        expenditure: point.expenditureCalories,
        calories: point.intakeCalories
    }));

    return {
        start,
        today,
        points,
        averageExpenditure: state.averageVisibleExpenditure,
        balance: state.balance
    };
}

function sparklinePath(points, valueKey, width = 180, height = 58, pad = 6) {
    const usable = points
        .map((point, index) => ({ index, value: Number(point?.[valueKey]) }))
        .filter(point => Number.isFinite(point.value));
    if (usable.length < 2) return "";
    const minimum = Math.min(...usable.map(point => point.value));
    const maximum = Math.max(...usable.map(point => point.value));
    const range = Math.max(1, maximum - minimum);
    const x = index => pad + (index / 6) * (width - pad * 2);
    const y = value => pad + ((maximum - value) / range) * (height - pad * 2);
    return usable.map((point, index) => `${index ? "L" : "M"}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
}

function expenditureSvg(state) {
    const path = sparklinePath(state.points, "expenditure");
    if (!path) return `<div class="dashboard-preview-chart"><div class="dashboard-preview-empty">More expenditure data needed.</div></div>`;
    return `<div class="dashboard-preview-chart"><svg class="dashboard-preview-svg" viewBox="0 0 180 58" preserveAspectRatio="none" aria-hidden="true"><path class="dashboard-preview-axis" d="M6 52 H174"></path><path class="dashboard-preview-exp-line" data-preview-animated-line d="${path}"></path></svg></div>`;
}

function comparisonSvg(state) {
    const points = state.points;
    const finiteValues = points.flatMap(point => [point.expenditure, point.calories]).filter(Number.isFinite);
    const expenditureCount = points.filter(point => Number.isFinite(point.expenditure)).length;
    if (expenditureCount < 2 || !finiteValues.length) {
        return `<div class="dashboard-preview-chart"><div class="dashboard-preview-empty">More expenditure data needed.</div></div>`;
    }

    const maximum = Math.max(1, ...finiteValues);
    const width = 180;
    const height = 58;
    const left = 7;
    const right = 7;
    const top = 4;
    const base = 52;
    const step = (width - left - right) / 6;
    const y = value => top + (1 - Number(value) / maximum) * (base - top);

    const bars = points.map((point, index) => {
        if (!Number.isFinite(point.calories)) return "";
        const x = left + index * step;
        const barWidth = Math.min(16, Math.max(7, step * .55));
        const topY = y(point.calories);
        return `<rect class="dashboard-preview-calorie-bar" x="${(x - barWidth / 2).toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, base - topY).toFixed(1)}" rx="2"></rect>`;
    }).join("");

    const linePoints = points
        .map((point, index) => Number.isFinite(point.expenditure)
            ? { x: left + index * step, y: y(point.expenditure) }
            : null)
        .filter(Boolean);
    const line = linePoints.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

    return `<div class="dashboard-preview-chart"><svg class="dashboard-preview-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path class="dashboard-preview-axis" d="M${left} ${base} H${width - right}"></path>${bars}<path class="dashboard-preview-energy-line" data-preview-animated-line d="${line}"></path></svg></div>`;
}

function screenMarkup() {
    const energy = sevenDayEnergy();
    const goal = getGoalTimelineViewModel();
    const balance = energy.balance;
    const balanceValue = Number.isFinite(balance)
        ? `${balance > 0 ? "+" : balance < 0 ? "−" : ""}${formatNumber(Math.abs(balance))}`
        : "--";
    const balanceLabel = Number.isFinite(balance)
        ? `kcal/day ${balance > 0 ? "surplus" : balance < 0 ? "deficit" : "balanced"}`
        : "energy balance";

    return `<header class="dashboard-preview-header"><button class="dashboard-preview-back" type="button" data-dashboard-insights-close aria-label="Back">‹</button><div><small>Dashboard</small><h2>Insights &amp; Analytics</h2></div></header><main class="dashboard-preview-body"><h3 class="dashboard-preview-section-title">All</h3><div class="dashboard-preview-grid"><button type="button" class="dashboard-preview-card" data-dashboard-open-progress="expenditure"><h3>Expenditure</h3><span class="sub">Last 7 Days</span>${expenditureSvg(energy)}<div class="value"><strong>${Number.isFinite(energy.averageExpenditure) ? formatNumber(energy.averageExpenditure) : "--"}</strong><span>kcal/day avg</span></div><span class="dashboard-preview-chevron">›</span></button><button type="button" class="dashboard-preview-card" data-dashboard-open-progress="comparison"><h3>Calories vs Expenditure</h3><span class="sub">Last 7 Days</span>${comparisonSvg(energy)}<div class="value"><strong>${balanceValue}</strong><span>${balanceLabel}</span></div><span class="dashboard-preview-chevron">›</span></button>${goalTimelinePreviewMarkup(goal)}</div><p class="dashboard-preview-hint">Tap a card to open more detail.</p></main>`;
}

function cleanupOldDashboardActions() {
    document.querySelectorAll("#content .dashboard-insights-see-more-row").forEach(node => node.remove());
    const heading = document.querySelector("#content .dashboard-command-insights-heading");
    heading?.querySelector("[data-dashboard-insights-open]")?.remove();
    const copy = heading?.querySelector(".dashboard-insights-heading-copy");
    if (copy) {
        [...copy.children].forEach(child => heading.insertBefore(child, copy));
        copy.remove();
    }
    heading?.classList.remove("dashboard-command-insights-heading-with-action");
}

function removeNutritionInsights() {
    cleanupOldDashboardActions();
    document.querySelectorAll("#content .dashboard-weight-see-more-wrap").forEach(wrapper => {
        const card = wrapper.querySelector(":scope > .dashboard-weight-trend-card");
        if (card) wrapper.replaceWith(card);
        else wrapper.remove();
    });
    closeDashboardInsights();
}

function ensureSeeMore() {
    ensureStyles();
    cleanupOldDashboardActions();
    if (!isNutritionEnabled()) {
        removeNutritionInsights();
        return;
    }
    const card = document.querySelector("#content .dashboard-weight-trend-card");
    if (!card) return;

    let wrapper = card.closest(".dashboard-weight-see-more-wrap");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "dashboard-weight-see-more-wrap";
        card.parentElement?.insertBefore(wrapper, card);
        wrapper.appendChild(card);
    }

    if (!wrapper.querySelector(".dashboard-weight-see-more-action")) {
        const action = document.createElement("div");
        action.className = "dashboard-weight-see-more-action";
        action.innerHTML = `<button type="button" data-dashboard-insights-open>See More</button>`;
        wrapper.insertBefore(action, card);
    }

    animateDashboardWeight();
}

function animateDashboardWeight() {
    const path = document.querySelector("#content .dashboard-weight-trend-average");
    if (!path || path === animatedWeightPath || typeof path.getTotalLength !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    animatedWeightPath = path;
    requestAnimationFrame(() => {
        const length = path.getTotalLength();
        if (!Number.isFinite(length) || length <= 0) return;
        path.style.strokeDasharray = `${length} ${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
            duration: 950,
            easing: "cubic-bezier(.2,.7,.2,1)",
            fill: "forwards"
        });
    });
}

function animatePreviewLines(root) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    root.querySelectorAll("[data-preview-animated-line]").forEach(path => {
        if (typeof path.getTotalLength !== "function") return;
        const length = path.getTotalLength();
        if (!Number.isFinite(length) || length <= 0) return;
        path.style.strokeDasharray = `${length} ${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
            duration: 850,
            easing: "cubic-bezier(.2,.7,.2,1)",
            fill: "forwards"
        });
    });
}

export function openDashboardInsights() {
    if (!isNutritionEnabled()) {
        closeDashboardInsights();
        return;
    }
    ensureStyles();
    document.getElementById(SCREEN_ID)?.remove();
    const screen = document.createElement("section");
    screen.id = SCREEN_ID;
    screen.className = "dashboard-analytics-screen";
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-label", "Insights and Analytics");
    screen.innerHTML = screenMarkup();
    document.body.appendChild(screen);
    document.body.classList.add("dashboard-insights-open");
    requestAnimationFrame(() => animatePreviewLines(screen));
}

export function closeDashboardInsights() {
    document.getElementById(SCREEN_ID)?.remove();
    document.body.classList.remove("dashboard-insights-open");
}

function openProgressGraph(kind) {
    if (!isNutritionEnabled()) {
        closeDashboardInsights();
        return;
    }
    closeDashboardInsights();
    localStorage.setItem(TDEE_RANGE_KEY, "1w");
    document.querySelector('.nav-btn[data-page="progress"]')?.click();
    let attempts = 0;
    const reveal = () => {
        attempts += 1;
        const tab = document.getElementById("nutrition-progress-tab");
        if (tab) tab.click();
        const range = document.querySelector('[data-tdee-chart-range="1w"]');
        if (range && range.getAttribute("aria-pressed") !== "true") range.click();
        const target = kind === "comparison"
            ? document.querySelector("#calorie-progress [data-calorie-expenditure-comparison-card]")
            : document.querySelector("#calorie-progress .expenditure-trend-card");
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        if (attempts < 10) window.setTimeout(reveal, 100);
    };
    window.setTimeout(reveal, 0);
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-dashboard-insights-open]")) {
        openDashboardInsights();
        return;
    }
    if (event.target.closest("[data-dashboard-insights-close]")) {
        closeDashboardInsights();
        return;
    }
    const graph = event.target.closest("[data-dashboard-open-progress]");
    if (graph) openProgressGraph(graph.dataset.dashboardOpenProgress);
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDashboardInsights();
});

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        ensureSeeMore();
    });
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
[
    "pageshow",
    "levelup:nutrition-updated",
    "levelup:food-log-updated",
    "levelup:weight-updated",
    "levelup:nutrition-phase-updated",
    "levelup:appearance-changed",
    "levelup:app-features-updated"
].forEach(name => window.addEventListener(name, schedule));
schedule();
