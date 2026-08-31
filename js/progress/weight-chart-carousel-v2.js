import { normalizeWeightEntries } from "../core/weight-trend.js?v=weight-carousel-v2";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const SHARED_RANGE_KEY = "level_up_weight_chart_range";
const STYLE_ID = "level-up-weight-chart-carousel-v2-styles";
const DAY_MS = 86400000;
const CARB_COLOR = "#4fa8ff";
const TREND_GREEN = "#45cb75";
const TREND_GREEN_GLOW = "rgba(69, 203, 117, 0.32)";
const DAILY_WEIGHT_LINE = "rgba(112, 181, 137, 0.34)";
const DAILY_WEIGHT_POINT = "rgba(126, 194, 151, 0.82)";
const RANGE_OPTIONS = {
    "1w": { days: 7, label: "1W" },
    "1m": { days: 30, label: "1M" },
    "3m": { days: 90, label: "3M" },
    "6m": { days: 180, label: "6M" },
    phase: { label: "PHASE" },
    all: { label: "ALL" }
};

let selectedDate = null;
let refreshQueued = false;
let observer = null;
let documentDismissBound = false;

export function initializeWeightCarbsChartV2(root = document) {
    const weightProgress = root.querySelector?.("#weight-progress") || document.querySelector("#weight-progress");
    const card = weightProgress?.querySelector(".weight-chart-card");
    if (!weightProgress || !card) return;

    ensureStyles();
    ensureCarousel(card);
    bindRefreshes(card);
    scheduleRefresh(card);
}

function ensureCarousel(card) {
    if (card.dataset.weightGraphCarouselV2 !== "1") {
        const existingTrack = card.querySelector("[data-weight-graph-carousel-track]");
        const existingPager = card.querySelector(".weight-graph-carousel-pager");
        if (existingTrack) {
            const trendSlide = existingTrack.querySelector('[data-weight-graph-slide="trend"]');
            const carbsSlide = existingTrack.querySelector('[data-weight-graph-slide="carbs"]');
            const rangeControl = card.querySelector(".weight-chart-range-control") || trendSlide?.querySelector(".weight-chart-range-control");
            if (rangeControl) card.insertBefore(rangeControl, existingTrack);
            carbsSlide?.remove();
            if (trendSlide) [...trendSlide.children].forEach(child => card.insertBefore(child, existingTrack));
            existingTrack.remove();
            existingPager?.remove();
            delete card.dataset.weightGraphCarousel;
        }

        const rangeControl = card.querySelector(".weight-chart-range-control");
        const contentChildren = [...card.children].filter(child => child !== rangeControl);
        const track = document.createElement("div");
        track.className = "weight-graph-carousel-track-v2";
        track.dataset.weightGraphCarouselTrackV2 = "1";
        track.setAttribute("aria-label", "Weight graph views");

        const trendSlide = document.createElement("section");
        trendSlide.className = "weight-graph-carousel-slide-v2 is-trend";
        trendSlide.dataset.weightGraphSlideV2 = "trend";
        contentChildren.forEach(child => trendSlide.appendChild(child));

        const carbsSlide = document.createElement("section");
        carbsSlide.className = "weight-graph-carousel-slide-v2 is-carbs";
        carbsSlide.dataset.weightGraphSlideV2 = "carbs";
        carbsSlide.innerHTML = renderCarbSlide();

        track.append(trendSlide, carbsSlide);
        card.appendChild(track);

        const pager = document.createElement("div");
        pager.className = "weight-graph-carousel-pager-v2";
        pager.setAttribute("role", "group");
        pager.setAttribute("aria-label", "Weight graph view");
        pager.innerHTML = `
            <button type="button" data-weight-graph-page-v2="0" aria-pressed="true">Weight</button>
            <button type="button" data-weight-graph-page-v2="1" aria-pressed="false">Weight + Carbs</button>
        `;
        card.appendChild(pager);

        pager.addEventListener("click", event => {
            const button = event.target.closest?.("[data-weight-graph-page-v2]");
            if (!button) return;
            const index = Number(button.dataset.weightGraphPageV2);
            track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
        });

        track.addEventListener("scroll", () => requestAnimationFrame(() => syncPager(card)), { passive: true });
        card.dataset.weightGraphCarouselV2 = "1";
    }

    syncRangeControl(card);
    if (!observer) {
        observer = new MutationObserver(() => {
            if (card.isConnected) syncRangeControl(card);
        });
        observer.observe(card, { childList: true, subtree: true });
    }
}

