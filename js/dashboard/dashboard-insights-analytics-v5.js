import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=dashboard-insights-5";
import { calculateTdee } from "../nutrition/tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=nutrition-phase-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
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

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDateKey(key, days) {
    const date = new Date(`${key}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function dateMs(key) {
    return new Date(`${key}T12:00:00`).getTime();
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function formatNumber(value) {
    return Math.round(Number(value)).toLocaleString();
}

function activePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases)
        ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null
        : null;
}

function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try { return Math.round(Number(calculateTdee(profile).tdee)) || null; }
    catch { return null; }
}

function caloriesForDay(entries) {
    if (!Array.isArray(entries) || !entries.length) return null;
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0);
    return total > 0 ? total : null;
}

function sevenDayEnergy() {
    const today = localDateKey();
    const start = shiftDateKey(today, -6);
    const profileEstimate = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(profileEstimate);
    const history = getCalculatedMaintenanceHistory(profileEstimate, { startDate: shiftDateKey(start, -28) });
    const currentLive = positive(current?.liveMaintenanceCalories);
    if (currentLive !== null && history.at(-1)?.date === today) {
        history[history.length - 1].liveMaintenanceCalories = currentLive;
    }

    const foodLog = readJson(FOOD_LOG_KEY, {});
    const completedDays = readJson(FOOD_COMPLETE_KEY, {});
    const historyByDate = new Map(history.map(point => [point.date, point]));
    let lastUsable = null;

    history.filter(point => point.date < start).forEach(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        const held = live ?? lastUsable ?? reviewed;
        if (held !== null) lastUsable = held;
    });

    const dates = Array.from({ length: 7 }, (_, index) => shiftDateKey(start, index));
    const points = dates.map(date => {
        const point = historyByDate.get(date);
        const live = positive(point?.liveMaintenanceCalories);
        const reviewed = positive(point?.maintenanceCalories);
        const expenditure = live ?? lastUsable ?? reviewed;
        if (positive(expenditure) !== null) lastUsable = expenditure;
        const calories = date === today && completedDays?.[today] !== true
            ? null
            : caloriesForDay(foodLog?.[date]);
        return { date, expenditure: positive(expenditure), calories: positive(calories) };
    });

    return {
        start,
        today,
        points,
        current: currentLive ?? positive(current?.maintenanceCalories)
    };
}

function goalData() {
    const today = localDateKey();
    const weights = normalizeWeightEntries(readJson(WEIGHT_KEY, [])).filter(entry => entry.date <= today);
    const trend = calculateVisibleWeightTrend(weights);
    const series = Array.isArray(trend.series) ? trend.series : [];
    const phase = activePhase();
    const current = Number(trend.trendWeight ?? series.at(-1)?.weight ?? weights.at(-1)?.weight);
    const phaseGoal = Number(phase?.goalWeight ?? phase?.targetWeight);
    const legacyGoal = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
    const goal = Number.isFinite(phaseGoal) && phaseGoal > 0
        ? phaseGoal
        : Number.isFinite(legacyGoal) && legacyGoal > 0
            ? legacyGoal
            : null;
    const storedStart = Number(phase?.startingTrendWeight ?? phase?.startWeight);
    const phaseMs = phase?.startDate ? dateMs(phase.startDate) : null;
    const nearest = Number.isFinite(phaseMs)
        ? series.reduce((best, point) => {
            const distance = Math.abs(dateMs(point.date) - phaseMs);
            return !best || distance < best.distance ? { point, distance } : best;
        }, null)?.point
        : null;
    const nearestStart = Number(nearest?.weight);
    const start = Number.isFinite(storedStart) && storedStart > 0
        ? storedStart
        : Number.isFinite(nearestStart) && nearestStart > 0
            ? nearestStart
            : Number(weights[0]?.weight);

    if (![start, current, goal].every(value => Number.isFinite(value) && value > 0) || Math.abs(goal - start) < .05) {
        return { ready: false, percent: 0 };
    }

    const direction = goal > start ? 1 : -1;
    const percent = Math.min(100, Math.max(0, ((current - start) * direction) / Math.abs(goal - start) * 100));
    return {
        ready: true,
        start,
        current,
        goal,
        percent,
        remaining: Math.max(0, Math.abs(goal - current))
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

function averageBalance(points) {
    const matched = points.filter(point => Number.isFinite(point.calories) && Number.isFinite(point.expenditure));
    if (!matched.length) return null;
    return matched.reduce((sum, point) => sum + point.calories - point.expenditure, 0) / matched.length;
}

function goalMarkup(goal) {
    const value = goal.ready ? `${Math.round(goal.percent)}%` : "--";
    const detail = goal.ready
        ? goal.percent >= 100
            ? "complete"
            : `${goal.remaining.toFixed(1)} lb left`
        : "goal progress";
    return `<article class="dashboard-preview-card dashboard-preview-goal"><h3>Goal Progress</h3><span class="sub">Current Goal</span><div class="dashboard-preview-goal-visual"><div class="dashboard-preview-goal-track" aria-label="${goal.ready ? `${Math.round(goal.percent)} percent complete` : "Goal progress unavailable"}"><span style="width:${goal.ready ? goal.percent.toFixed(1) : 0}%"></span></div></div><div class="value"><strong>${value}</strong><span>${detail}</span></div></article>`;
}

function screenMarkup() {
    const energy = sevenDayEnergy();
    const goal = goalData();
    const balance = averageBalance(energy.points);
    const balanceValue = Number.isFinite(balance)
        ? `${balance > 0 ? "+" : balance < 0 ? "−" : ""}${formatNumber(Math.abs(balance))}`
        : "--";
    const balanceLabel = Number.isFinite(balance)
        ? `kcal/day ${balance > 0 ? "surplus" : balance < 0 ? "deficit" : "balanced"}`
        : "energy balance";

    return `<header class="dashboard-preview-header"><button class="dashboard-preview-back" type="button" data-dashboard-insights-close aria-label="Back">‹</button><div><small>Dashboard</small><h2>Insights &amp; Analytics</h2></div></header><main class="dashboard-preview-body"><h3 class="dashboard-preview-section-title">All</h3><div class="dashboard-preview-grid"><button type="button" class="dashboard-preview-card" data-dashboard-open-progress="expenditure"><h3>Expenditure</h3><span class="sub">Last 7 Days</span>${expenditureSvg(energy)}<div class="value"><strong>${energy.current !== null ? formatNumber(energy.current) : "--"}</strong><span>kcal/day</span></div><span class="dashboard-preview-chevron">›</span></button><button type="button" class="dashboard-preview-card" data-dashboard-open-progress="comparison"><h3>Calories vs Expenditure</h3><span class="sub">Last 7 Days</span>${comparisonSvg(energy)}<div class="value"><strong>${balanceValue}</strong><span>${balanceLabel}</span></div><span class="dashboard-preview-chevron">›</span></button>${goalMarkup(goal)}</div><p class="dashboard-preview-hint">Tap either energy card to open the full interactive graph in Progress.</p></main>`;
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

function ensureSeeMore() {
    ensureStyles();
    cleanupOldDashboardActions();
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
    "levelup:appearance-changed"
].forEach(name => window.addEventListener(name, schedule));
schedule();
