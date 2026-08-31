import { calculateSevenDayAverage, normalizeWeightEntries } from "../core/weight-trend.js?v=weight-carbs-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const WEIGHT_KEY = "forge_weight_entries";
const RANGE_KEY = "level_up_weight_carbs_range_v1";
const STYLE_ID = "level-up-weight-carbs-styles";
const CARB_COLOR = "#4fa8ff";
const DAILY_WEIGHT_COLOR = "rgba(224, 224, 230, .62)";
const DAILY_WEIGHT_POINT = "rgba(236, 236, 241, .92)";
const TREND_COLOR = "#45cb75";
const RANGE_OPTIONS = [7, 14, 30, 90];
let refreshQueued = false;
let panelObserver = null;
let selectedDate = null;

export function initializeWeightCarbsChart(root = document) {
    const panel = root.querySelector?.("[data-progress-calorie-stats]") || document.querySelector("[data-progress-calorie-stats]");
    if (!panel) return;
    ensureStyles();
    ensureChartCard(panel);
    bindGlobalRefreshes(panel);
    refreshChart(panel);
}

function bindGlobalRefreshes(panel) {
    if (panel.dataset.weightCarbsReady === "1") return;
    panel.dataset.weightCarbsReady = "1";

    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:units-changed", "levelup:nutrition-updated"]
        .forEach(name => window.addEventListener(name, () => scheduleRefresh(panel)));

    document.getElementById("nutrition-progress-tab")?.addEventListener("click", () => {
        window.setTimeout(() => scheduleRefresh(panel), 0);
    });

    panel.addEventListener("click", event => {
        const rangeButton = event.target.closest?.("[data-weight-carbs-range]");
        if (rangeButton) {
            const days = Number(rangeButton.dataset.weightCarbsRange);
            if (RANGE_OPTIONS.includes(days)) {
                localStorage.setItem(RANGE_KEY, String(days));
                selectedDate = null;
                scheduleRefresh(panel);
            }
            return;
        }

        if (event.target.closest?.("[data-calorie-stats-range]")) {
            window.setTimeout(() => {
                ensureChartCard(panel);
                scheduleRefresh(panel);
            }, 20);
            return;
        }

        // A selected day is intentionally temporary. Tapping anywhere outside
        // the actual graph clears the tooltip/crosshair so the chart can be
        // viewed without an overlay obscuring the data.
        if (selectedDate && !event.target.closest?.(".weight-carbs-chart-shell")) {
            clearSelection(panel);
        }
    });

    if (!panelObserver) {
        panelObserver = new MutationObserver(() => {
            if (!panel.isConnected) return;
            if (!panel.querySelector("[data-weight-carbs-card]")) {
                ensureChartCard(panel);
                scheduleRefresh(panel);
            }
        });
        panelObserver.observe(panel, { childList: true });
    }
}

function scheduleRefresh(panel) {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        if (!panel.isConnected) return;
        ensureChartCard(panel);
        refreshChart(panel);
    });
}