function renderCarbSlide() {
    return `
        <div class="weight-carbs-head-v2">
            <div>
                <span class="weight-chart-kicker">WEIGHT CONTEXT</span>
                <h3>Weight &amp; Carbs</h3>
                <p>Same 7-day weight trend · carbohydrate intake</p>
            </div>
            <details class="weight-carbs-info-v2">
                <summary aria-label="Why carbohydrates can affect scale weight">i</summary>
                <div>
                    <strong>Why carbohydrates can affect scale weight</strong>
                    <p>Stored carbohydrate (glycogen) is associated with body water. Higher or lower carbohydrate intake can temporarily affect scale weight without representing an equivalent tissue change.</p>
                    <small>Sodium, hydration, food volume, bowel contents and training-related inflammation can also affect scale weight.</small>
                </div>
            </details>
        </div>
        <div class="weight-carbs-chart-shell-v2">
            <canvas data-weight-carbs-canvas-v2 role="img" aria-label="Body weight, the same seven-day weight trend, and daily carbohydrate intake"></canvas>
            <div class="weight-carbs-tooltip-v2" data-weight-carbs-tooltip-v2 hidden></div>
        </div>
        <div class="weight-carbs-legend-v2" aria-hidden="true">
            <span><i class="is-weight"></i>Daily weight</span>
            <span><i class="is-trend"></i>7-day trend</span>
            <span><i class="is-carbs"></i>Carbs</span>
        </div>
        <p class="weight-carbs-interaction-note-v2">Tap or drag for day details. Tap anywhere outside the summary to close it.</p>
        <div class="weight-carbs-empty-v2" data-weight-carbs-empty-v2 hidden>
            <strong>More data needed</strong>
            <p>Log nutrition and body weight consistently to compare carbohydrate intake with scale fluctuations.</p>
        </div>
        <aside class="weight-carbs-analysis-v2" data-weight-carbs-analysis-v2></aside>
    `;
}

function syncRangeControl(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    const trendSlide = card.querySelector('[data-weight-graph-slide-v2="trend"]');
    const control = card.querySelector(".weight-chart-range-control") || trendSlide?.querySelector(".weight-chart-range-control");
    if (track && control && (control.parentElement !== card || control.nextElementSibling !== track)) card.insertBefore(control, track);
}

