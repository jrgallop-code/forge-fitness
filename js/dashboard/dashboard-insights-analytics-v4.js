import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=dashboard-insights-4";
import { calculateTdee } from "../nutrition/tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=nutrition-phase-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const SCREEN_ID = "dashboard-insights-analytics-screen";
const STYLE_ID = "dashboard-see-more-preview-v4-styles";
const DAY_MS = 86400000;
let queued = false;
let animatedWeightPath = null;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .dashboard-weight-see-more-wrap{display:flex;min-width:0;flex-direction:column;gap:4px}
        .dashboard-weight-see-more-wrap>.metric-card{width:100%;min-width:0;flex:1}
        .dashboard-weight-see-more-action{display:flex;justify-content:flex-end;min-height:23px;padding:0 2px}
        .dashboard-weight-see-more-action button{padding:3px 0;border:0;background:transparent;color:var(--accent-text,var(--accent));font:inherit;font-size:.7rem;font-weight:850;cursor:pointer}
        .dashboard-weight-see-more-action button:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
        body.dashboard-insights-open{overflow:hidden}
        .dashboard-analytics-screen{position:fixed;inset:0;z-index:13050;overflow-y:auto;background:var(--bg);color:var(--text);-webkit-overflow-scrolling:touch}
        .dashboard-preview-header{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:40px minmax(0,1fr) 40px;align-items:center;min-height:68px;padding:calc(env(safe-area-inset-top) + 8px) 14px 10px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .dashboard-preview-header>div{grid-column:2;text-align:center}.dashboard-preview-header h2{margin:0;font-size:1rem}.dashboard-preview-header small{display:block;margin-bottom:2px;color:var(--muted);font-size:.55rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
        .dashboard-preview-back{grid-column:1;width:36px;height:36px;padding:0 0 3px;border:0;border-radius:999px;background:var(--surface-raised);color:var(--text);font-size:1.8rem;line-height:1;cursor:pointer}
        .dashboard-preview-body{width:min(100%,680px);margin:0 auto;padding:20px 16px calc(32px + env(safe-area-inset-bottom))}
        .dashboard-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .dashboard-preview-card{position:relative;min-width:0;padding:15px;border:1px solid var(--card-border,var(--line));border-radius:17px;background:var(--card);color:var(--text);box-shadow:var(--shadow)}
        button.dashboard-preview-card{width:100%;font:inherit;text-align:left;cursor:pointer}
        .dashboard-preview-card h3{margin:0;font-size:.86rem}.dashboard-preview-card .sub{display:block;margin-top:3px;color:var(--muted);font-size:.57rem}
        .dashboard-preview-card .value{display:flex;align-items:baseline;gap:5px;margin-top:9px}.dashboard-preview-card .value strong{font-size:1.35rem;line-height:1}.dashboard-preview-card .value span{color:var(--muted);font-size:.58rem}
        .dashboard-preview-chevron{position:absolute;right:13px;bottom:13px;color:var(--muted);font-size:1.35rem}
        .dashboard-preview-svg{display:block;width:100%;height:74px;margin-top:12px;overflow:visible}
        .dashboard-preview-exp-line{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
        .dashboard-preview-calorie-bar{fill:var(--accent);opacity:.25;stroke:var(--accent);stroke-width:.6}
        .dashboard-preview-energy-line{fill:none;stroke:var(--text);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
        .dashboard-preview-axis{stroke:var(--line);stroke-width:1;vector-effect:non-scaling-stroke}
        .dashboard-preview-label{fill:var(--muted);font-size:6px;font-weight:800;text-anchor:middle}
        .dashboard-preview-empty{display:grid;height:74px;margin-top:12px;place-items:center;color:var(--muted);font-size:.6rem;text-align:center}
        .dashboard-preview-goal{grid-column:1/-1}.dashboard-preview-goal-track{height:12px;margin-top:20px;overflow:hidden;border-radius:999px;background:var(--surface-raised)}.dashboard-preview-goal-track span{display:block;height:100%;border-radius:inherit;background:var(--success,#22c55e)}
        .dashboard-preview-goal-summary{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:12px}.dashboard-preview-goal-summary strong{font-size:1.45rem}.dashboard-preview-goal-summary span{color:var(--muted);font-size:.64rem}
        .dashboard-preview-goal-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}.dashboard-preview-goal-meta>span{padding:9px;border:1px solid var(--line);border-radius:11px;background:var(--surface-raised)}.dashboard-preview-goal-meta small{display:block;color:var(--muted);font-size:.5rem;text-transform:uppercase}.dashboard-preview-goal-meta b{display:block;margin-top:3px;font-size:.82rem}
        .dashboard-preview-hint{margin:12px 0 0;color:var(--muted);font-size:.58rem;text-align:center}
        @media(max-width:520px){.dashboard-preview-grid{grid-template-columns:1fr}.dashboard-preview-goal{grid-column:auto}}
    `;
    document.head.appendChild(style);
}

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function shiftDateKey(key, days) { const date = new Date(`${key}T12:00:00`); date.setDate(date.getDate() + days); return localDateKey(date); }
function dateMs(key) { return new Date(`${key}T12:00:00`).getTime(); }
function positive(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function formatNumber(value) { return Math.round(Number(value)).toLocaleString(); }
function activePhase() { const phases = readJson(PHASES_KEY, []); return Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null : null; }
function profileMaintenance() { const profile = getNutritionProfile(); if (!profile || Number(profile.age) < 18) return null; try { return Math.round(Number(calculateTdee(profile).tdee)) || null; } catch { return null; } }
function caloriesForDay(entries) { if (!Array.isArray(entries) || !entries.length) return null; const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0); return total > 0 ? total : null; }

function sevenDayEnergy() {
    const today = localDateKey();
    const start = shiftDateKey(today, -6);
    const profileEstimate = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(profileEstimate);
    const history = getCalculatedMaintenanceHistory(profileEstimate, { startDate: shiftDateKey(start, -28) });
    const currentLive = positive(current?.liveMaintenanceCalories);
    if (currentLive !== null && history.at(-1)?.date === today) history[history.length - 1].liveMaintenanceCalories = currentLive;
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const completed = readJson(FOOD_COMPLETE_KEY, {});
    let lastUsable = null;
    const all = history.map(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        const expenditure = live ?? lastUsable ?? reviewed;
        if (positive(expenditure) !== null) lastUsable = expenditure;
        const calories = point.date === today && completed?.[today] !== true ? null : caloriesForDay(foodLog?.[point.date]);
        return { date: point.date, expenditure, calories };
    }).filter(point => point.date >= start && point.date <= today);
    return { start, today, points: all, current: currentLive ?? positive(current?.maintenanceCalories) };
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
    const goal = Number.isFinite(phaseGoal) && phaseGoal > 0 ? phaseGoal : Number.isFinite(legacyGoal) && legacyGoal > 0 ? legacyGoal : null;
    const storedStart = Number(phase?.startingTrendWeight ?? phase?.startWeight);
    const phaseMs = phase?.startDate ? dateMs(phase.startDate) : null;
    const nearest = Number.isFinite(phaseMs) ? series.reduce((best, point) => { const distance = Math.abs(dateMs(point.date) - phaseMs); return !best || distance < best.distance ? { point, distance } : best; }, null)?.point : null;
    const nearestStart = Number(nearest?.weight);
    const start = Number.isFinite(storedStart) && storedStart > 0 ? storedStart : Number.isFinite(nearestStart) && nearestStart > 0 ? nearestStart : Number(weights[0]?.weight);
    if (![start, current, goal].every(value => Number.isFinite(value) && value > 0) || Math.abs(goal - start) < .05) return { ready: false, percent: 0 };
    const direction = goal > start ? 1 : -1;
    const percent = Math.min(100, Math.max(0, ((current - start) * direction) / Math.abs(goal - start) * 100));
    return { ready: true, start, current, goal, percent, remaining: Math.max(0, Math.abs(goal - current)) };
}

function linePath(values, width = 180, height = 74, pad = 7) {
    const valid = values.filter(item => Number.isFinite(item.value));
    if (valid.length < 2) return "";
    const min = Math.min(...valid.map(item => item.value));
    const max = Math.max(...valid.map(item => item.value));
    const range = Math.max(1, max - min);
    return valid.map((item, index) => {
        const x = pad + (index / Math.max(1, valid.length - 1)) * (width - pad * 2);
        const y = pad + ((max - item.value) / range) * (height - pad * 2 - 10);
        return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
}

function expenditureSvg(state) {
    const values = state.points.map(point => ({ value: positive(point.expenditure) }));
    const path = linePath(values);
    if (!path) return `<div class="dashboard-preview-empty">More expenditure data needed.</div>`;
    return `<svg class="dashboard-preview-svg" viewBox="0 0 180 74" preserveAspectRatio="none" aria-hidden="true"><path class="dashboard-preview-axis" d="M7 60 H173"></path><path class="dashboard-preview-exp-line" data-preview-animated-line d="${path}"></path></svg>`;
}

function comparisonSvg(state) {
    const points = state.points.filter(point => positive(point.expenditure) !== null);
    if (points.length < 2) return `<div class="dashboard-preview-empty">More expenditure data needed.</div>`;
    const max = Math.max(1, ...points.flatMap(point => [positive(point.expenditure), positive(point.calories)]).filter(Number.isFinite));
    const width = 180, height = 86, left = 7, right = 7, top = 7, base = 65;
    const step = (width - left - right) / Math.max(1, points.length - 1);
    const y = value => top + (1 - Number(value) / max) * (base - top);
    const bars = points.map((point, index) => {
        const calories = positive(point.calories);
        if (calories === null) return "";
        const x = left + index * step;
        const barWidth = Math.min(15, Math.max(6, step * .55));
        return `<rect class="dashboard-preview-calorie-bar" x="${(x - barWidth / 2).toFixed(1)}" y="${y(calories).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, base - y(calories)).toFixed(1)}" rx="2"></rect>`;
    }).join("");
    const line = points.map((point, index) => `${index ? "L" : "M"}${(left + index * step).toFixed(1)},${y(point.expenditure).toFixed(1)}`).join(" ");
    const labels = points.map((point, index) => { const date = new Date(`${point.date}T12:00:00`); const label = new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date); return `<text class="dashboard-preview-label" x="${(left + index * step).toFixed(1)}" y="82">${label}</text>`; }).join("");
    return `<svg class="dashboard-preview-svg" viewBox="0 0 180 86" preserveAspectRatio="none" aria-hidden="true"><path class="dashboard-preview-axis" d="M7 65 H173"></path>${bars}<path class="dashboard-preview-energy-line" data-preview-animated-line d="${line}"></path>${labels}</svg>`;
}

function goalMarkup(goal) {
    return `<article class="dashboard-preview-card dashboard-preview-goal"><h3>Goal Progress</h3><span class="sub">Current weight goal</span><div class="dashboard-preview-goal-track"><span style="width:${goal.ready ? goal.percent.toFixed(1) : 0}%"></span></div>${goal.ready ? `<div class="dashboard-preview-goal-summary"><strong>${Math.round(goal.percent)}% complete</strong><span>${goal.remaining.toFixed(1)} lb remaining</span></div><div class="dashboard-preview-goal-meta"><span><small>Start</small><b>${goal.start.toFixed(1)} lb</b></span><span><small>Current</small><b>${goal.current.toFixed(1)} lb</b></span><span><small>Goal</small><b>${goal.goal.toFixed(1)} lb</b></span></div>` : `<div class="dashboard-preview-empty">Set an active goal weight and keep logging weigh-ins to track progress.</div>`}</article>`;
}

function screenMarkup() {
    const energy = sevenDayEnergy();
    const goal = goalData();
    return `<header class="dashboard-preview-header"><button class="dashboard-preview-back" type="button" data-dashboard-insights-close aria-label="Back">‹</button><div><small>Dashboard</small><h2>More Analytics</h2></div></header><main class="dashboard-preview-body"><div class="dashboard-preview-grid"><button type="button" class="dashboard-preview-card" data-dashboard-open-progress="expenditure"><h3>Expenditure</h3><span class="sub">Last 7 days</span>${expenditureSvg(energy)}<div class="value"><strong>${energy.current !== null ? formatNumber(energy.current) : "--"}</strong><span>kcal/day current</span></div><span class="dashboard-preview-chevron">›</span></button><button type="button" class="dashboard-preview-card" data-dashboard-open-progress="comparison"><h3>Calories vs Expenditure</h3><span class="sub">Last 7 days</span>${comparisonSvg(energy)}<div class="value"><strong>7 days</strong><span>calories + expenditure</span></div><span class="dashboard-preview-chevron">›</span></button>${goalMarkup(goal)}</div><p class="dashboard-preview-hint">Tap either energy card to open the full interactive graph in Progress.</p></main>`;
}

function cleanupOldDashboardActions() {
    document.querySelectorAll("#content .dashboard-insights-see-more-row").forEach(node => node.remove());
    const heading = document.querySelector("#content .dashboard-command-insights-heading");
    heading?.querySelector("[data-dashboard-insights-open]")?.remove();
    const copy = heading?.querySelector(".dashboard-insights-heading-copy");
    if (copy) { [...copy.children].forEach(child => heading.insertBefore(child, copy)); copy.remove(); }
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
        path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: 950, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
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
        path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: 850, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
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
    screen.setAttribute("aria-label", "More analytics");
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
        if (target) { target.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
        if (attempts < 10) window.setTimeout(reveal, 100);
    };
    window.setTimeout(reveal, 0);
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-dashboard-insights-open]")) { openDashboardInsights(); return; }
    if (event.target.closest("[data-dashboard-insights-close]")) { closeDashboardInsights(); return; }
    const graph = event.target.closest("[data-dashboard-open-progress]");
    if (graph) openProgressGraph(graph.dataset.dashboardOpenProgress);
});
document.addEventListener("keydown", event => { if (event.key === "Escape") closeDashboardInsights(); });

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; ensureSeeMore(); });
}
const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
["pageshow", "levelup:nutrition-updated", "levelup:food-log-updated", "levelup:weight-updated", "levelup:nutrition-phase-updated", "levelup:appearance-changed"].forEach(name => window.addEventListener(name, schedule));
schedule();