function ensureChartCard(panel) {
    if (panel.querySelector("[data-weight-carbs-card]")) return;
    const page = panel.querySelector(".calorie-stats-page");
    if (!page) return;

    const card = document.createElement("article");
    card.className = "calorie-stat-card weight-carbs-card";
    card.dataset.weightCarbsCard = "1";
    card.innerHTML = `
        <div class="weight-carbs-head">
            <div>
                <small>WEIGHT CONTEXT</small>
                <h3>Weight &amp; Carbs</h3>
                <p>See how carbohydrate intake lines up with short-term changes in scale weight.</p>
            </div>
            <details class="weight-carbs-info">
                <summary aria-label="Why carbohydrates can affect scale weight">i</summary>
                <div>
                    <strong>Why carbohydrates can affect scale weight</strong>
                    <p>Stored carbohydrate (glycogen) is associated with body water, so larger changes in carbohydrate intake can temporarily affect scale weight without representing an equivalent change in body fat or muscle.</p>
                    <small>Sodium, hydration, food volume, bowel contents and training-related inflammation can also affect scale weight.</small>
                </div>
            </details>
        </div>
        <div class="calorie-stats-ranges weight-carbs-ranges" role="group" aria-label="Weight and carbohydrates timeframe">
            ${RANGE_OPTIONS.map(days => `<button type="button" data-weight-carbs-range="${days}" aria-pressed="false">${days}D</button>`).join("")}
        </div>
        <div class="weight-carbs-chart-shell">
            <canvas data-weight-carbs-canvas role="img" aria-label="Body weight, seven-day weight trend and daily carbohydrate intake"></canvas>
            <div class="weight-carbs-tooltip" data-weight-carbs-tooltip hidden></div>
        </div>
        <div class="weight-carbs-legend" aria-hidden="true">
            <span><i class="is-weight"></i>Daily weight</span>
            <span><i class="is-trend"></i>7-day trend</span>
            <span><i class="is-carbs"></i>Carbs</span>
        </div>
        <p class="weight-carbs-interaction-note">Tap or drag on the graph for day details. Tap outside the graph to clear them.</p>
        <div class="weight-carbs-empty" data-weight-carbs-empty hidden>
            <strong>More data needed</strong>
            <p>Log your nutrition and body weight consistently to see how carbohydrate intake lines up with scale fluctuations.</p>
        </div>
        <aside class="weight-carbs-insight" data-weight-carbs-insight hidden></aside>
    `;

    const rangeControls = page.querySelector(".calorie-stats-ranges");
    if (rangeControls) rangeControls.insertAdjacentElement("afterend", card);
    else page.prepend(card);
}

function refreshChart(panel) {
    const card = panel.querySelector("[data-weight-carbs-card]");
    const canvas = card?.querySelector("[data-weight-carbs-canvas]");
    if (!card || !canvas) return;

    const days = readRange();
    card.querySelectorAll("[data-weight-carbs-range]").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.weightCarbsRange) === days));
    });

    const allWeights = readWeights();
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const endDate = localDate();
    const startDate = shiftDate(endDate, -(days - 1));
    const series = buildSeries({ startDate, endDate, allWeights, foodLog });
    const available = series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
    const empty = card.querySelector("[data-weight-carbs-empty]");
    const chartShell = card.querySelector(".weight-carbs-chart-shell");
    const legend = card.querySelector(".weight-carbs-legend");

    if (available.length < 2) {
        if (empty) empty.hidden = false;
        if (chartShell) chartShell.hidden = true;
        if (legend) legend.hidden = true;
        updateAnalysis(card, foodLog, series);
        return;
    }

    if (empty) empty.hidden = true;
    if (chartShell) chartShell.hidden = false;
    if (legend) legend.hidden = false;

    if (selectedDate && !available.some(day => day.date === selectedDate)) selectedDate = null;
    drawChart(canvas, series, selectedDate);
    bindCanvasInteraction(canvas, series, panel);
    updateTooltip(card, series, selectedDate);
    updateAnalysis(card, foodLog, series);
}

function buildSeries({ startDate, endDate, allWeights, foodLog }) {
    const weightsByDate = new Map(allWeights.map(entry => [entry.date, entry.weight]));
    return datesBetween(startDate, endDate).map(date => {
        const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const carbs = entries.length
            ? entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.carbs) || 0), 0)
            : null;
        const trendWindow = calculateSevenDayAverage(allWeights, date);
        return {
            date,
            weight: weightsByDate.get(date) ?? null,
            trend: Number.isFinite(trendWindow.average) ? trendWindow.average : null,
            carbs: Number.isFinite(carbs) ? carbs : null,
            carbLogged: entries.length > 0
        };
    });
}

