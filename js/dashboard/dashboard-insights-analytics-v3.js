import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=dashboard-insights-3";
import { calculateTdee } from "../nutrition/tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=nutrition-phase-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const SCREEN_ID = "dashboard-insights-analytics-screen";
const STYLE_ID = "dashboard-see-more-analytics-v3-styles";
const DAY_MS = 86400000;
const RANGE_OPTIONS = {
    "1w": { days: 7, label: "1W" },
    "1m": { days: 30, label: "1M" },
    "3m": { days: 90, label: "3M" },
    "6m": { days: 180, label: "6M" },
    phase: { label: "PHASE" },
    all: { label: "ALL" }
};
const animatedWeightPaths = new WeakSet();
let refreshQueued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .dashboard.dashboard-command-insights .dashboard-insights-see-more-row{grid-column:1/-1;display:flex;justify-content:flex-end;align-items:center;min-height:24px;margin:0 2px -4px}
        .dashboard-insights-see-more{padding:4px 0;border:0;background:transparent;color:var(--accent-text,var(--accent));font:inherit;font-size:.72rem;font-weight:850;cursor:pointer}
        .dashboard-insights-see-more:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
        .dashboard-analytics-screen-body.dashboard-see-more-body{max-width:820px}
        .dashboard-see-more-stack{display:grid;gap:14px}
        .dashboard-see-more-card{padding:16px;border:1px solid var(--card-border,var(--line));border-radius:18px;background:var(--card);color:var(--text);box-shadow:var(--shadow)}
        .dashboard-see-more-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
        .dashboard-see-more-card>header small{display:block;color:var(--muted);font-size:.57rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
        .dashboard-see-more-card>header h3{margin:3px 0 0;font-size:1rem}
        .dashboard-see-more-current{text-align:right;flex:0 0 auto}.dashboard-see-more-current strong{display:block;font-size:1.2rem;line-height:1}.dashboard-see-more-current span{display:block;margin-top:4px;color:var(--muted);font-size:.55rem;font-weight:800}
        .dashboard-see-more-chart-shell{position:relative;min-height:250px}.dashboard-see-more-chart-shell canvas{display:block;width:100%;height:250px;touch-action:pan-y}
        .dashboard-see-more-tooltip{position:absolute;top:12px;z-index:3;width:138px;padding:8px 9px;border:1px solid var(--card-border,var(--line));border-radius:10px;background:var(--card);color:var(--text);box-shadow:var(--shadow);pointer-events:none}
        .dashboard-see-more-tooltip strong,.dashboard-see-more-tooltip span,.dashboard-see-more-tooltip small{display:block}.dashboard-see-more-tooltip strong{margin-bottom:4px;font-size:10px}.dashboard-see-more-tooltip span{font-size:9px;font-weight:850;line-height:1.45}.dashboard-see-more-tooltip small{margin-top:3px;color:var(--text-secondary,var(--muted));font-size:8px;line-height:1.35}
        .dashboard-see-more-empty{display:grid;place-items:center;height:250px;color:var(--muted);font-size:.7rem;text-align:center}
        .dashboard-see-more-legend{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px;margin-top:7px;color:var(--muted);font-size:8px;font-weight:850}
        .dashboard-see-more-legend span{display:inline-flex;align-items:center;gap:5px}.dashboard-see-more-legend i{display:inline-block;box-sizing:border-box}
        .dashboard-see-more-legend .is-calories{width:8px;height:10px;border:1px solid var(--accent);border-radius:2px;background:color-mix(in srgb,var(--accent) 28%,transparent)}
        .dashboard-see-more-legend .is-expenditure-line{width:17px;height:0;border-top:2px solid var(--text)}
        .dashboard-see-more-legend .is-updating{width:9px;height:9px;border:2px solid var(--accent);border-radius:50%;background:var(--card)}
        .dashboard-see-more-legend .is-holding{width:9px;height:9px;border:2px solid var(--accent);border-radius:2px;background:var(--card);opacity:.56}
        .dashboard-see-more-legend .is-profile{width:16px;height:0;border-top:2px dashed var(--muted)}
        .dashboard-see-more-hint{margin:5px 0 0;color:var(--muted);font-size:8px;font-weight:650;text-align:center}
        .dashboard-see-more-goal-card .dashboard-goal-progress-track{margin-top:8px}.dashboard-goal-progress-table{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
        .dashboard-goal-progress-table span{padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised)}.dashboard-goal-progress-table small{display:block;color:var(--muted);font-size:.55rem;font-weight:800;text-transform:uppercase}.dashboard-goal-progress-table b{display:block;margin-top:4px;font-size:.92rem}
        .dashboard-goal-progress-remaining{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:12px}.dashboard-goal-progress-remaining strong{font-size:1.4rem}.dashboard-goal-progress-remaining span{color:var(--muted);font-size:.68rem}
        @media(max-width:520px){.dashboard-see-more-card{padding:14px;border-radius:16px}.dashboard-goal-progress-table{gap:6px}.dashboard-goal-progress-table span{padding:9px 7px}}
    `;
    document.head.appendChild(style);
}

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateMs(key) { return new Date(`${key}T12:00:00`).getTime(); }
function shiftDateKey(key, days) { const date = new Date(`${key}T12:00:00`); date.setDate(date.getDate() + days); return localDateKey(date); }
function positive(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function formatNumber(value) { return Math.round(Number(value)).toLocaleString(); }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function signedCalories(value) { const n = Number(value); return !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatNumber(Math.abs(n))}`; }
function themeColor(token, fallback) { return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback; }
function activePhase() { const phases = readJson(PHASES_KEY, []); return Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null : null; }
function profileMaintenance() { const profile = getNutritionProfile(); if (!profile || Number(profile.age) < 18) return null; try { return Math.round(Number(calculateTdee(profile).tdee)) || null; } catch { return null; } }
function selectedRange(phase) { const requested = String(localStorage.getItem(TDEE_RANGE_KEY) || "3m").toLowerCase(); return RANGE_OPTIONS[requested] && (requested !== "phase" || phase?.startDate) ? requested : "3m"; }
function rangeStart(range, phase, endDate) { if (range === "all") return null; if (range === "phase") return String(phase?.startDate || endDate); return shiftDateKey(endDate, -(RANGE_OPTIONS[range].days - 1)); }
function caloriesForDay(entries) { if (!Array.isArray(entries) || !entries.length) return null; const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0); return total > 0 ? total : null; }

