import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const SHARED_RANGE_KEY = "level_up_weight_chart_range";
const STYLE_ID = "level-up-weight-chart-carousel-v3-styles";
const CARB_COLOR = "#4fa8ff";
const TREND_GREEN = "#45cb75";
const DAILY_WEIGHT_LINE = "rgba(112,181,137,.34)";
const DAILY_WEIGHT_POINT = "rgba(126,194,151,.82)";
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

export function initializeWeightCarbsChartV3(root = document) {
    const weightProgress = root.querySelector?.("#weight-progress") || document.querySelector("#weight-progress");
    const card = weightProgress?.querySelector(".weight-chart-card");
    if (!weightProgress || !card) return;
    ensureStyles();
    ensureCarousel(card);
    bindRefreshes(card);
    scheduleRefresh(card);
}

function ensureCarousel(card) {
    if (card.dataset.weightGraphCarouselV3 === "1") return;

    const previousTrack = card.querySelector("[data-weight-graph-carousel-track-v2], [data-weight-graph-carousel-track]");
    const previousPager = card.querySelector(".weight-graph-carousel-pager-v2, .weight-graph-carousel-pager");
    if (previousTrack) {
        const trendSlide = previousTrack.querySelector('[data-weight-graph-slide-v2="trend"], [data-weight-graph-slide="trend"]');
        const rangeControl = card.querySelector(".weight-chart-range-control") || trendSlide?.querySelector(".weight-chart-range-control");
        if (rangeControl) card.insertBefore(rangeControl, previousTrack);
        if (trendSlide) [...trendSlide.children].forEach(child => card.insertBefore(child, previousTrack));
        previousTrack.remove();
        previousPager?.remove();
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
        track.scrollTo({ left: Number(button.dataset.weightGraphPageV2) * track.clientWidth, behavior: "smooth" });
    });
    track.addEventListener("scroll", () => requestAnimationFrame(() => syncPager(card)), { passive: true });

    if (rangeControl) card.insertBefore(rangeControl, track);
    card.dataset.weightGraphCarouselV3 = "1";

    if (!observer) {
        observer = new MutationObserver(() => {
            const control = card.querySelector(".weight-chart-range-control");
            const activeTrack = card.querySelector("[data-weight-graph-carousel-track-v2]");
            if (control && activeTrack && control.nextElementSibling !== activeTrack) card.insertBefore(control, activeTrack);
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
                <p>Same smoothed Trend Weight · carbohydrate intake</p>
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
            <canvas data-weight-carbs-canvas-v2 role="img" aria-label="Body weight, smoothed Trend Weight, and daily carbohydrate intake"></canvas>
            <div class="weight-carbs-tooltip-v2" data-weight-carbs-tooltip-v2 hidden></div>
        </div>
        <div class="weight-carbs-legend-v2" aria-hidden="true">
            <span><i class="is-weight"></i>Daily weight</span>
            <span><i class="is-trend"></i>Trend Weight</span>
            <span><i class="is-carbs"></i>Carbs</span>
        </div>
        <p class="weight-carbs-interaction-note-v2">Tap or drag for day details. Tap the selected day again to close it.</p>
        <div class="weight-carbs-empty-v2" data-weight-carbs-empty-v2 hidden>
            <strong>More data needed</strong>
            <p>Log nutrition and body weight to compare carbohydrate intake with scale fluctuations.</p>
        </div>
        <aside class="weight-carbs-analysis-v2" data-weight-carbs-analysis-v2></aside>
    `;
}

function syncPager(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    if (!track) return;
    const maxPage = Math.max(0, card.querySelectorAll("[data-weight-graph-slide-v2]").length - 1);
    const index = Math.max(0, Math.min(maxPage, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    card.querySelectorAll("[data-weight-graph-page-v2]").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.weightGraphPageV2) === index));
    });
    if (index === 1) scheduleRefresh(card);
}

function bindRefreshes(card) {
    if (card.dataset.weightCarbsV3Bound === "1") return;
    card.dataset.weightCarbsV3Bound = "1";
    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:units-changed", "levelup:nutrition-updated", "levelup:nutrition-phase-updated"]
        .forEach(name => window.addEventListener(name, () => scheduleRefresh(card)));
    window.addEventListener("resize", () => scheduleRefresh(card), { passive: true });
    document.addEventListener("click", event => {
        if (event.target.closest?.("button[data-weight-chart-range], #weight-tab, #save-weight-btn, .remove-weight-entry")) {
            selectedDate = null;
            window.setTimeout(() => scheduleRefresh(card), 0);
        }
    });
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
    canvas.__weightCarbsV3State = state;
    const available = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
    const shell = card.querySelector(".weight-carbs-chart-shell-v2");
    const legend = card.querySelector(".weight-carbs-legend-v2");
    const empty = card.querySelector("[data-weight-carbs-empty-v2]");
    if (available.length < 2) {
        if (shell) shell.hidden = true;
        if (legend) legend.hidden = true;
        if (empty) empty.hidden = false;
        updateTooltip(card, state, null);
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
    const trendSeries = calculateTrendWeightSeries(weights).filter(entry => entry.date >= chartWindow.startDate && entry.date <= chartWindow.endDate);
    const weightsByDate = new Map(weights.map(entry => [entry.date, entry.weight]));
    const trendByDate = new Map(trendSeries.map(entry => [entry.date, entry.weight]));
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const series = datesBetween(chartWindow.startDate, chartWindow.endDate).map(date => {
        const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const carbs = entries.length ? entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.carbs) || 0), 0) : null;
        return {
            date,
            weight: weightsByDate.get(date) ?? null,
            trend: trendByDate.get(date) ?? null,
            carbs: Number.isFinite(carbs) ? carbs : null
        };
    });
    return { weights, trendSeries, series, chartWindow, range, foodLog };
}

function bindCanvasInteraction(canvas, card) {
    if (canvas.dataset.weightCarbsV3Interaction === "1") return;
    canvas.dataset.weightCarbsV3Interaction = "1";
    let dragging = false;

    const select = event => {
        const state = canvas.__weightCarbsV3State || buildState();
        const available = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
        if (!available.length) return;
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - 48) / Math.max(1, rect.width - 96)));
        const first = dateMs(state.chartWindow.startDate);
        const target = first + ratio * Math.max(1, dateMs(state.chartWindow.endDate) - first);
        let nearest = available[0];
        let distance = Infinity;
        available.forEach(day => {
            const delta = Math.abs(dateMs(day.date) - target);
            if (delta < distance) { distance = delta; nearest = day; }
        });
        selectedDate = selectedDate === nearest.date && !dragging ? null : nearest.date;
        drawChart(canvas, state, selectedDate);
        updateTooltip(card, state, selectedDate);
    };

    canvas.addEventListener("pointerdown", event => {
        dragging = true;
        canvas.setPointerCapture?.(event.pointerId);
        select(event);
    });
    canvas.addEventListener("pointermove", event => {
        if (!dragging) return;
        event.preventDefault();
        select(event);
    });
    const stop = event => {
        dragging = false;
        canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
}

function drawChart(canvas, state, activeDate) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const { series, trendSeries, chartWindow, range } = state;
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
    const weightValues = [...series.map(day => day.weight), ...trendSeries.map(day => day.weight)].filter(Number.isFinite).map(displayMass);
    const carbValues = series.map(day => day.carbs).filter(Number.isFinite);
    if (!weightValues.length && !carbValues.length) return;

    const weightMin = weightValues.length ? Math.min(...weightValues) : 0;
    const weightMax = weightValues.length ? Math.max(...weightValues) : 1;
    const weightSpan = Math.max(unit === "kg" ? .45 : 1, weightMax - weightMin);
    const weightPad = Math.max(unit === "kg" ? .35 : .75, weightSpan * .18);
    const minimum = weightMin - weightPad;
    const maximum = weightMax + weightPad;
    const carbMax = Math.max(50, Math.ceil(Math.max(1, ...carbValues) / 50) * 50);
    const firstTime = dateMs(chartWindow.startDate);
    const elapsed = Math.max(1, dateMs(chartWindow.endDate) - firstTime);
    const x = date => padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth;
    const yWeight = weight => padding.top + ((maximum - displayMass(weight)) / Math.max(.001, maximum - minimum)) * chartHeight;
    const yCarbs = grams => padding.top + chartHeight - (grams / carbMax) * chartHeight;

    context.strokeStyle = themeColor("--line", "rgba(255,255,255,.055)");
    context.fillStyle = themeColor("--muted", "#777780");
    context.font = "800 9px Arial";
    context.lineWidth = 1;
    context.textBaseline = "middle";
    for (let row = 0; row <= 2; row += 1) {
        const yy = padding.top + chartHeight * row / 2;
        context.beginPath();
        context.moveTo(padding.left, yy);
        context.lineTo(width - padding.right, yy);
        context.stroke();
        context.textAlign = "right";
        context.fillText((maximum - (maximum - minimum) * row / 2).toFixed(1), padding.left - 7, yy);
        context.textAlign = "left";
        context.fillText(String(Math.round(carbMax - carbMax * row / 2)), width - padding.right + 7, yy);
    }
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("g", width - 5, 12);

    const barWidth = Math.max(2, Math.min(14, chartWidth / Math.max(1, series.length) * .52));
    series.forEach(day => {
        if (!Number.isFinite(day.carbs)) return;
        const xx = x(day.date);
        const yy = yCarbs(day.carbs);
        context.globalAlpha = activeDate === day.date ? .92 : .32;
        context.fillStyle = CARB_COLOR;
        roundRect(context, xx - barWidth / 2, yy, barWidth, padding.top + chartHeight - yy, Math.min(4, barWidth / 2));
        context.fill();
    });
    context.globalAlpha = 1;

    const raw = series.filter(day => Number.isFinite(day.weight));
    if (raw.length > 1) {
        context.beginPath();
        raw.forEach((day, index) => index ? context.lineTo(x(day.date), yWeight(day.weight)) : context.moveTo(x(day.date), yWeight(day.weight)));
        context.strokeStyle = DAILY_WEIGHT_LINE;
        context.lineWidth = 1.5;
        context.stroke();
    }
    raw.forEach(day => {
        context.beginPath();
        context.arc(x(day.date), yWeight(day.weight), activeDate === day.date ? 5 : 2.6, 0, Math.PI * 2);
        context.fillStyle = activeDate === day.date ? "#fff" : DAILY_WEIGHT_POINT;
        context.fill();
    });

    if (trendSeries.length > 1) {
        const points = trendSeries.map(day => ({ x: x(day.date), y: yWeight(day.weight) }));
        context.save();
        context.shadowColor = "rgba(69,203,117,.3)";
        context.shadowBlur = 8;
        context.strokeStyle = TREND_GREEN;
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        traceSmoothLine(context, points);
        context.stroke();
        context.restore();
    }

    if (activeDate) {
        context.save();
        context.setLineDash([4, 4]);
        context.strokeStyle = themeColor("--muted", "rgba(255,255,255,.5)");
        context.beginPath();
        context.moveTo(x(activeDate), padding.top);
        context.lineTo(x(activeDate), padding.top + chartHeight);
        context.stroke();
        context.restore();
    }
    drawDateLabels(context, series, x, padding.top + chartHeight + 20, range);
}

function traceSmoothLine(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    if (points.length > 1) context.lineTo(points.at(-1).x, points.at(-1).y);
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
    tooltip.innerHTML = `<strong>${formatDate(date)}</strong><span>${Number.isFinite(weight) ? `${weight.toFixed(1)} ${unit}` : "No weight logged"}</span><span>${Number.isFinite(trend) ? `${trend.toFixed(1)} ${unit} Trend Weight` : "Trend Weight unavailable"}</span><span>${Number.isFinite(day.carbs) ? `${Math.round(day.carbs)} g carbs` : "No carbs logged"}</span><span>${Number.isFinite(difference) ? `${formatSigned(difference, 1)} ${unit} vs trend` : "Weight vs trend unavailable"}</span>${Number.isFinite(carbDifference) ? `<small>${formatSigned(carbDifference, 0)} g vs recent average</small>` : ""}`;
    tooltip.hidden = false;
    const shell = card.querySelector(".weight-carbs-chart-shell-v2");
    if (!shell) return;
    const first = dateMs(state.chartWindow.startDate);
    const ratio = (dateMs(date) - first) / Math.max(1, dateMs(state.chartWindow.endDate) - first);
    const xx = 48 + ratio * Math.max(1, shell.clientWidth - 96);
    const tooltipWidth = Math.min(190, Math.max(150, shell.clientWidth - 24));
    tooltip.style.width = `${tooltipWidth}px`;
    tooltip.style.left = `${Math.max(8, Math.min(shell.clientWidth - tooltipWidth - 8, xx - tooltipWidth / 2))}px`;
}

function updateAnalysis(card, state) {
    const insight = card.querySelector("[data-weight-carbs-analysis-v2]");
    if (!insight) return;
    const paired = state.series.filter(day => Number.isFinite(day.weight) && Number.isFinite(day.trend) && Number.isFinite(day.carbs));
    const candidate = paired.at(-1) || null;
    if (!candidate) {
        return renderAnalysis(insight, "Building a clearer pattern", "More paired data needed", "Log body weight and nutrition on overlapping days. Level Up will compare carbohydrate intake with short-term scale movement as the overlap grows.", "This is explanatory only and does not alter your calorie target.");
    }
    const recentDates = [candidate.date, shiftDate(candidate.date, -1), shiftDate(candidate.date, -2)];
    const recentCarbs = recentDates.map(date => totalCarbs(state.foodLog, date)).filter(Number.isFinite);
    const baselineDates = Array.from({ length: 8 }, (_, index) => shiftDate(candidate.date, -(index + 3)));
    const baselineCarbs = baselineDates.map(date => totalCarbs(state.foodLog, date)).filter(Number.isFinite);
    const unit = massUnit();
    const displayDelta = displayMass(candidate.weight - candidate.trend);
    const positionText = Number.isFinite(displayDelta) ? `${formatSigned(displayDelta, 1)} ${unit} versus Trend Weight` : "weight trend comparison unavailable";
    if (recentCarbs.length < 2 || baselineCarbs.length < 3) {
        return renderAnalysis(insight, "Building a clearer pattern", "More carb history needed", `Your latest paired day is ${positionText}. A few more nutrition days are needed before comparing recent carbohydrate intake with a stable baseline.`, "Scale changes can also reflect sodium, hydration, food volume, bowel contents and training-related inflammation.");
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
    if (carbsHigh && weightHigh) return renderAnalysis(insight, "Possible water retention", "Higher carbs + higher scale weight", `Recent carbohydrate intake is about ${Math.round(carbChange)} g/day above your prior baseline, while scale weight is ${positionText}. This pattern can be compatible with glycogen-associated water rather than an equivalent tissue change.`, "Other contributors can include sodium, hydration, food volume and training-related inflammation.");
    if (carbsHigh && !weightHigh) return renderAnalysis(insight, "Higher carbs, weight near trend", "Carbs are up without a clear weight spike", `Recent carbohydrate intake is about ${Math.round(carbChange)} g/day above baseline, but scale weight remains ${positionText}.`, "A higher-carb period does not always produce a visible scale increase.");
    if (!carbsHigh && weightHigh) return renderAnalysis(insight, "Weight elevated without a clear carb signal", "Look beyond carbohydrates", `Scale weight is ${positionText}, while recent carbohydrate intake is only ${formatSigned(carbChange, 0)} g/day versus baseline.`, "Sodium, hydration, food volume, bowel contents and training-related inflammation may also influence short-term scale weight.");
    if (carbsLow && weightLow) return renderAnalysis(insight, "Lower carbs and lower scale weight", "A compatible short-term pattern", `Recent carbohydrate intake is about ${Math.abs(Math.round(carbChange))} g/day below baseline and scale weight is ${positionText}.`, "Lower glycogen-associated water could contribute, but the graph cannot determine the cause with certainty.");
    return renderAnalysis(insight, "No strong carb-related fluctuation", "Weight and carbs are broadly stable", `Recent carbohydrate intake is ${formatSigned(carbChange, 0)} g/day versus baseline and scale weight is ${positionText}.`, "Smoothed Trend Weight remains the better guide for longer-term progress.");
}

function renderAnalysis(node, title, subtitle, body, footnote) {
    node.innerHTML = `<span>WEIGHT &amp; CARB ANALYSIS</span><strong>${title}</strong><b>${subtitle}</b><p>${body}</p><small>${footnote}</small>`;
}

function drawDateLabels(context, series, xPosition, y, range) {
    const desiredLabels = range === "1w" ? 7 : 6;
    const step = Math.max(1, Math.ceil(series.length / desiredLabels));
    context.fillStyle = themeColor("--muted", "#777780");
    context.font = "800 8px Arial";
    context.textAlign = "center";
    series.forEach((day, index) => {
        if (index !== 0 && index !== series.length - 1 && index % step !== 0) return;
        const date = new Date(`${day.date}T12:00:00`);
        context.fillText(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), xPosition(day.date), y);
    });
}

function readWeights() {
    const today = localDate();
    return normalizeWeightEntries(readJson(WEIGHT_KEY, [])).filter(entry => entry.date <= today);
}
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
function themeColor(token, fallback) { return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback; }
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
        #weight-progress .weight-chart-card{overflow:hidden}
        #weight-progress .weight-graph-carousel-track-v2{display:flex;width:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
        #weight-progress .weight-graph-carousel-track-v2::-webkit-scrollbar{display:none}
        #weight-progress .weight-graph-carousel-slide-v2{flex:0 0 100%;min-width:0;box-sizing:border-box;scroll-snap-align:start;scroll-snap-stop:always}
        #weight-progress .weight-graph-carousel-slide-v2.is-carbs{padding:0 1px}
        #weight-progress .weight-graph-carousel-pager-v2{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;padding:3px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.025)}
        #weight-progress .weight-graph-carousel-pager-v2.has-three-weight-pages{grid-template-columns:repeat(3,1fr)}
        #weight-progress .weight-graph-carousel-pager-v2 button{min-height:32px;border:0;border-radius:8px;background:transparent;color:#8f8f98;font-size:9px;font-weight:900}
        #weight-progress .weight-graph-carousel-pager-v2 button[aria-pressed="true"]{background:rgba(31,92,55,.52);color:#fff}
        .weight-carbs-head-v2{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.weight-carbs-head-v2 h3{margin:3px 0;font-size:18px}.weight-carbs-head-v2 p{margin:0;color:#9898a3;font-size:10px}
        .weight-carbs-info-v2{position:relative}.weight-carbs-info-v2 summary{display:grid;place-items:center;width:30px;height:30px;border:1px solid #3b3b42;border-radius:50%;background:#242429;color:#c6c6cd;font-weight:900;list-style:none}.weight-carbs-info-v2 summary::-webkit-details-marker{display:none}.weight-carbs-info-v2>div{position:absolute;z-index:8;top:36px;right:0;width:min(300px,calc(100vw - 52px));padding:12px;border:1px solid #3a3a41;border-radius:14px;background:#202024;box-shadow:0 14px 36px rgba(0,0,0,.5)}.weight-carbs-info-v2 p{margin:6px 0;color:#a1a1aa;font-size:10px;line-height:1.45}.weight-carbs-info-v2 small{color:#85858e;font-size:9px;line-height:1.4}
        .weight-carbs-chart-shell-v2{position:relative;min-height:330px;border-top:1px solid #303036;border-bottom:1px solid #303036}.weight-carbs-chart-shell-v2 canvas{display:block;width:100%;height:330px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
        .weight-carbs-tooltip-v2{position:absolute;z-index:5;top:12px;display:grid;gap:3px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(24,24,28,.97);box-shadow:0 10px 28px rgba(0,0,0,.4)}.weight-carbs-tooltip-v2 strong{font-size:11px}.weight-carbs-tooltip-v2 span{color:#d2d2d7;font-size:10px}.weight-carbs-tooltip-v2 small{color:#8f8f99;font-size:8px}
        .weight-carbs-legend-v2{display:flex;flex-wrap:wrap;gap:8px 13px;margin-top:9px;color:#92929c;font-size:9px;font-weight:800}.weight-carbs-legend-v2 span{display:flex;align-items:center;gap:5px}.weight-carbs-legend-v2 i{display:block;width:13px;height:3px;border-radius:999px}.weight-carbs-legend-v2 .is-weight{background:${DAILY_WEIGHT_POINT}}.weight-carbs-legend-v2 .is-trend{background:${TREND_GREEN}}.weight-carbs-legend-v2 .is-carbs{height:8px;border-radius:3px;background:${CARB_COLOR}}
        .weight-carbs-interaction-note-v2{margin:0;color:#777780;font-size:8.5px}.weight-carbs-empty-v2{padding:15px;border:1px dashed #3a3a42;border-radius:14px;background:#1b1b1f}.weight-carbs-empty-v2 strong{font-size:14px}.weight-carbs-empty-v2 p{margin:5px 0 0;color:#9696a0;font-size:11px}
        .weight-carbs-analysis-v2{display:grid;gap:5px;margin-top:4px;padding:13px 14px;border:1px solid rgba(79,168,255,.22);border-radius:15px;background:rgba(79,168,255,.055)}.weight-carbs-analysis-v2>span{color:${CARB_COLOR};font-size:8px;font-weight:900;letter-spacing:.1em}.weight-carbs-analysis-v2 strong{font-size:15px}.weight-carbs-analysis-v2 b{color:#d4d4da;font-size:10px}.weight-carbs-analysis-v2 p{margin:0;color:#b2b2ba;font-size:10.5px;line-height:1.5}.weight-carbs-analysis-v2 small{color:#85858e;font-size:9px;line-height:1.45}
        @media(max-width:520px){.weight-carbs-chart-shell-v2,.weight-carbs-chart-shell-v2 canvas{min-height:330px;height:330px}}
    `;
    document.head.appendChild(style);
}