function bindCanvasInteraction(canvas, series, panel) {
    if (canvas.dataset.weightCarbsInteraction === "1") {
        canvas.__weightCarbsSeries = series;
        return;
    }

    canvas.dataset.weightCarbsInteraction = "1";
    canvas.__weightCarbsSeries = series;
    let dragging = false;

    const selectFromPointer = event => {
        const currentSeries = canvas.__weightCarbsSeries || [];
        const available = currentSeries.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
        if (!available.length) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const paddingLeft = 48;
        const paddingRight = 48;
        const chartWidth = Math.max(1, rect.width - paddingLeft - paddingRight);
        const ratio = Math.max(0, Math.min(1, (x - paddingLeft) / chartWidth));
        const targetIndex = Math.round(ratio * Math.max(0, currentSeries.length - 1));

        let nearest = available[0];
        let nearestDistance = Infinity;
        available.forEach(day => {
            const index = currentSeries.findIndex(item => item.date === day.date);
            const distance = Math.abs(index - targetIndex);
            if (distance < nearestDistance) {
                nearest = day;
                nearestDistance = distance;
            }
        });

        selectedDate = nearest.date;
        drawChart(canvas, currentSeries, selectedDate);
        updateTooltip(panel.querySelector("[data-weight-carbs-card]"), currentSeries, selectedDate);
    };

    canvas.addEventListener("pointerdown", event => {
        dragging = true;
        canvas.setPointerCapture?.(event.pointerId);
        selectFromPointer(event);
    });
    canvas.addEventListener("pointermove", event => {
        if (!dragging) return;
        event.preventDefault();
        selectFromPointer(event);
    });

    const stop = event => {
        dragging = false;
        canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
}

function clearSelection(panel) {
    selectedDate = null;
    const card = panel.querySelector("[data-weight-carbs-card]");
    const canvas = card?.querySelector("[data-weight-carbs-canvas]");
    const series = canvas?.__weightCarbsSeries || [];
    if (canvas && series.length) drawChart(canvas, series, null);
    const tooltip = card?.querySelector("[data-weight-carbs-tooltip]");
    if (tooltip) tooltip.hidden = true;
}

function drawChart(canvas, series, activeDate) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 640;
    const height = width <= 430 ? 286 : 310;
    const scale = globalThis.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { left: 48, right: 48, top: 18, bottom: 36 };
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const unit = massUnit();
    const weightValues = series.flatMap(day => [day.weight, day.trend]).filter(Number.isFinite).map(value => displayMass(value));
    const carbValues = series.map(day => day.carbs).filter(Number.isFinite);
    if (!weightValues.length && !carbValues.length) return;

    const weightMinRaw = weightValues.length ? Math.min(...weightValues) : 0;
    const weightMaxRaw = weightValues.length ? Math.max(...weightValues) : 1;
    const weightSpan = Math.max(unit === "kg" ? .45 : 1, weightMaxRaw - weightMinRaw);
    const weightPad = Math.max(unit === "kg" ? .35 : .75, weightSpan * .18);
    const weightMin = weightMinRaw - weightPad;
    const weightMax = weightMaxRaw + weightPad;
    const carbMaxRaw = Math.max(1, ...carbValues);
    const carbMax = Math.max(50, Math.ceil(carbMaxRaw / 50) * 50);
    const xForIndex = index => padding.left + (series.length <= 1 ? chartWidth / 2 : (index / (series.length - 1)) * chartWidth);
    const yWeight = canonical => {
        const display = displayMass(canonical);
        return padding.top + ((weightMax - display) / Math.max(.001, weightMax - weightMin)) * chartHeight;
    };
    const yCarbs = grams => padding.top + chartHeight - (grams / carbMax) * chartHeight;

    context.strokeStyle = "rgba(255,255,255,.065)";
    context.lineWidth = 1;
    context.font = "800 9px Arial";
    context.fillStyle = "#777780";
    context.textBaseline = "middle";
    for (let row = 0; row <= 3; row += 1) {
        const y = padding.top + (chartHeight * row / 3);
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();

        const weightLabel = weightMax - ((weightMax - weightMin) * row / 3);
        const carbLabel = carbMax - (carbMax * row / 3);
        context.textAlign = "right";
        context.fillText(weightLabel.toFixed(1), padding.left - 7, y);
        context.textAlign = "left";
        context.fillText(`${Math.round(carbLabel)}`, width - padding.right + 7, y);
    }

    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("g", width - 5, 12);

    const barSlot = chartWidth / Math.max(1, series.length);
    const barWidth = Math.max(3, Math.min(14, barSlot * .52));
    series.forEach((day, index) => {
        if (!Number.isFinite(day.carbs)) return;
        const x = xForIndex(index);
        const y = yCarbs(day.carbs);
        const selected = Boolean(activeDate) && day.date === activeDate;
        context.globalAlpha = selected ? .92 : .34;
        context.fillStyle = CARB_COLOR;
        roundRect(context, x - barWidth / 2, y, barWidth, padding.top + chartHeight - y, Math.min(4, barWidth / 2));
        context.fill();
    });
    context.globalAlpha = 1;

    drawLine(context, series, "trend", xForIndex, yWeight, TREND_COLOR, 2.4, 3);
    drawLine(context, series, "weight", xForIndex, yWeight, DAILY_WEIGHT_COLOR, 1.35, 2);

    series.forEach((day, index) => {
        if (!Number.isFinite(day.weight)) return;
        const selected = Boolean(activeDate) && day.date === activeDate;
        const x = xForIndex(index);
        const y = yWeight(day.weight);
        context.beginPath();
        context.arc(x, y, selected ? 5 : 2.8, 0, Math.PI * 2);
        context.fillStyle = selected ? "#fff" : DAILY_WEIGHT_POINT;
        context.fill();
        if (selected) {
            context.strokeStyle = TREND_COLOR;
            context.lineWidth = 2;
            context.stroke();
        }
    });

    const selectedIndex = activeDate ? series.findIndex(day => day.date === activeDate) : -1;
    if (selectedIndex >= 0) {
        const x = xForIndex(selectedIndex);
        context.strokeStyle = "rgba(255,255,255,.5)";
        context.lineWidth = 1;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(x, padding.top);
        context.lineTo(x, padding.top + chartHeight);
        context.stroke();
        context.setLineDash([]);
    }

    drawDateLabels(context, series, xForIndex, padding.top + chartHeight + 18);
}