// Mirrors Progress -> Nutrition -> Expenditure Over Time authoritative data rules.
function buildExpenditureState() {
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
        if (live !== null) { lastUsable = live; return { ...point, expenditureCalories: live, mode: "updating" }; }
        const held = lastUsable ?? reviewed;
        if (held !== null) { lastUsable = held; return { ...point, expenditureCalories: held, mode: "holding" }; }
        return { ...point, expenditureCalories: null, mode: "learning" };
    });
    const visibleStart = startDate || enriched.find(point => positive(point.expenditureCalories) !== null)?.date || endDate;
    const points = enriched.filter(point => point.date >= visibleStart && point.date <= endDate && positive(point.expenditureCalories) !== null);
    const currentValue = currentLive ?? positive(current?.maintenanceCalories);
    return { range, startDate: visibleStart, endDate, points, profileEstimate, currentValue };
}

// Mirrors Progress -> Nutrition -> Calories vs Expenditure authoritative data rules.
function buildComparisonState() {
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
    if (currentLive !== null && history.at(-1)?.date === today) history[history.length - 1].liveMaintenanceCalories = currentLive;
    let lastUsable = null;
    const enriched = history.map(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        let expenditureCalories = null;
        if (live !== null) { expenditureCalories = live; lastUsable = live; }
        else { const held = lastUsable ?? reviewed; if (held !== null) { expenditureCalories = held; lastUsable = held; } }
        const intakeCalories = point.date === today && completedDays?.[today] !== true ? null : caloriesForDay(foodLog?.[point.date]);
        return { ...point, expenditureCalories, intakeCalories };
    });
    const visibleStart = requestedStart || enriched.find(point => positive(point.expenditureCalories) !== null)?.date || endDate;
    const points = enriched.filter(point => point.date >= visibleStart && point.date <= endDate && positive(point.expenditureCalories) !== null && positive(point.intakeCalories) !== null);
    return { range, startDate: points[0]?.date || visibleStart, endDate: points.at(-1)?.date || endDate, points };
}