function syncPager(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    if (!track) return;
    const index = Math.max(0, Math.min(1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    card.querySelectorAll("[data-weight-graph-page-v2]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.weightGraphPageV2) === index)));
    if (index === 1) scheduleRefresh(card);
}

function bindRefreshes(card) {
    if (card.dataset.weightCarbsV2Bound === "1") return;
    card.dataset.weightCarbsV2Bound = "1";
    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:units-changed", "levelup:nutrition-updated", "levelup:nutrition-phase-updated"].forEach(name => window.addEventListener(name, () => scheduleRefresh(card)));
    document.addEventListener("click", event => {
        if (event.target.closest?.("button[data-weight-chart-range]")) {
            selectedDate = null;
            setTimeout(() => scheduleRefresh(card), 0);
        }
        if (event.target.closest?.("#weight-tab, #save-weight-btn, .remove-weight-entry")) setTimeout(() => scheduleRefresh(card), 0);
    });
    window.addEventListener("resize", () => scheduleRefresh(card));

    if (!documentDismissBound) {
        documentDismissBound = true;
        document.addEventListener("pointerdown", event => {
            if (!selectedDate) return;
            const shell = document.querySelector("#weight-progress .weight-carbs-chart-shell-v2");
            if (shell?.contains(event.target)) return;
            clearSelection(card);
        }, true);
    }
}

function scheduleRefresh(card) {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        if (!card.isConnected) return;
        ensureCarousel(card);
        refreshCarbSlide(card);
    });
}

function refreshCarbSlide(card) {
    const canvas = card.querySelector("[data-weight-carbs-canvas-v2]");
    if (!canvas) return;
    const state = buildState();
    const available = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
    const shell = card.querySelector(".weight-carbs-chart-shell-v2");
    const legend = card.querySelector(".weight-carbs-legend-v2");
    const empty = card.querySelector("[data-weight-carbs-empty-v2]");
    canvas.__weightCarbsV2State = state;

    if (available.length < 2) {
        if (shell) shell.hidden = true;
        if (legend) legend.hidden = true;
        if (empty) empty.hidden = false;
        hideTooltip(card);
        updateAnalysis(card, state);
        return;
    }

    if (shell) shell.hidden = false;
    if (legend) legend.hidden = false;
    if (empty) empty.hidden = true;
    if (selectedDate && !available.some(day => day.date === selectedDate)) selectedDate = null;
    drawChart(canvas, state, selectedDate);
    bindCanvasInteraction(canvas, card);
    updateTooltip(card, state, selectedDate);
    updateAnalysis(card, state);
}

function buildState() {
    const weights = readWeights();
    const phase = readActivePhase();
    const range = readSharedRange(phase);
    const chartWindow = getSharedWindow(range, weights, phase);
    const movingAverage = calculateMovingAverage(weights).filter(entry => entry.date >= chartWindow.startDate && entry.date <= chartWindow.endDate);
    const weightsByDate = new Map(weights.map(entry => [entry.date, entry.weight]));
    const trendByDate = new Map(movingAverage.map(entry => [entry.date, entry.weight]));
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const series = datesBetween(chartWindow.startDate, chartWindow.endDate).map(date => {
        const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const carbs = entries.length ? entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.carbs) || 0), 0) : null;
        return { date, weight: weightsByDate.get(date) ?? null, trend: trendByDate.get(date) ?? null, carbs: Number.isFinite(carbs) ? carbs : null };
    });
    return { weights, movingAverage, series, chartWindow, range, foodLog };
}

function calculateMovingAverage(entries) {
    return entries.map(entry => {
        const currentTime = dateMs(entry.date);
        const windowStart = currentTime - (6 * DAY_MS);
        const windowEntries = entries.filter(item => {
            const itemTime = dateMs(item.date);
            return itemTime >= windowStart && itemTime <= currentTime;
        });
        const average = windowEntries.reduce((sum, item) => sum + item.weight, 0) / windowEntries.length;
        return { date: entry.date, weight: average };
    });
}