function drawLine(context, series, key, xForIndex, yForWeight, color, lineWidth, maxGapDays) {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineJoin = "round";
    context.lineCap = "round";
    let previousIndex = null;
    context.beginPath();

    series.forEach((day, index) => {
        const value = day[key];
        if (!Number.isFinite(value)) {
            previousIndex = null;
            return;
        }
        const x = xForIndex(index);
        const y = yForWeight(value);
        if (previousIndex === null || index - previousIndex > maxGapDays) context.moveTo(x, y);
        else context.lineTo(x, y);
        previousIndex = index;
    });
    context.stroke();
}

function drawDateLabels(context, series, xForIndex, y) {
    const count = series.length;
    const step = count <= 7 ? 1 : count <= 14 ? 2 : count <= 30 ? 5 : 15;
    context.fillStyle = "#777780";
    context.font = "800 8px Arial";
    context.textAlign = "center";

    series.forEach((day, index) => {
        if (index !== 0 && index !== count - 1 && index % step !== 0) return;
        const date = new Date(`${day.date}T12:00:00`);
        context.fillText(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), xForIndex(index), y);
    });
}

function updateTooltip(card, series, date) {
    const tooltip = card?.querySelector("[data-weight-carbs-tooltip]");
    if (!tooltip) return;
    if (!date) {
        tooltip.hidden = true;
        return;
    }

    const day = series.find(item => item.date === date);
    if (!day) {
        tooltip.hidden = true;
        return;
    }

    const unit = massUnit();
    const weight = Number.isFinite(day.weight) ? displayMass(day.weight) : null;
    const trend = Number.isFinite(day.trend) ? displayMass(day.trend) : null;
    const difference = Number.isFinite(weight) && Number.isFinite(trend) ? weight - trend : null;
    const recentAverage = recentCarbAverage(series, date);
    const carbDifference = Number.isFinite(day.carbs) && Number.isFinite(recentAverage) ? day.carbs - recentAverage : null;

    tooltip.innerHTML = `
        <strong>${formatLongDate(day.date)}</strong>
        <span>${Number.isFinite(weight) ? `${weight.toFixed(1)} ${unit}` : "No weight logged"}</span>
        <span>${Number.isFinite(day.carbs) ? `${Math.round(day.carbs)} g carbs` : "No carbs logged"}</span>
        <span>${Number.isFinite(difference) ? `${formatSigned(difference, 1)} ${unit} vs trend` : "Weight vs trend unavailable"}</span>
        ${Number.isFinite(carbDifference) ? `<small>${formatSigned(carbDifference, 0)} g vs recent average</small>` : ""}
    `;
    tooltip.hidden = false;
    positionTooltip(card, series, date, tooltip);
}