function goalProgressData() {
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
    const phaseTime = phase?.startDate ? dateMs(phase.startDate) : null;
    const nearest = Number.isFinite(phaseTime) ? series.reduce((best, point) => { const distance = Math.abs(dateMs(point.date) - phaseTime); return !best || distance < best.distance ? { point, distance } : best; }, null)?.point : null;
    const nearestStart = Number(nearest?.weight);
    const start = Number.isFinite(storedStart) && storedStart > 0 ? storedStart : Number.isFinite(nearestStart) && nearestStart > 0 ? nearestStart : Number(weights[0]?.weight);
    if (![start, current, goal].every(value => Number.isFinite(value) && value > 0) || Math.abs(goal - start) < .05) return { ready: false, phase, start, current, goal, percent: 0, remaining: null };
    const direction = goal > start ? 1 : -1;
    const percent = Math.min(100, Math.max(0, ((current - start) * direction) / Math.abs(goal - start) * 100));
    return { ready: true, phase, start, current, goal, percent, remaining: Math.max(0, Math.abs(goal - current)) };
}

function niceExpenditureStep(value) { return [25, 50, 75, 100, 125, 150, 200, 250, 500, 1000].find(step => step >= value) || 2000; }
function expenditureAxis(values) {
    const usable = values.map(Number).filter(Number.isFinite);
    if (!usable.length) return { yMin: 0, yMax: 200 };
    const minimum = Math.min(...usable), maximum = Math.max(...usable), spread = Math.max(0, maximum - minimum);
    const step = niceExpenditureStep(Math.max(150, spread * 1.35) / 4), span = step * 4, midpoint = (minimum + maximum) / 2;
    let yMin = Math.floor((midpoint - span / 2) / step) * step, yMax = yMin + span;
    if (minimum < yMin) { yMin = Math.floor(minimum / step) * step; yMax = yMin + span; }
    if (maximum > yMax) { yMax = Math.ceil(maximum / step) * step; yMin = yMax - span; }
    return { yMin, yMax };
}
function comparisonAxis(points) {
    const values = points.flatMap(point => [positive(point.expenditureCalories), positive(point.intakeCalories)]).filter(value => value !== null);
    if (!values.length) return { yMin: 0, yMax: 3000 };
    const maximum = Math.max(...values, 1000);
    const step = [250, 500, 750, 1000, 1250, 1500, 2000].find(value => value >= maximum / 4) || 2500;
    return { yMin: 0, yMax: Math.max(step * 4, Math.ceil(maximum / step) * step) };
}
function markerStride(count) { return count > 180 ? 14 : count > 90 ? 7 : count > 45 ? 3 : 1; }
function animate(draw, duration = 1100) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) { draw(1); return; }
    const started = performance.now();
    const frame = now => { const raw = Math.min(1, (now - started) / duration); draw(1 - Math.pow(1 - raw, 3)); if (raw < 1) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
}
function drawAxes(ctx, width, height, padding, yMin, yMax, muted) {
    const plotHeight = height - padding.top - padding.bottom;
    ctx.font = "800 9px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (let index = 0; index <= 4; index += 1) {
        const value = yMax - (yMax - yMin) * index / 4;
        const lineY = padding.top + plotHeight * index / 4;
        ctx.strokeStyle = themeColor("--line", "rgba(255,255,255,.09)"); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(padding.left, lineY); ctx.lineTo(width - padding.right + 4, lineY); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = muted; ctx.fillText(formatNumber(value), width - padding.right + 9, lineY);
    }
}
function drawDateLabels(ctx, state, width, height, padding, muted) {
    const startMs = dateMs(state.startDate), endMs = dateMs(state.endDate), plotWidth = width - padding.left - padding.right;
    const count = state.range === "1w" ? 7 : 5;
    ctx.fillStyle = muted; ctx.font = "800 8px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    for (let index = 0; index < count; index += 1) {
        const date = new Date(startMs + (endMs - startMs) * index / Math.max(1, count - 1));
        ctx.fillText(formatDate(localDateKey(date)), padding.left + index / Math.max(1, count - 1) * plotWidth, height - 7);
    }
}

