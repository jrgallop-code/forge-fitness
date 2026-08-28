const FOOD_LOG_KEY = "level_up_food_log_v1";
const CALORIES_TAB_KEY = "level_up_calories_tab_v1";
const WEIGHT_KEY = "forge_weight_entries";
const RANGE_KEY = "level_up_calorie_stats_range_v1";
const DAY = 86400000;
const ranges = { "7": 7, "28": 28, "84": 84 };
const MEAL_COLORS = { Breakfast: "#4fa8ff", Lunch: "#8b7cf6", Dinner: "#39d7ae", Snacks: "#ff9f43", Other: "#8f8f99" };

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeyOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function summarize(entries) {
    return (Array.isArray(entries) ? entries : []).reduce((total, entry) => {
        const nutrition = entry?.nutrition || {};
        ["calories", "protein", "carbs", "fat"].forEach(key => total[key] += Math.max(0, Number(nutrition[key]) || 0));
        return total;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function activeTargets() {
    const plan = readJson("level_up_nutrition_plan", {});
    const phases = readJson("level_up_nutrition_phases", []);
    const active = Array.isArray(phases) ? [...phases].reverse().find(phase => !phase?.endDate) : null;
    const macro = readJson("level_up_nutrition_macro", {});
    const manual = macro?.useManual ? macro.manualMacros : null;
    const auto = macro?.autoBaseline;
    return {
        calories: Number(active?.currentCalories ?? active?.startCalories ?? plan?.calculatedCalories ?? plan?.currentCalories) || 0,
        protein: Number(manual?.protein ?? auto?.protein) || 0,
        carbs: Number(manual?.carbs ?? auto?.carbs) || 0,
        fat: Number(manual?.fat ?? auto?.fat) || 0,
        phase: active
    };
}

export function calorieTargetTolerance(target) {
    return Math.max(100, Math.round((Number(target) || 0) * .05));
}

export function isCaloriesInTarget(calories, target) {
    if (!(Number(target) > 0) || !Number.isFinite(Number(calories))) return false;
    return Math.abs(Number(calories) - Number(target)) <= calorieTargetTolerance(target);
}

function daysForRange(count) {
    const log = readJson(FOOD_LOG_KEY, {});
    return Array.from({ length: count }, (_, index) => {
        const date = dateKeyOffset(index - count + 1);
        const entries = Array.isArray(log?.[date]) ? log[date] : [];
        const mealCalories = entries.reduce((totals, entry) => {
            const meal = String(entry?.meal || "Other");
            totals[meal] = (totals[meal] || 0) + Math.max(0, Number(entry?.nutrition?.calories) || 0);
            return totals;
        }, {});
        return { date, logged: entries.length > 0, mealCalories, ...summarize(entries) };
    });
}

function average(days, key) {
    const logged = days.filter(day => day.logged);
    return logged.length ? logged.reduce((sum, day) => sum + day[key], 0) / logged.length : 0;
}

function weightRate(count) {
    const cutoff = new Date(`${dateKeyOffset(-count + 1)}T00:00:00`).getTime();
    const today = new Date(`${localDateKey()}T23:59:59`).getTime();
    const points = (Array.isArray(readJson(WEIGHT_KEY, [])) ? readJson(WEIGHT_KEY, []) : [])
        .map(entry => ({ x: new Date(`${entry.date}T12:00:00`).getTime() / DAY, y: Number(entry.weight) }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x * DAY >= cutoff && point.x * DAY <= today);
    if (points.length < 2) return null;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    if (!denominator) return null;
    return points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator * 7;
}

function formatNumber(value) {
    return Math.round(value).toLocaleString();
}

function bars(days, target) {
    const maximum = Math.max(target || 0, ...days.map(day => day.calories), 1);
    return days.map(day => {
        const height = day.logged ? Math.max(8, Math.min(100, day.calories / maximum * 100)) : 0;
        const status = !day.logged ? "missing" : isCaloriesInTarget(day.calories, target) ? "target" : "outside";
        const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
        const title = day.logged ? `${formatNumber(day.calories)} calories` : "Not logged";
        return `<div class="calorie-stat-bar" title="${title}"><span><i class="${status}" style="height:${height}%"></i></span><small>${label}</small></div>`;
    }).join("");
}

function macroTrend(days, key, target) {
    const recent = days.slice(-7);
    const maximum = Math.max(Number(target) || 0, ...recent.map(day => day[key]), 1);
    return recent.map(day => {
        const height = day.logged ? Math.max(8, Math.min(100, day[key] / maximum * 100)) : 0;
        const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
        return `<span title="${day.logged ? `${formatNumber(day[key])} g` : "Not logged"}"><i style="height:${height}%"></i><small>${label}</small></span>`;
    }).join("");
}

function macroRow(label, key, days, target) {
    const value = average(days, key);
    const percent = target ? Math.round(value / target * 100) : null;
    return `<div class="calorie-stat-macro calorie-stat-macro--${key}"><div class="calorie-stat-macro-copy"><span><strong>${label}</strong><small>${target ? `${formatNumber(target)} g goal` : "No goal set"}</small></span><b>${formatNumber(value)} g <small>avg</small></b><em>${percent === null ? "—" : `${percent}%`}</em></div><div class="calorie-stat-macro-trend" aria-label="Recent ${label.toLowerCase()} trend">${macroTrend(days, key, target)}</div></div>`;
}

function mealBreakdown(days) {
    const totals = days.reduce((result, day) => {
        Object.entries(day.mealCalories || {}).forEach(([meal, calories]) => { result[meal] = (result[meal] || 0) + calories; });
        return result;
    }, {});
    const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const ordered = [...Object.keys(MEAL_COLORS), ...Object.keys(totals).filter(meal => !MEAL_COLORS[meal])]
        .filter((meal, index, meals) => meals.indexOf(meal) === index && totals[meal] > 0);
    if (!grandTotal) return '<p class="calorie-stat-empty">Log food to see where your calories are coming from.</p>';
    const segments = ordered.map(meal => `<i style="width:${totals[meal] / grandTotal * 100}%;--meal-color:${MEAL_COLORS[meal] || MEAL_COLORS.Other}" title="${meal}: ${formatNumber(totals[meal])} calories"></i>`).join("");
    const legend = ordered.map(meal => `<span style="--meal-color:${MEAL_COLORS[meal] || MEAL_COLORS.Other}"><i></i><b>${meal}</b><small>${Math.round(totals[meal] / grandTotal * 100)}% · ${formatNumber(totals[meal])} cal</small></span>`).join("");
    return `<div class="calorie-stat-meal-bar">${segments}</div><div class="calorie-stat-meal-legend">${legend}</div>`;
}

function mealWeekView(days, target) {
    const recent = days.slice(-7);
    const logged = recent.filter(day => day.logged);
    const averageCalories = logged.length ? average(recent, "calories") : 0;
    const maximum = Math.max(Number(target) || 0, averageCalories, ...recent.map(day => day.calories), 1);
    const axisMaximum = Math.max(500, Math.ceil(maximum / 500) * 500);
    const axisTicks = [1, .75, .5, .25, 0]
        .map(position => `<span>${formatNumber(axisMaximum * position)}</span>`)
        .join("");
    const knownMeals = [...Object.keys(MEAL_COLORS), ...recent.flatMap(day => Object.keys(day.mealCalories || {}))]
        .filter((meal, index, meals) => meals.indexOf(meal) === index);
    const dayBars = recent.map(day => {
        const segments = knownMeals.map(meal => {
            const value = Number(day.mealCalories?.[meal]) || 0;
            return value ? `<i style="height:${value / axisMaximum * 100}%;--meal-color:${MEAL_COLORS[meal] || MEAL_COLORS.Other}"></i>` : "";
        }).join("");
        const date = new Date(`${day.date}T12:00:00`);
        return `<div class="calorie-meal-week-column" title="${day.logged ? `${formatNumber(day.calories)} calories` : "Not logged"}"><span>${segments}</span><small>${date.toLocaleDateString(undefined, { weekday: "narrow" })}<b>${date.getDate()}</b></small></div>`;
    }).join("");
    const averageBar = `<div class="calorie-meal-week-column is-average" title="${formatNumber(averageCalories)} average calories"><span><i style="height:${averageCalories / axisMaximum * 100}%"></i></span><small>Avg</small></div>`;
    const weeklyDifference = target > 0 && logged.length === 7 ? recent.reduce((sum, day) => sum + day.calories, 0) - target * 7 : null;
    const differenceLabel = weeklyDifference === null ? "Weekly goal difference" : `Calories ${weeklyDifference > 0 ? "over" : "under"} weekly goal`;
    return `<div class="calorie-meal-week-chart" aria-label="Calories by meal for the last seven days"><div class="calorie-meal-week-axis" aria-hidden="true"><small>cal</small>${axisTicks}</div><div class="calorie-meal-week-plot">${dayBars}${averageBar}</div></div><div class="calorie-meal-week-metrics"><span><small>${differenceLabel}</small><strong>${weeklyDifference === null ? "—" : formatNumber(Math.abs(weeklyDifference))}</strong></span><span><small>Daily average</small><strong>${logged.length ? formatNumber(averageCalories) : "—"}</strong></span><span><small>Daily goal</small><strong>${target > 0 ? formatNumber(target) : "—"}</strong></span></div>${logged.length < 7 ? '<p class="calorie-stat-note">Log all 7 days to compare the full week with your goal.</p>' : ""}`;
}

function phaseInsight(targets, rate, loggedCount) {
    if (loggedCount < 4) return ["More data needed", "Log at least 4 days to create a useful calorie and weight trend."];
    if (rate === null) return ["Calories tracked", "Add at least two weigh-ins in this range to compare intake with your weight trend."];
    const phaseText = String(targets.phase?.type || targets.phase?.goal || targets.phase?.name || "").toLowerCase();
    const cutting = /cut|loss|lose/.test(phaseText);
    const bulking = /bulk|gain|build/.test(phaseText);
    const aligned = cutting ? rate < 0 : bulking ? rate > 0 : Math.abs(rate) < .35;
    if (cutting || bulking) return aligned
        ? ["Phase trend aligned", `Your weight trend is moving ${rate < 0 ? "down" : "up"} at ${Math.abs(rate).toFixed(2)} lb/week. Keep following your current plan.`]
        : ["Watch the trend", `Your weight trend is ${rate > 0 ? "+" : ""}${rate.toFixed(2)} lb/week, which may not match your current phase. Keep logging before changing calories.`];
    return ["Weight trend", `Your current trend is ${rate > 0 ? "+" : ""}${rate.toFixed(2)} lb/week.`];
}

function renderStats(panel) {
    const count = ranges[localStorage.getItem(RANGE_KEY)] || 7;
    const targets = activeTargets();
    const days = daysForRange(count);
    const logged = days.filter(day => day.logged);
    const inTarget = logged.filter(day => isCaloriesInTarget(day.calories, targets.calories)).length;
    const proteinDays = logged.filter(day => targets.protein > 0 && day.protein >= targets.protein).length;
    const avgCalories = average(days, "calories");
    const difference = targets.calories ? avgCalories - targets.calories : null;
    const tolerance = targets.calories ? calorieTargetTolerance(targets.calories) : 0;
    const lower = targets.calories - tolerance;
    const upper = targets.calories + tolerance;
    const rate = weightRate(count);
    const insight = phaseInsight(targets, rate, logged.length);
    const displayDays = count === 7 ? days : days.slice(-14);

    panel.innerHTML = `
        <section class="calorie-stats-page">
            <header><span class="eyebrow">NUTRITION TRENDS</span><h2>Stats</h2><p>See whether your intake is supporting your current goal.</p></header>
            <div class="calorie-stats-ranges" aria-label="Stats date range">
                ${Object.entries({7:"7D",28:"4W",84:"12W"}).map(([value,label]) => `<button type="button" class="${count === Number(value) ? "active" : ""}" data-calorie-stats-range="${value}">${label}</button>`).join("")}
            </div>
            <article class="calorie-stat-card calorie-stat-week">
                <div class="calorie-stat-title"><span><small>AVERAGE CALORIES</small><strong>${logged.length ? formatNumber(avgCalories) : "—"}</strong></span><b>${logged.length} of ${count} days logged</b></div>
                <div class="calorie-stat-bars ${displayDays.length === 7 ? "is-seven" : ""}">${bars(displayDays, targets.calories)}</div>
                <div class="calorie-stat-goal">
                    <span><i class="target"></i>In target</span><span><i class="outside"></i>Outside target</span><b>${difference === null || !logged.length ? "Set a calorie goal" : `${difference > 0 ? "+" : ""}${formatNumber(difference)} average vs goal`}</b>
                </div>
            </article>
            <article class="calorie-stat-card calorie-target-rule">
                <div><small>YOUR TARGET RANGE</small><strong>${targets.calories ? `${formatNumber(lower)}–${formatNumber(upper)} cal` : "No calorie goal set"}</strong></div>
                <p>A day is in target when it is within ±5% of your goal, with a minimum allowance of ±100 calories.</p>
            </article>
            <article class="calorie-stat-card">
                <div class="calorie-stat-section-title"><span><small>CONSISTENCY</small><strong>${inTarget} days in target</strong></span><b>${logged.length ? Math.round(inTarget / logged.length * 100) : 0}%</b></div>
                <div class="calorie-stat-consistency"><span><strong>${logged.length}</strong><small>Days logged</small></span><span><strong>${inTarget}</strong><small>Calories in target</small></span><span><strong>${proteinDays}</strong><small>Protein goal hit</small></span></div>
            </article>
            <article class="calorie-stat-card">
                <div class="calorie-stat-section-title"><span><small>CALORIES BY MEAL</small><strong>Meal breakdown</strong></span><b>${logged.length} logged days</b></div>
                ${mealBreakdown(days)}
                <details class="calorie-meal-week-details">
                    <summary>View last 7 days <span>›</span></summary>
                    ${mealWeekView(daysForRange(7), targets.calories)}
                </details>
            </article>
            <article class="calorie-stat-card">
                <div class="calorie-stat-section-title"><span><small>MACRO AVERAGES</small><strong>Logged days</strong></span></div>
                <div class="calorie-stat-macros">
                    ${macroRow("Protein", "protein", days, targets.protein)}
                    ${macroRow("Carbohydrates", "carbs", days, targets.carbs)}
                    ${macroRow("Fat", "fat", days, targets.fat)}
                </div>
            </article>
            <article class="calorie-stat-card calorie-phase-insight"><small>LEVEL UP INSIGHT</small><strong>${insight[0]}</strong><p>${insight[1]}</p></article>
        </section>`;

    panel.querySelectorAll("[data-calorie-stats-range]").forEach(button => button.addEventListener("click", () => {
        localStorage.setItem(RANGE_KEY, button.dataset.calorieStatsRange);
        renderStats(panel);
    }));
}

function showStats(hub) {
    hub.querySelectorAll("[data-calories-tab]").forEach(button => {
        const active = button.dataset.caloriesTab === "stats";
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    hub.querySelectorAll("[data-calories-panel]").forEach(panel => { panel.hidden = panel.dataset.caloriesPanel !== "stats"; });
    localStorage.setItem(CALORIES_TAB_KEY, "stats");
    const panel = hub.querySelector('[data-calories-panel="stats"]');
    if (panel) renderStats(panel);
}

function enhanceHub(hub) {
    if (hub.dataset.calorieStatsReady) return;
    hub.dataset.calorieStatsReady = "true";
    const tabs = hub.querySelector(".calories-tabs");
    if (!tabs) return;
    tabs.insertAdjacentHTML("beforeend", '<button type="button" role="tab" aria-selected="false" data-calories-tab="stats">Stats</button>');
    hub.insertAdjacentHTML("beforeend", '<div data-calories-panel="stats" hidden></div>');
    const statsButton = hub.querySelector('[data-calories-tab="stats"]');
    statsButton?.addEventListener("click", event => {
        event.stopImmediatePropagation();
        showStats(hub);
    }, true);
    if (localStorage.getItem(CALORIES_TAB_KEY) === "stats") showStats(hub);
}

function findHub() {
    const hub = document.querySelector("[data-calories-hub]");
    if (hub) enhanceHub(hub);
}

new MutationObserver(findHub).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("levelup:food-log-updated", () => {
    const panel = document.querySelector('[data-calories-panel="stats"]:not([hidden])');
    if (panel) renderStats(panel);
});
window.addEventListener("levelup:nutrition-updated", () => {
    const panel = document.querySelector('[data-calories-panel="stats"]:not([hidden])');
    if (panel) renderStats(panel);
});
findHub();