function positionTooltip(card, series, date, tooltip) {
    const shell = card.querySelector(".weight-carbs-chart-shell");
    const canvas = card.querySelector("[data-weight-carbs-canvas]");
    if (!shell || !canvas) return;
    const index = series.findIndex(day => day.date === date);
    const width = canvas.clientWidth || 1;
    const chartWidth = Math.max(1, width - 96);
    const x = 48 + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth);
    const tooltipWidth = Math.min(190, Math.max(150, shell.clientWidth - 24));
    const left = Math.max(8, Math.min(shell.clientWidth - tooltipWidth - 8, x - tooltipWidth / 2));
    tooltip.style.width = `${tooltipWidth}px`;
    tooltip.style.left = `${left}px`;
}

function updateAnalysis(card, foodLog, visibleSeries) {
    const insight = card.querySelector("[data-weight-carbs-insight]");
    if (!insight) return;

    const candidate = [...visibleSeries].reverse().find(day =>
        Number.isFinite(day.weight) && Number.isFinite(day.trend) && Number.isFinite(day.carbs)
    );

    if (!candidate) {
        insight.innerHTML = `
            <span>WEIGHT &amp; CARB ANALYSIS</span>
            <strong>More paired data needed</strong>
            <p>Level Up needs a day with both body weight and carbohydrate intake before it can compare scale fluctuations with carbs.</p>
        `;
        insight.hidden = false;
        return;
    }

    const recentDates = [candidate.date, shiftDate(candidate.date, -1), shiftDate(candidate.date, -2)];
    const recentCarbs = recentDates.map(date => totalCarbs(foodLog, date)).filter(Number.isFinite);
    const baselineDates = [];
    for (let offset = 3; offset <= 10; offset += 1) baselineDates.push(shiftDate(candidate.date, -offset));
    const baselineCarbs = baselineDates.map(date => totalCarbs(foodLog, date)).filter(Number.isFinite);

    const unit = massUnit();
    const weightAboveTrend = candidate.weight - candidate.trend;
    const displayDelta = displayMass(weightAboveTrend);
    const weightDirection = weightAboveTrend > .1
        ? `${formatSigned(displayDelta, 1)} ${unit} above`
        : weightAboveTrend < -.1
            ? `${formatSigned(displayDelta, 1)} ${unit} below`
            : "very close to";

    if (recentCarbs.length < 2 || baselineCarbs.length < 3) {
        insight.innerHTML = `
            <span>WEIGHT &amp; CARB ANALYSIS</span>
            <strong>Building a clearer pattern</strong>
            <p>Your latest paired reading has scale weight ${weightDirection} its 7-day trend. More consistently logged carb days are needed before Level Up can judge whether carbohydrate changes line up with that fluctuation.</p>
            <small>${recentCarbs.length}/2 recent carb days and ${baselineCarbs.length}/3 baseline carb days available.</small>
        `;
        insight.hidden = false;
        return;
    }

    const recentAverage = mean(recentCarbs);
    const baselineAverage = mean(baselineCarbs);
    const carbChange = recentAverage - baselineAverage;
    const highThreshold = Math.max(35, baselineAverage * .15);
    const lowThreshold = -highThreshold;
    const weightThreshold = Math.max(.5, candidate.trend * .003);
    const carbsHigh = carbChange >= highThreshold;
    const carbsLow = carbChange <= lowThreshold;
    const weightElevated = weightAboveTrend >= weightThreshold;
    const weightDepressed = weightAboveTrend <= -weightThreshold;
    const carbCopy = `${Math.abs(Math.round(carbChange))} g/day ${carbChange >= 0 ? "above" : "below"} your recent baseline`;

    let title = "No strong carb-related fluctuation";
    let body = `Recent carbohydrate intake is ${carbCopy}, while scale weight is ${weightDirection} its 7-day trend. There is not a strong pattern here suggesting that carbs are driving the current scale movement.`;

    if (carbsHigh && weightElevated) {
        title = "Possible water retention";
        body = `Recent carbohydrate intake is ${carbCopy}, and scale weight is ${weightDirection} its 7-day trend. This pattern is consistent with a temporary scale fluctuation that may reflect glycogen and associated water rather than an equivalent change in body tissue.`;
    } else if (carbsHigh && !weightElevated) {
        title = "Higher carbs, weight near trend";
        body = `Recent carbohydrate intake is ${carbCopy}, but scale weight is ${weightDirection} its 7-day trend. Higher carbs have not coincided with a clear upward scale deviation in the current data.`;
    } else if (!carbsHigh && weightElevated) {
        title = "Weight elevated without a clear carb signal";
        body = `Scale weight is ${weightDirection} its 7-day trend, but carbohydrate intake is not meaningfully above its recent baseline. The fluctuation could reflect sodium, hydration, food volume, training-related inflammation or normal day-to-day variation rather than carbs alone.`;
    } else if (carbsLow && weightDepressed) {
        title = "Lower carbs and lower scale weight";
        body = `Recent carbohydrate intake is ${carbCopy}, while scale weight is ${weightDirection} its 7-day trend. Lower glycogen and associated water could be one contributor, but this cannot identify a specific amount of water weight.`;
    } else if (carbsLow) {
        title = "Carbs below recent baseline";
        body = `Recent carbohydrate intake is ${carbCopy}, while scale weight is ${weightDirection} its 7-day trend. There is no clear short-term weight response that can confidently be linked to the lower carbohydrate intake.`;
    }

    insight.innerHTML = `
        <span>WEIGHT &amp; CARB ANALYSIS · ${formatLongDate(candidate.date).toUpperCase()}</span>
        <strong>${title}</strong>
        <p>${body}</p>
        <small>Recent carbs: ${Math.round(recentAverage)} g/day · Prior baseline: ${Math.round(baselineAverage)} g/day. This is context, not a diagnosis; sodium, hydration, food volume, bowel contents and training can also affect scale weight.</small>
    `;
    insight.hidden = false;
}