function renderExpenditureChart(card, state) {
    const canvas = card.querySelector("[data-dashboard-expenditure-chart]");
    const tooltip = card.querySelector("[data-dashboard-expenditure-tooltip]");
    const shell = canvas?.closest(".dashboard-see-more-chart-shell");
    if (!canvas || !tooltip || !shell || !state.points.length) return;
    const ctx = canvas.getContext("2d");
    let selectedIndex = null, dragging = false;
    const padding = { top: 18, right: 46, bottom: 30, left: 8 };
    const startMs = dateMs(state.startDate), endMs = dateMs(state.endDate);
    const draw = progress => {
        const ratio = Math.min(2, devicePixelRatio || 1), width = Math.max(280, Math.round(shell.clientWidth || 320)), height = 250;
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); canvas.style.height = `${height}px`;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
        const plotWidth = width - padding.left - padding.right, plotHeight = height - padding.top - padding.bottom;
        const { yMin, yMax } = expenditureAxis(state.points.map(point => point.expenditureCalories));
        const x = point => padding.left + ((dateMs(point.date) - startMs) / Math.max(1, endMs - startMs)) * plotWidth;
        const y = value => padding.top + (1 - (Number(value) - yMin) / (yMax - yMin)) * plotHeight;
        const accent = themeColor("--accent", "#ff3b4b"), muted = themeColor("--muted", "#85858f"), cardColor = themeColor("--card", "#1b1b1f");
        drawAxes(ctx, width, height, padding, yMin, yMax, muted);
        if (Number.isFinite(state.profileEstimate) && state.profileEstimate >= yMin && state.profileEstimate <= yMax) {
            ctx.save(); ctx.setLineDash([5,5]); ctx.strokeStyle = muted; ctx.globalAlpha = .72; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(padding.left, y(state.profileEstimate)); ctx.lineTo(width - padding.right + 4, y(state.profileEstimate)); ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.beginPath(); ctx.rect(padding.left - 4, 0, Math.max(0, plotWidth * progress + 8), height); ctx.clip();
        for (let index = 1; index < state.points.length; index += 1) {
            const previous = state.points[index - 1], point = state.points[index];
            ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = point.mode === "holding" ? 2 : 2.75; ctx.globalAlpha = point.mode === "holding" ? .46 : .96; ctx.setLineDash(point.mode === "holding" ? [5,5] : []); ctx.beginPath(); ctx.moveTo(x(previous), y(previous.expenditureCalories)); ctx.lineTo(x(point), y(point.expenditureCalories)); ctx.stroke(); ctx.restore();
        }
        const stride = markerStride(state.points.length);
        state.points.forEach((point, index) => {
            const transition = index > 0 && point.mode !== state.points[index - 1].mode;
            if (index % stride !== 0 && !transition && index !== state.points.length - 1 && index !== selectedIndex) return;
            ctx.save(); ctx.strokeStyle = accent; ctx.fillStyle = cardColor; ctx.globalAlpha = point.mode === "holding" ? .56 : 1; ctx.lineWidth = index === selectedIndex ? 3 : 2;
            if (point.mode === "holding") { const size = index === selectedIndex ? 9 : 6; ctx.beginPath(); ctx.rect(x(point)-size/2,y(point.expenditureCalories)-size/2,size,size); ctx.fill(); ctx.stroke(); }
            else { ctx.beginPath(); ctx.arc(x(point), y(point.expenditureCalories), index === selectedIndex ? 5 : 3.2, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
            ctx.restore();
        });
        ctx.restore();
        drawDateLabels(ctx, state, width, height, padding, muted);
    };
    const select = event => {
        const bounds = canvas.getBoundingClientRect(), relative = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const plotWidth = Math.max(1, bounds.width - padding.left - padding.right), proportion = Math.max(0, Math.min(1, (relative - padding.left) / plotWidth)), selectedTime = startMs + (endMs-startMs)*proportion;
        selectedIndex = state.points.reduce((nearest, point, index) => Math.abs(dateMs(point.date)-selectedTime) < Math.abs(dateMs(state.points[nearest].date)-selectedTime) ? index : nearest, 0);
        const point = state.points[selectedIndex], updating = point.mode === "updating";
        tooltip.hidden = false; tooltip.innerHTML = `<strong>${formatDate(point.date)}</strong><span>${formatNumber(point.expenditureCalories)} cal/day</span><small>${updating ? "Updating" : "Holding"}</small>${Number.isFinite(state.profileEstimate) ? `<small>${signedCalories(point.expenditureCalories-state.profileEstimate)} vs generic expenditure</small>` : ""}`;
        tooltip.style.left = `${Math.max(8, Math.min(bounds.width - 132, relative < bounds.width/2 ? relative + 10 : relative - 140))}px`; draw(1);
    };
    canvas.onpointerdown = event => { dragging = true; try { canvas.setPointerCapture(event.pointerId); } catch {} select(event); };
    canvas.onpointermove = event => { if (dragging) select(event); };
    canvas.onpointerup = event => { dragging = false; try { canvas.releasePointerCapture(event.pointerId); } catch {} };
    canvas.onpointercancel = () => { dragging = false; };
    canvas.ondblclick = () => { selectedIndex = null; tooltip.hidden = true; draw(1); };
    card.__levelUpDashboardExpenditureDraw = () => draw(1);
    animate(draw);
}

function renderComparisonChart(card, state) {
    const canvas = card.querySelector("[data-dashboard-calorie-expenditure-chart]");
    const tooltip = card.querySelector("[data-dashboard-calorie-expenditure-tooltip]");
    const shell = canvas?.closest(".dashboard-see-more-chart-shell");
    if (!canvas || !tooltip || !shell || !state.points.length) return;
    const ctx = canvas.getContext("2d");
    let selectedIndex = null, dragging = false;
    const padding = { top:16, right:46, bottom:30, left:8 }, startMs = dateMs(state.startDate), endMs = dateMs(state.endDate);
    const draw = progress => {
        const ratio = Math.min(2, devicePixelRatio || 1), width = Math.max(280, Math.round(shell.clientWidth || 320)), height = 250;
        canvas.width = Math.round(width*ratio); canvas.height = Math.round(height*ratio); canvas.style.height = `${height}px`; ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,width,height);
        const plotWidth = width-padding.left-padding.right, plotHeight = height-padding.top-padding.bottom, {yMin,yMax}=comparisonAxis(state.points);
        const x = point => padding.left + ((dateMs(point.date)-startMs)/Math.max(1,endMs-startMs))*plotWidth, y = value => padding.top + (1-(Number(value)-yMin)/(yMax-yMin))*plotHeight;
        const accent=themeColor("--accent","#ff3b4b"), text=themeColor("--text","#fff"), muted=themeColor("--muted","#85858f"), cardColor=themeColor("--card","#1b1b1f");
        drawAxes(ctx,width,height,padding,yMin,yMax,muted);
        const days=Math.max(1,Math.round((endMs-startMs)/DAY_MS)+1), barWidth=Math.max(1,Math.min(22,plotWidth/days*.62));
        state.points.forEach(point=>{const intake=positive(point.intakeCalories);if(intake===null)return;const left=Math.max(padding.left,Math.min(width-padding.right-barWidth,x(point)-barWidth/2)),top=y(intake),base=y(0);ctx.save();ctx.globalAlpha=.28;ctx.fillStyle=accent;ctx.fillRect(left,top,barWidth,Math.max(1,base-top));ctx.globalAlpha=.55;ctx.strokeStyle=accent;ctx.lineWidth=1;ctx.strokeRect(left+.5,top+.5,Math.max(0,barWidth-1),Math.max(0,base-top-1));ctx.restore();});
        ctx.save();ctx.beginPath();ctx.rect(padding.left-4,0,Math.max(0,plotWidth*progress+8),height);ctx.clip();ctx.strokeStyle=text;ctx.lineWidth=2.5;ctx.globalAlpha=.94;ctx.beginPath();state.points.forEach((point,index)=>index===0?ctx.moveTo(x(point),y(point.expenditureCalories)):ctx.lineTo(x(point),y(point.expenditureCalories)));ctx.stroke();ctx.restore();
        drawDateLabels(ctx,state,width,height,padding,muted);
        if(Number.isInteger(selectedIndex)&&state.points[selectedIndex]){const point=state.points[selectedIndex],px=x(point),py=y(point.expenditureCalories);ctx.save();ctx.strokeStyle=muted;ctx.globalAlpha=.65;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(px,padding.top);ctx.lineTo(px,padding.top+plotHeight);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=cardColor;ctx.strokeStyle=text;ctx.globalAlpha=1;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(px,py,4.5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
    };
    const select=event=>{const bounds=canvas.getBoundingClientRect(),relative=Math.max(0,Math.min(bounds.width,event.clientX-bounds.left)),plotWidth=Math.max(1,bounds.width-padding.left-padding.right),proportion=Math.max(0,Math.min(1,(relative-padding.left)/plotWidth)),selectedTime=startMs+(endMs-startMs)*proportion;selectedIndex=state.points.reduce((nearest,point,index)=>Math.abs(dateMs(point.date)-selectedTime)<Math.abs(dateMs(state.points[nearest].date)-selectedTime)?index:nearest,0);const point=state.points[selectedIndex],intake=positive(point.intakeCalories),expenditure=positive(point.expenditureCalories),difference=intake!==null&&expenditure!==null?intake-expenditure:null;tooltip.hidden=false;tooltip.innerHTML=`<strong>${formatDate(point.date)}</strong><span>Calories: ${formatNumber(intake)}</span><span>Expenditure: ${formatNumber(expenditure)}</span><small>${difference!==null?`${difference>=0?"+":"−"}${formatNumber(Math.abs(difference))} cal ${difference>=0?"above":"below"} expenditure`:"No matched data for this day."}</small>`;tooltip.style.left=`${Math.max(8,Math.min(bounds.width-142,relative<bounds.width/2?relative+10:relative-148))}px`;draw(1);};
    canvas.onpointerdown=event=>{dragging=true;try{canvas.setPointerCapture(event.pointerId);}catch{}select(event);};canvas.onpointermove=event=>{if(dragging)select(event);};canvas.onpointerup=event=>{dragging=false;try{canvas.releasePointerCapture(event.pointerId);}catch{}};canvas.onpointercancel=()=>{dragging=false;};canvas.ondblclick=()=>{selectedIndex=null;tooltip.hidden=true;draw(1);};
    card.__levelUpDashboardComparisonDraw=()=>draw(1);animate(draw);
}

function goalMarkup(goal) {
    const phaseDays = goal.phase?.startDate ? Math.max(1, Math.floor((dateMs(localDateKey()) - dateMs(goal.phase.startDate)) / DAY_MS) + 1) : null;
    return `<article class="dashboard-see-more-card dashboard-see-more-goal-card"><header><div><small>GOAL PROGRESS</small><h3>Weight Goal</h3></div><div class="dashboard-see-more-current"><strong>${goal.ready ? Math.round(goal.percent)+"%" : "--"}</strong><span>${goal.ready ? "complete" : "not available"}</span></div></header><div class="dashboard-goal-progress-track"><span style="width:${goal.ready ? goal.percent.toFixed(1) : 0}%"></span></div>${goal.ready ? `<div class="dashboard-goal-progress-table"><span><small>Start</small><b>${goal.start.toFixed(1)} lb</b></span><span><small>Current</small><b>${goal.current.toFixed(1)} lb</b></span><span><small>Goal</small><b>${goal.goal.toFixed(1)} lb</b></span></div><div class="dashboard-goal-progress-remaining"><strong>${goal.remaining.toFixed(1)} lb</strong><span>remaining${phaseDays ? ` · day ${phaseDays}` : ""}</span></div>` : `<p>Set an active goal weight and keep logging weigh-ins to track progress.</p>`}</article>`;
}
function expenditureMarkup(state) {
    const generic = Number.isFinite(state.profileEstimate) ? '<span><i class="is-profile"></i>Generic expenditure</span>' : "";
    return `<article class="dashboard-see-more-card dashboard-see-more-expenditure-card"><header><div><small>EXPENDITURE · ${RANGE_OPTIONS[state.range]?.label || state.range}</small><h3>Expenditure Over Time</h3></div><div class="dashboard-see-more-current"><strong>${state.currentValue !== null ? formatNumber(state.currentValue) : "--"}</strong><span>current cal/day</span></div></header><div class="dashboard-see-more-chart-shell">${state.points.length ? '<canvas data-dashboard-expenditure-chart role="img" aria-label="Expenditure over time"></canvas><div class="dashboard-see-more-tooltip" data-dashboard-expenditure-tooltip hidden></div>' : '<div class="dashboard-see-more-empty">More nutrition and weigh-in data needed.</div>'}</div><div class="dashboard-see-more-legend"><span><i class="is-updating"></i>Updating</span><span><i class="is-holding"></i>Holding</span>${generic}</div><p class="dashboard-see-more-hint">Uses the same daily expenditure values and selected range as Progress.</p></article>`;
}
function comparisonMarkup(state) {
    return `<article class="dashboard-see-more-card dashboard-see-more-comparison-card"><header><div><small>ENERGY BALANCE · ${RANGE_OPTIONS[state.range]?.label || state.range}</small><h3>Calories vs Expenditure</h3></div></header><div class="dashboard-see-more-chart-shell">${state.points.length ? '<canvas data-dashboard-calorie-expenditure-chart role="img" aria-label="Calories compared with expenditure"></canvas><div class="dashboard-see-more-tooltip" data-dashboard-calorie-expenditure-tooltip hidden></div>' : '<div class="dashboard-see-more-empty">Complete food days are needed to compare calories with expenditure.</div>'}</div><div class="dashboard-see-more-legend"><span><i class="is-calories"></i>Calories</span><span><i class="is-expenditure-line"></i>Expenditure</span></div><p class="dashboard-see-more-hint">Bars show logged calories. The line shows the same daily expenditure used in Progress.</p></article>`;
}

function removeOldHeadingAction() {
    const heading = document.querySelector("#content .dashboard-command-insights-heading");
    heading?.querySelector("[data-dashboard-insights-open]")?.remove();
    const copy = heading?.querySelector(".dashboard-insights-heading-copy");
    if (copy) { [...copy.children].forEach(child => heading.insertBefore(child, copy)); copy.remove(); }
    heading?.classList.remove("dashboard-command-insights-heading-with-action");
}
function ensureSeeMoreButton() {
    ensureStyles(); removeOldHeadingAction();
    const dashboard = document.querySelector("#content .dashboard.dashboard-command-insights");
    const weightCard = dashboard?.querySelector(".dashboard-weight-trend-card");
    if (!dashboard || !weightCard) return;
    let row = dashboard.querySelector(":scope > .dashboard-insights-see-more-row");
    if (!row) { row = document.createElement("div"); row.className = "dashboard-insights-see-more-row"; row.innerHTML = '<button type="button" class="dashboard-insights-see-more" data-dashboard-insights-open>See More</button>'; }
    if (row.nextElementSibling !== weightCard) weightCard.insertAdjacentElement("beforebegin", row);
}
function animateDashboardWeightLine() {
    const path = document.querySelector("#content .dashboard-weight-trend-card .dashboard-weight-trend-average");
    if (!path || animatedWeightPaths.has(path)) return;
    animatedWeightPaths.add(path);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || typeof path.getTotalLength !== "function") return;
    requestAnimationFrame(() => {
        const length = path.getTotalLength();
        if (!Number.isFinite(length) || length <= 0) return;
        path.getAnimations?.().forEach(animation => animation.cancel());
        path.style.strokeDasharray = `${length} ${length}`; path.style.strokeDashoffset = `${length}`;
        const animation = path.animate([{ strokeDashoffset: `${length}` }, { strokeDashoffset: "0" }], { duration: 1200, easing: "cubic-bezier(.2,.72,.2,1)", fill: "forwards" });
        animation.onfinish = () => { path.style.strokeDasharray = "none"; path.style.strokeDashoffset = "0"; };
    });
}
function refreshDashboardEnhancements() { refreshQueued = false; ensureSeeMoreButton(); animateDashboardWeightLine(); }
function scheduleRefresh() { if (refreshQueued) return; refreshQueued = true; requestAnimationFrame(refreshDashboardEnhancements); }

function renderOpenScreen(screen) {
    const goal = goalProgressData(), expenditure = buildExpenditureState(), comparison = buildComparisonState();
    screen.innerHTML = `<header class="dashboard-analytics-screen-header"><button type="button" class="dashboard-analytics-back" data-dashboard-insights-close aria-label="Back">‹</button><div><span class="eyebrow">DASHBOARD</span><h2>More Analytics</h2></div></header><main class="dashboard-analytics-screen-body dashboard-see-more-body"><div class="dashboard-see-more-stack">${goalMarkup(goal)}${expenditureMarkup(expenditure)}${comparisonMarkup(comparison)}</div></main>`;
    requestAnimationFrame(() => { if (expenditure.points.length) renderExpenditureChart(screen.querySelector(".dashboard-see-more-expenditure-card"), expenditure); if (comparison.points.length) renderComparisonChart(screen.querySelector(".dashboard-see-more-comparison-card"), comparison); });
}
export function openDashboardInsights() {
    ensureStyles(); document.getElementById(SCREEN_ID)?.remove();
    const screen = document.createElement("section"); screen.id = SCREEN_ID; screen.className = "dashboard-analytics-screen"; screen.setAttribute("role", "dialog"); screen.setAttribute("aria-modal", "true"); screen.setAttribute("aria-label", "More analytics");
    renderOpenScreen(screen); document.body.appendChild(screen); document.body.classList.add("dashboard-insights-open"); requestAnimationFrame(() => screen.classList.add("is-visible")); screen.querySelector("[data-dashboard-insights-close]")?.focus({ preventScroll:true });
}
export function closeDashboardInsights() { const screen=document.getElementById(SCREEN_ID); if(!screen)return; screen.classList.remove("is-visible"); document.body.classList.remove("dashboard-insights-open"); setTimeout(()=>screen.remove(),180); }
function refreshOpenScreen() { const screen=document.getElementById(SCREEN_ID); if(screen) renderOpenScreen(screen); }

document.addEventListener("click", event => { if(event.target.closest("[data-dashboard-insights-open]")){openDashboardInsights();return;} if(event.target.closest("[data-dashboard-insights-close]"))closeDashboardInsights(); });
document.addEventListener("keydown", event => { if(event.key==="Escape"&&document.getElementById(SCREEN_ID))closeDashboardInsights(); });
const content=document.getElementById("content"); if(content)new MutationObserver(scheduleRefresh).observe(content,{childList:true,subtree:true});
["pageshow","levelup:nutrition-updated","levelup:food-log-updated","levelup:weight-updated","levelup:nutrition-phase-updated","levelup:appearance-changed"].forEach(name=>window.addEventListener(name,()=>{scheduleRefresh();refreshOpenScreen();}));
window.addEventListener("resize",()=>{document.querySelector(".dashboard-see-more-expenditure-card")?.__levelUpDashboardExpenditureDraw?.();document.querySelector(".dashboard-see-more-comparison-card")?.__levelUpDashboardComparisonDraw?.();});
ensureStyles(); scheduleRefresh();