function bindCanvasInteraction(canvas, card) {
    if (canvas.dataset.weightCarbsV2Interaction === "1") return;
    canvas.dataset.weightCarbsV2Interaction = "1";
    let dragging = false;

    const selectFromPointer = event => {
        const state = canvas.__weightCarbsV2State || buildState();
        const available = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
        if (!available.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const chartWidth = Math.max(1, rect.width - 96);
        const ratio = Math.max(0, Math.min(1, (x - 48) / chartWidth));
        const targetTime = dateMs(state.chartWindow.startDate) + ratio * Math.max(1, dateMs(state.chartWindow.endDate) - dateMs(state.chartWindow.startDate));
        let nearest = available[0];
        let nearestDistance = Infinity;
        available.forEach(day => {
            const distance = Math.abs(dateMs(day.date) - targetTime);
            if (distance < nearestDistance) {
                nearest = day;
                nearestDistance = distance;
            }
        });
        selectedDate = nearest.date;
        drawChart(canvas, state, selectedDate);
        updateTooltip(card, state, selectedDate);
    };

    const shell = card.querySelector(".weight-carbs-chart-shell-v2");
    shell?.addEventListener("pointerdown", event => {
        const tooltip = card.querySelector("[data-weight-carbs-tooltip-v2]");
        if (!selectedDate || !tooltip || tooltip.hidden) return;
        const rect = tooltip.getBoundingClientRect();
        const insideTooltip = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (insideTooltip) {
            event.stopImmediatePropagation();
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        clearSelection(card);
    }, true);

    canvas.addEventListener("pointerdown", event => {
        if (selectedDate) return;
        dragging = true;
        canvas.setPointerCapture?.(event.pointerId);
        selectFromPointer(event);
    });
    canvas.addEventListener("pointermove", event => {
        if (!dragging || selectedDate === null) return;
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

function clearSelection(card) {
    selectedDate = null;
    const canvas = card.querySelector("[data-weight-carbs-canvas-v2]");
    const state = canvas?.__weightCarbsV2State || buildState();
    if (canvas) drawChart(canvas, state, null);
    hideTooltip(card);
}

function drawChart(canvas, state, activeDate) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const { series, movingAverage, chartWindow, range } = state;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const height = width <= 520 ? 330 : 380;
    const scale = globalThis.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { left: 48, right: 48, top: 20, bottom: 40 };
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const unit = massUnit();
    const weightValues = [...series.map(day => day.weight), ...movingAverage.map(day => day.weight)].filter(Number.isFinite).map(value => displayMass(value));
    const carbValues = series.map(day => day.carbs).filter(Number.isFinite);
    if (!weightValues.length && !carbValues.length) return;

    const weightMinRaw = weightValues.length ? Math.min(...weightValues) : 0;
    const weightMaxRaw = weightValues.length ? Math.max(...weightValues) : 1;
    const span = Math.max(unit === "kg" ? .45 : 1, weightMaxRaw - weightMinRaw);
    const weightPadding = Math.max(unit === "kg" ? .35 : .75, span * .18);
    const minimum = weightMinRaw - weightPadding;
    const maximum = weightMaxRaw + weightPadding;
    const carbMax = Math.max(50, Math.ceil(Math.max(1, ...carbValues) / 50) * 50);
    const firstTime = dateMs(chartWindow.startDate);
    const lastTime = dateMs(chartWindow.endDate);
    const elapsed = Math.max(1, lastTime - firstTime);
    const xPosition = date => padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth;
    const yPosition = weight => {
        const value = displayMass(weight);
        return padding.top + ((maximum - value) / Math.max(.001, maximum - minimum)) * chartHeight;
    };
    const yCarbs = grams => padding.top + chartHeight - (grams / carbMax) * chartHeight;

    context.strokeStyle = "rgba(255,255,255,.055)";
    context.lineWidth = 1;
    context.fillStyle = "#777780";
    context.font = "800 9px Arial";
    context.textBaseline = "middle";
    for (let row = 0; row <= 2; row += 1) {
        const y = padding.top + chartHeight * row / 2;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.textAlign = "right";
        context.fillText((maximum - (maximum - minimum) * row / 2).toFixed(1), padding.left - 7, y);
        context.textAlign = "left";
        context.fillText(String(Math.round(carbMax - carbMax * row / 2)), width - padding.right + 7, y);
    }
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("g", width - 5, 12);

    const barWidth = Math.max(2, Math.min(14, chartWidth / Math.max(1, series.length) * .52));
    series.forEach(day => {
        if (!Number.isFinite(day.carbs)) return;
        const x = xPosition(day.date);
        const y = yCarbs(day.carbs);
        context.globalAlpha = activeDate === day.date ? .92 : .32;
        context.fillStyle = CARB_COLOR;
        roundRect(context, x - barWidth / 2, y, barWidth, padding.top + chartHeight - y, Math.min(4, barWidth / 2));
        context.fill();
    });
    context.globalAlpha = 1;

    const weightPoints = series.filter(day => Number.isFinite(day.weight));
    if (weightPoints.length) {
        context.save();
        context.strokeStyle = DAILY_WEIGHT_LINE;
        context.lineWidth = 1.5;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        weightPoints.forEach((entry, index) => {
            const x = xPosition(entry.date);
            const y = yPosition(entry.weight);
            if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
        context.restore();
    }

    const trendPoints = movingAverage.map(entry => ({ x: xPosition(entry.date), y: yPosition(entry.weight) }));
    if (trendPoints.length) {
        if (trendPoints.length > 1) {
            const gradient = context.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
            gradient.addColorStop(0, "rgba(69, 203, 117, 0.25)");
            gradient.addColorStop(0.56, "rgba(36, 112, 66, 0.12)");
            gradient.addColorStop(1, "rgba(18, 63, 39, 0)");
            context.save();
            context.beginPath();
            traceSmoothLine(context, trendPoints);
            context.lineTo(trendPoints.at(-1).x, padding.top + chartHeight);
            context.lineTo(trendPoints[0].x, padding.top + chartHeight);
            context.closePath();
            context.fillStyle = gradient;
            context.fill();
            context.restore();
        }
        context.save();
        context.strokeStyle = TREND_GREEN;
        context.shadowColor = TREND_GREEN_GLOW;
        context.shadowBlur = 8;
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        traceSmoothLine(context, trendPoints);
        context.stroke();
        context.restore();
    }

    weightPoints.forEach(entry => {
        const selected = activeDate === entry.date;
        context.beginPath();
        context.arc(xPosition(entry.date), yPosition(entry.weight), selected ? 5 : 2.6, 0, Math.PI * 2);
        context.fillStyle = selected ? "#fff" : DAILY_WEIGHT_POINT;
        context.fill();
        if (selected) {
            context.strokeStyle = TREND_GREEN;
            context.lineWidth = 2;
            context.stroke();
        }
    });

    if (activeDate) {
        const x = xPosition(activeDate);
        context.strokeStyle = "rgba(255,255,255,.5)";
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(x, padding.top);
        context.lineTo(x, padding.top + chartHeight);
        context.stroke();
        context.setLineDash([]);
    }
    drawDateLabels(context, series, xPosition, padding.top + chartHeight + 20, range);
}

function traceSmoothLine(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    if (points.length === 1) return;
    for (let index = 1; index < points.length - 1; index++) {
        const current = points[index];
        const next = points[index + 1];
        const midpointX = (current.x + next.x) / 2;
        const midpointY = (current.y + next.y) / 2;
        context.quadraticCurveTo(current.x, current.y, midpointX, midpointY);
    }
    context.lineTo(points.at(-1).x, points.at(-1).y);
}

function updateTooltip(card, state, date) {
    const tooltip = card.querySelector("[data-weight-carbs-tooltip-v2]");
    if (!tooltip) return;
    if (!date) { tooltip.hidden = true; return; }
    const day = state.series.find(item => item.date === date);
    if (!day) { tooltip.hidden = true; return; }
    const unit = massUnit();
    const weight = Number.isFinite(day.weight) ? displayMass(day.weight) : null;
    const trend = Number.isFinite(day.trend) ? displayMass(day.trend) : null;
    const difference = Number.isFinite(weight) && Number.isFinite(trend) ? weight - trend : null;
    const recentAverage = recentCarbAverage(state.series, date);
    const carbDifference = Number.isFinite(day.carbs) && Number.isFinite(recentAverage) ? day.carbs - recentAverage : null;
    tooltip.innerHTML = `<strong>${formatDate(date)}</strong><span>${Number.isFinite(weight) ? `${weight.toFixed(1)} ${unit}` : "No weight logged"}</span><span>${Number.isFinite(day.carbs) ? `${Math.round(day.carbs)} g carbs` : "No carbs logged"}</span><span>${Number.isFinite(difference) ? `${formatSigned(difference, 1)} ${unit} vs trend` : "Weight vs trend unavailable"}</span>${Number.isFinite(carbDifference) ? `<small>${formatSigned(carbDifference, 0)} g vs recent average</small>` : ""}`;
    tooltip.hidden = false;
    positionTooltip(card, state, date, tooltip);
}

function positionTooltip(card, state, date, tooltip) {
    const shell = card.querySelector(".weight-carbs-chart-shell-v2");
    if (!shell) return;
    const firstTime = dateMs(state.chartWindow.startDate);
    const elapsed = Math.max(1, dateMs(state.chartWindow.endDate) - firstTime);
    const x = 48 + ((dateMs(date) - firstTime) / elapsed) * Math.max(1, shell.clientWidth - 96);
    const tooltipWidth = Math.min(190, Math.max(150, shell.clientWidth - 24));
    tooltip.style.width = `${tooltipWidth}px`;
    tooltip.style.left = `${Math.max(8, Math.min(shell.clientWidth - tooltipWidth - 8, x - tooltipWidth / 2))}px`;
}

function hideTooltip(card) {
    const tooltip = card.querySelector("[data-weight-carbs-tooltip-v2]");
    if (tooltip) tooltip.hidden = true;
}

function updateAnalysis(card, state) {
    const insight = card.querySelector("[data-weight-carbs-analysis-v2]");
    if (!insight) return;
    const paired = state.series.filter(day => Number.isFinite(day.weight) && Number.isFinite(day.trend) && Number.isFinite(day.carbs));
    const candidate = paired.at(-1) || null;
    if (!candidate) {
        renderAnalysis(insight, "Building a clearer pattern", "More paired data needed", "Log body weight and nutrition on overlapping days. Level Up will compare carbohydrate intake with short-term scale movement as the overlap grows.", "This is explanatory only and does not alter your calorie target.");
        return;
    }
    const recentDates = [candidate.date, shiftDate(candidate.date, -1), shiftDate(candidate.date, -2)];
    const recentCarbs = recentDates.map(date => totalCarbs(state.foodLog, date)).filter(Number.isFinite);
    const baselineDates = [];
    for (let offset = 3; offset <= 10; offset += 1) baselineDates.push(shiftDate(candidate.date, -offset));
    const baselineCarbs = baselineDates.map(date => totalCarbs(state.foodLog, date)).filter(Number.isFinite);
    const unit = massUnit();
    const displayDelta = displayMass(candidate.weight - candidate.trend);
    const positionText = Number.isFinite(displayDelta) ? `${formatSigned(displayDelta, 1)} ${unit} versus the 7-day trend` : "weight trend comparison unavailable";
    if (recentCarbs.length < 2 || baselineCarbs.length < 3) {
        renderAnalysis(insight, "Building a clearer pattern", "More carb history needed", `Your latest paired day is ${positionText}. A few more completed nutrition days are needed before comparing recent carbohydrate intake with a stable baseline.`, "Scale changes can also reflect sodium, hydration, food volume, bowel contents and training-related inflammation.");
        return;
    }
    const recentAverage = mean(recentCarbs);
    const baselineAverage = mean(baselineCarbs);
    const carbChange = recentAverage - baselineAverage;
    const weightDelta = candidate.weight - candidate.trend;
    const threshold = Math.max(35, baselineAverage * .15);
    const elevatedThreshold = Math.max(.5, candidate.trend * .003);
    const carbsHigh = carbChange >= threshold;
    const carbsLow = carbChange <= -threshold;
    const weightHigh = weightDelta >= elevatedThreshold;
    const weightLow = weightDelta <= -elevatedThreshold;
    if (carbsHigh && weightHigh) return renderAnalysis(insight, "Possible water retention", "Higher carbs + higher scale weight", `Recent carbohydrate intake is about ${Math.round(carbChange)} g/day above your prior baseline, while scale weight is ${positionText}. This pattern may reflect glycogen and associated water and is consistent with a temporary scale fluctuation rather than an equivalent tissue change.`, "Other contributors can include sodium, hydration, food volume and training-related inflammation.");
    if (carbsHigh && !weightHigh) return renderAnalysis(insight, "Higher carbs, weight near trend", "Carbs are up without a clear weight spike", `Recent carbohydrate intake is about ${Math.round(carbChange)} g/day above baseline, but scale weight remains ${positionText}. There is not a strong carb-related weight fluctuation signal right now.`, "A higher-carb period does not always produce a visible scale increase.");
    if (!carbsHigh && weightHigh) return renderAnalysis(insight, "Weight elevated without a clear carb signal", "Look beyond carbohydrates", `Scale weight is ${positionText}, while recent carbohydrate intake is only ${formatSigned(carbChange, 0)} g/day versus baseline. Carbohydrates do not clearly explain this fluctuation.`, "Sodium, hydration, food volume, bowel contents and training-related inflammation may also influence short-term scale weight.");
    if (carbsLow && weightLow) return renderAnalysis(insight, "Lower carbs and lower scale weight", "A compatible short-term pattern", `Recent carbohydrate intake is about ${Math.abs(Math.round(carbChange))} g/day below baseline and scale weight is ${positionText}. Lower glycogen-associated water could contribute, but the graph cannot determine the cause with certainty.`, "Continue watching the longer-term trend rather than interpreting a single day in isolation.");
    renderAnalysis(insight, "No strong carb-related fluctuation", "Weight and carbs are broadly stable", `Recent carbohydrate intake is ${formatSigned(carbChange, 0)} g/day versus baseline and scale weight is ${positionText}. The current data does not show a strong carb-linked scale fluctuation.`, "The 7-day trend remains the better guide for longer-term progress.");
}

function renderAnalysis(node, title, subtitle, body, footnote) { node.innerHTML = `<span>WEIGHT &amp; CARB ANALYSIS</span><strong>${title}</strong><b>${subtitle}</b><p>${body}</p><small>${footnote}</small>`; }
function drawDateLabels(context, series, xPosition, y, range) {
    const desiredLabels = range === "1w" ? 7 : 6;
    const step = Math.max(1, Math.ceil(series.length / desiredLabels));
    context.fillStyle = "#777780";
    context.font = "800 8px Arial";
    context.textAlign = "center";
    series.forEach((day, index) => {
        if (index !== 0 && index !== series.length - 1 && index % step !== 0) return;
        const date = new Date(`${day.date}T12:00:00`);
        context.fillText(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), xPosition(day.date), y);
    });
}
function readWeights() { return normalizeWeightEntries(readJson(WEIGHT_KEY, [])); }
function readActivePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null : null;
}
function readSharedRange(activePhase) {
    const saved = String(localStorage.getItem(SHARED_RANGE_KEY) || "3m").toLowerCase();
    if (!RANGE_OPTIONS[saved]) return "3m";
    if (saved === "phase" && !activePhase?.startDate) return "3m";
    return saved;
}
function getSharedWindow(range, weights, activePhase) {
    const today = localDate();
    if (range === "phase" && activePhase?.startDate) return { startDate: String(activePhase.startDate), endDate: today, label: "Current phase" };
    if (range === "all") return { startDate: weights[0]?.date || today, endDate: weights.at(-1)?.date || today, label: "All time" };
    const option = RANGE_OPTIONS[range] || RANGE_OPTIONS["3m"];
    return { startDate: shiftDate(today, -(Number(option.days || 90) - 1)), endDate: today, label: option.label };
}
function recentCarbAverage(series, selected) {
    const index = series.findIndex(day => day.date === selected);
    if (index <= 0) return null;
    const values = series.slice(Math.max(0, index - 7), index).map(day => day.carbs).filter(Number.isFinite);
    return values.length >= 2 ? mean(values) : null;
}
function totalCarbs(log, date) {
    const entries = Array.isArray(log?.[date]) ? log[date] : [];
    if (!entries.length) return null;
    return entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.carbs) || 0), 0);
}
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function datesBetween(startDate, endDate) {
    const values = [];
    let cursor = startDate;
    while (cursor && cursor <= endDate) { values.push(cursor); cursor = shiftDate(cursor, 1); }
    return values;
}
function dateMs(date) { return new Date(`${date}T12:00:00`).getTime(); }
function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return null;
    date.setDate(date.getDate() + Number(days || 0));
    return localDate(date);
}
function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function formatSigned(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(digits)}`;
}
function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function roundRect(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    context.beginPath(); context.moveTo(x + r, y); context.arcTo(x + width, y, x + width, y + height, r); context.arcTo(x + width, y + height, x, y + height, r); context.arcTo(x, y + height, x, y, r); context.arcTo(x, y, x + width, y, r); context.closePath();
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress .weight-chart-card{overflow:hidden}
        #weight-progress .weight-graph-carousel-track-v2{display:flex;width:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
        #weight-progress .weight-graph-carousel-track-v2::-webkit-scrollbar{display:none}
        #weight-progress .weight-graph-carousel-slide-v2{flex:0 0 100%;min-width:0;box-sizing:border-box;scroll-snap-align:start;scroll-snap-stop:always}
        #weight-progress .weight-graph-carousel-slide-v2.is-carbs{padding:0 1px}
        #weight-progress .weight-graph-carousel-pager-v2{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;padding:3px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.025)}
        #weight-progress .weight-graph-carousel-pager-v2 button{min-height:32px;border:0;border-radius:8px;background:transparent;color:#8f8f98;font-size:9px;font-weight:900}
        #weight-progress .weight-graph-carousel-pager-v2 button[aria-pressed="true"]{background:rgba(31,92,55,.52);color:#fff}
        .weight-carbs-head-v2{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.weight-carbs-head-v2 h3{margin:3px 0;font-size:18px}.weight-carbs-head-v2 p{margin:0;color:#9898a3;font-size:10px}
        .weight-carbs-info-v2{position:relative}.weight-carbs-info-v2 summary{display:grid;place-items:center;width:30px;height:30px;border:1px solid #3b3b42;border-radius:50%;background:#242429;color:#c6c6cd;font-weight:900;list-style:none}.weight-carbs-info-v2 summary::-webkit-details-marker{display:none}.weight-carbs-info-v2>div{position:absolute;z-index:8;top:36px;right:0;width:min(300px,calc(100vw - 52px));padding:12px;border:1px solid #3a3a41;border-radius:14px;background:#202024;box-shadow:0 14px 36px rgba(0,0,0,.5)}.weight-carbs-info-v2 p{margin:6px 0;color:#a1a1aa;font-size:10px;line-height:1.45}.weight-carbs-info-v2 small{color:#85858e;font-size:9px;line-height:1.4}
        .weight-carbs-chart-shell-v2{position:relative;min-height:330px;border-top:1px solid #303036;border-bottom:1px solid #303036}.weight-carbs-chart-shell-v2 canvas{display:block;width:100%;height:330px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
        .weight-carbs-tooltip-v2{position:absolute;z-index:5;top:12px;display:grid;gap:3px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(24,24,28,.97);box-shadow:0 10px 28px rgba(0,0,0,.4);pointer-events:auto}.weight-carbs-tooltip-v2 strong{font-size:11px}.weight-carbs-tooltip-v2 span{color:#d2d2d7;font-size:10px}.weight-carbs-tooltip-v2 small{color:#8f8f99;font-size:8px}
        .weight-carbs-legend-v2{display:flex;flex-wrap:wrap;gap:8px 13px;margin-top:9px;color:#92929c;font-size:9px;font-weight:800}.weight-carbs-legend-v2 span{display:flex;align-items:center;gap:5px}.weight-carbs-legend-v2 i{display:block;width:13px;height:3px;border-radius:999px}.weight-carbs-legend-v2 .is-weight{background:${DAILY_WEIGHT_POINT}}.weight-carbs-legend-v2 .is-trend{background:${TREND_GREEN}}.weight-carbs-legend-v2 .is-carbs{height:8px;border-radius:3px;background:${CARB_COLOR}}
        .weight-carbs-interaction-note-v2{margin:0;color:#777780;font-size:8.5px}.weight-carbs-empty-v2{padding:15px;border:1px dashed #3a3a42;border-radius:14px;background:#1b1b1f}.weight-carbs-empty-v2 strong{font-size:14px}.weight-carbs-empty-v2 p{margin:5px 0 0;color:#9696a0;font-size:11px}
        .weight-carbs-analysis-v2{display:grid;gap:5px;margin-top:4px;padding:13px 14px;border:1px solid rgba(79,168,255,.22);border-radius:15px;background:rgba(79,168,255,.055)}.weight-carbs-analysis-v2>span{color:${CARB_COLOR};font-size:8px;font-weight:900;letter-spacing:.1em}.weight-carbs-analysis-v2 strong{font-size:15px}.weight-carbs-analysis-v2 b{color:#d4d4da;font-size:10px}.weight-carbs-analysis-v2 p{margin:0;color:#b2b2ba;font-size:10.5px;line-height:1.5}.weight-carbs-analysis-v2 small{color:#85858e;font-size:9px;line-height:1.45}
        @media(max-width:520px){.weight-carbs-chart-shell-v2,.weight-carbs-chart-shell-v2 canvas{min-height:330px;height:330px}}
    `;
    document.head.appendChild(style);
}