function recentCarbAverage(series, selectedDate) {
    const index = series.findIndex(day => day.date === selectedDate);
    if (index <= 0) return null;
    const prior = series.slice(Math.max(0, index - 7), index).map(day => day.carbs).filter(Number.isFinite);
    return prior.length >= 2 ? mean(prior) : null;
}

function readRange() {
    const saved = Number(localStorage.getItem(RANGE_KEY));
    return RANGE_OPTIONS.includes(saved) ? saved : 14;
}

function readWeights() {
    return normalizeWeightEntries(readJson(WEIGHT_KEY, []));
}

function totalCarbs(foodLog, date) {
    const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
    if (!entries.length) return null;
    return entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.carbs) || 0), 0);
}

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function datesBetween(startDate, endDate) {
    const dates = [];
    let cursor = startDate;
    while (cursor && cursor <= endDate) {
        dates.push(cursor);
        cursor = shiftDate(cursor, 1);
    }
    return dates;
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return null;
    date.setDate(date.getDate() + Number(days || 0));
    return localDate(date);
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLongDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSigned(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(digits)}`;
}

function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function roundRect(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .weight-carbs-card{display:grid;gap:13px}
        .weight-carbs-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .weight-carbs-head>div{display:grid;gap:4px;min-width:0}.weight-carbs-head h3{margin:0;font-size:20px}.weight-carbs-head p{margin:0;color:#9898a3;font-size:11px;line-height:1.45}.weight-carbs-head>div>small{color:#8f8f99;font-size:9px;font-weight:900;letter-spacing:.09em}
        .weight-carbs-info{position:relative;flex:0 0 auto}.weight-carbs-info summary{display:grid;place-items:center;width:30px;height:30px;border:1px solid #3b3b42;border-radius:50%;background:#242429;color:#c6c6cd;font-size:13px;font-weight:900;cursor:pointer;list-style:none}.weight-carbs-info summary::-webkit-details-marker{display:none}.weight-carbs-info>div{position:absolute;z-index:8;top:36px;right:0;width:min(300px,calc(100vw - 52px));padding:12px;border:1px solid #3a3a41;border-radius:14px;background:#202024;box-shadow:0 14px 36px rgba(0,0,0,.5)}.weight-carbs-info strong{font-size:12px}.weight-carbs-info p{margin:6px 0;color:#a1a1aa;font-size:10px;line-height:1.45}.weight-carbs-info small{display:block;color:#85858e;font-size:9px;line-height:1.4;letter-spacing:0}
        .weight-carbs-ranges{grid-template-columns:repeat(4,1fr);margin:0}.weight-carbs-ranges button[aria-pressed="true"]{background:#302024;color:#ff5360}
        .weight-carbs-chart-shell{position:relative;min-height:286px;border-top:1px solid #303036;border-bottom:1px solid #303036}.weight-carbs-chart-shell canvas{display:block;width:100%;height:286px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
        .weight-carbs-tooltip{position:absolute;z-index:4;top:12px;display:grid;gap:3px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(24,24,28,.94);box-shadow:0 10px 28px rgba(0,0,0,.4);pointer-events:none}.weight-carbs-tooltip strong{font-size:11px}.weight-carbs-tooltip span{color:#d2d2d7;font-size:10px}.weight-carbs-tooltip small{color:#8f8f99;font-size:8px;letter-spacing:0}
        .weight-carbs-legend{display:flex;flex-wrap:wrap;gap:8px 13px;color:#92929c;font-size:9px;font-weight:800}.weight-carbs-legend span{display:flex;align-items:center;gap:5px}.weight-carbs-legend i{display:block;width:13px;height:3px;border-radius:999px}.weight-carbs-legend .is-weight{background:${DAILY_WEIGHT_POINT}}.weight-carbs-legend .is-trend{background:${TREND_COLOR}}.weight-carbs-legend .is-carbs{height:8px;border-radius:3px;background:${CARB_COLOR}}
        .weight-carbs-interaction-note{margin:-5px 0 0;color:#777780;font-size:8.5px;line-height:1.35}
        .weight-carbs-empty{padding:15px;border:1px dashed #3a3a42;border-radius:14px;background:#1b1b1f}.weight-carbs-empty strong{font-size:14px}.weight-carbs-empty p{margin:5px 0 0;color:#9696a0;font-size:11px;line-height:1.45}
        .weight-carbs-insight{display:grid;gap:5px;padding:13px 14px;border:1px solid rgba(79,168,255,.22);border-radius:15px;background:rgba(79,168,255,.055)}.weight-carbs-insight>span{color:${CARB_COLOR};font-size:8px;font-weight:900;letter-spacing:.1em}.weight-carbs-insight strong{font-size:15px}.weight-carbs-insight p{margin:0;color:#b2b2ba;font-size:10.5px;line-height:1.5}.weight-carbs-insight small{color:#85858e;font-size:9px;line-height:1.45;letter-spacing:0}
        @media(max-width:390px){.weight-carbs-card{padding:14px}.weight-carbs-head h3{font-size:18px}.weight-carbs-chart-shell,.weight-carbs-chart-shell canvas{min-height:272px;height:272px}.weight-carbs-tooltip{top:8px}.weight-carbs-ranges button{min-height:34px;font-size:10px}}
    `;
    document.head.appendChild(style);
}
