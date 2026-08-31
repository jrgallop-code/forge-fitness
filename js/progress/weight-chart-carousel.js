import { calculateSevenDayAverage, normalizeWeightEntries } from "../core/weight-trend.js?v=weight-carousel-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const SHARED_RANGE_KEY = "level_up_weight_chart_range";
const STYLE_ID = "level-up-weight-chart-carousel-styles";
const CARB_COLOR = "#4fa8ff";
const TREND_COLOR = "#45cb75";
const DAILY_WEIGHT_COLOR = "rgba(224,224,230,.62)";
const DAILY_WEIGHT_POINT = "rgba(236,236,241,.92)";
const RANGE_OPTIONS = {
    "1w": { days: 7, label: "1W" },
    "1m": { days: 30, label: "1M" },
    "3m": { days: 90, label: "3M" },
    "6m": { days: 180, label: "6M" },
    phase: { label: "PHASE" },
    all: { label: "ALL" }
};

let refreshQueued = false;
let selectedDate = null;
let carouselObserver = null;
let documentDismissBound = false;

export function initializeWeightCarbsChart(root = document) {
    const weightProgress = root.querySelector?.("#weight-progress") || document.getElementById("weight-progress");
    const card = weightProgress?.querySelector(".weight-chart-card");
    if (!weightProgress || !card) return;

    ensureStyles();
    ensureCarousel(card);
    bindRefreshes(card);
    scheduleRefresh(card);
}

function ensureCarousel(card) {
    if (!card.dataset.weightGraphCarousel) {
        const originalChildren = [...card.children];
        const track = document.createElement("div");
        track.className = "weight-graph-carousel-track";
        track.dataset.weightGraphCarouselTrack = "1";
        track.setAttribute("aria-label", "Weight graph views");

        const trendSlide = document.createElement("section");
        trendSlide.className = "weight-graph-carousel-slide is-trend";
        trendSlide.dataset.weightGraphSlide = "trend";
        originalChildren.forEach(child => trendSlide.appendChild(child));

        const carbsSlide = document.createElement("section");
        carbsSlide.className = "weight-graph-carousel-slide is-carbs";
        carbsSlide.dataset.weightGraphSlide = "carbs";
        carbsSlide.innerHTML = renderCarbSlide();

        track.append(trendSlide, carbsSlide);
        card.appendChild(track);

        const pager = document.createElement("div");
        pager.className = "weight-graph-carousel-pager";
        pager.setAttribute("role", "group");
        pager.setAttribute("aria-label", "Weight graph view");
        pager.innerHTML = `
            <button type="button" data-weight-graph-page="0" aria-pressed="true">Weight</button>
            <button type="button" data-weight-graph-page="1" aria-pressed="false">Weight + Carbs</button>
        `;
        card.appendChild(pager);

        pager.addEventListener("click", event => {
            const button = event.target.closest?.("[data-weight-graph-page]");
            if (!button) return;
            const index = Number(button.dataset.weightGraphPage);
            const slide = track.children[index];
            slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        });

        track.addEventListener("scroll", () => {
            window.requestAnimationFrame(() => syncPager(card));
        }, { passive: true });

        card.dataset.weightGraphCarousel = "1";
        window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    }

    syncSharedRangeControl(card);

    if (!carouselObserver) {
        carouselObserver = new MutationObserver(() => {
            if (!card.isConnected) return;
            syncSharedRangeControl(card);
        });
        carouselObserver.observe(card, { childList: true, subtree: true });
    }
}

function renderCarbSlide() {
    return `
        <div class="weight-carbs-head">
            <div>
                <span class="weight-chart-kicker">WEIGHT CONTEXT</span>
                <h3>Weight &amp; Carbs</h3>
                <p>Daily measurements · 7-day trend · carbohydrate intake</p>
            </div>
            <details class="weight-carbs-info">
                <summary aria-label="Why carbohydrates can affect scale weight">i</summary>
                <div>
                    <strong>Why carbohydrates can affect scale weight</strong>
                    <p>Stored carbohydrate (glycogen) is associated with body water. Larger changes in carbohydrate intake can temporarily affect scale weight without representing an equivalent change in body fat or muscle.</p>
                    <small>Sodium, hydration, food volume, bowel contents and training-related inflammation can also affect scale weight.</small>
                </div>
            </details>
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
        <p class="weight-carbs-interaction-note">Tap or drag for day details. Tap outside the graph to clear them.</p>

        <div class="weight-carbs-empty" data-weight-carbs-empty hidden>
            <strong>More data needed</strong>
            <p>Log nutrition and body weight consistently to compare carbohydrate intake with scale fluctuations.</p>
        </div>

        <aside class="weight-carbs-analysis" data-weight-carbs-analysis></aside>
    `;
}

function syncSharedRangeControl(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track]");
    const control = card.querySelector(".weight-chart-range-control");
    if (!track || !control) return;
    if (control.parentElement !== card || control.nextElementSibling !== track) {
        card.insertBefore(control, track);
    }
}

function syncPager(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track]");
    if (!track) return;
    const width = track.clientWidth || 1;
    const index = Math.max(0, Math.min(1, Math.round(track.scrollLeft / width)));
    card.querySelectorAll("[data-weight-graph-page]").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.weightGraphPage) === index));
    });
    if (index === 1) scheduleRefresh(card);
}

function bindRefreshes(card) {
    if (card.dataset.weightCarbsBound === "1") return;
    card.dataset.weightCarbsBound = "1";

    ["levelup:food-log-updated", "levelup:weight-updated", "levelup:units-changed", "levelup:nutrition-updated", "levelup:nutrition-phase-updated"]
        .forEach(name => window.addEventListener(name, () => scheduleRefresh(card)));

    document.addEventListener("click", event => {
        if (event.target.closest?.("button[data-weight-chart-range]")) {
            selectedDate = null;
            window.setTimeout(() => scheduleRefresh(card), 0);
        }
        if (event.target.closest?.("#weight-tab, #save-weight-btn, .remove-weight-entry")) {
            window.setTimeout(() => scheduleRefresh(card), 0);
        }
    });

    window.addEventListener("resize", () => scheduleRefresh(card));

    if (!documentDismissBound) {
        documentDismissBound = true;
        document.addEventListener("pointerdown", event => {
            if (!selectedDate) return;
            if (event.target.closest?.("[data-weight-carbs-canvas]")) return;
            clearSelection();
        }, true);
    }
}

function scheduleRefresh(card) {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        if (!card.isConnected) return;
        ensureCarousel(card);
        refreshCarbSlide(card);
    });
}

function refreshCarbSlide(card) {
    const canvas = card.querySelector("[data-weight-carbs-canvas]");
    if (!canvas) return;

    const weights = readWeights();
    const phase = readActivePhase();
    const range = readSharedRange(phase);
    const chartWindow = getSharedWindow(range, weights, phase);
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const series = buildSeries(chartWindow, weights, foodLog);
    const available = series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
    const shell = card.querySelector(".weight-carbs-chart-shell");
    const legend = card.querySelector(".weight-carbs-legend");
    const empty = card.querySelector("[data-weight-carbs-empty]");

    canvas.__weightCarbsSeries = series;
    canvas.__weightCarbsRange = range;

    if (available.length < 2) {
        if (shell) shell.hidden = true;
        if (legend) legend.hidden = true;
        if (empty) empty.hidden = false;
        updateAnalysis(card, foodLog, series);
        hideTooltip(card);
        return;
    }

    if (shell) shell.hidden = false;
    if (legend) legend.hidden = false;
    if (empty) empty.hidden = true;
    if (selectedDate && !available.some(day => day.date === selectedDate)) selectedDate = null;

    drawChart(canvas, series, selectedDate, range);
    bindCanvasInteraction(canvas, card);
    updateTooltip(card, series, selectedDate);
    updateAnalysis(card, foodLog, series);
}

function readSharedRange(activePhase) {
    const saved = String(localStorage.getItem(SHARED_RANGE_KEY) || "1w").toLowerCase();
    if (!RANGE_OPTIONS[saved]) return "1w";
    if (saved === "phase" && !activePhase?.startDate) return "1w";
    return saved;
}

function getSharedWindow(range, weights, activePhase) {
    const today = localDate();
    if (range === "phase" && activePhase?.startDate) {
        return { startDate: String(activePhase.startDate), endDate: today, label: "Current phase" };
    }
    if (range === "all") {
        return {
            startDate: weights[0]?.date || today,
            endDate: weights.at(-1)?.date || today,
            label: "All time"
        };
    }
    const option = RANGE_OPTIONS[range] || RANGE_OPTIONS["1w"];
    return {
        startDate: shiftDate(today, -(Number(option.days || 7) - 1)),
        endDate: today,
        label: option.label
    };
}

function buildSeries(chartWindow, weights, foodLog) {
    const weightsByDate = new Map(weights.map(entry => [entry.date, entry.weight]));
    return datesBetween(chartWindow.startDate, chartWindow.endDate).map(date => {
        const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const carbs = entries.length
            ? entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.carbs) || 0), 0)
            : null;
        const trendWindow = calculateSevenDayAverage(weights, date);
        return {
            date,
            weight: weightsByDate.get(date) ?? null,
            trend: Number.isFinite(trendWindow.average) && trendWindow.entries > 0 ? trendWindow.average : null,
            carbs: Number.isFinite(carbs) ? carbs : null
        };
    });
}

function bindCanvasInteraction(canvas, card) {
    if (canvas.dataset.weightCarbsInteraction === "1") return;
    canvas.dataset.weightCarbsInteraction = "1";
    let dragging = false;

    const selectFromPointer = event => {
        const series = canvas.__weightCarbsSeries || [];
        const available = series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.carbs));
        if (!available.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const chartWidth = Math.max(1, rect.width - 96);
        const ratio = Math.max(0, Math.min(1, (x - 48) / chartWidth));
        const targetIndex = Math.round(ratio * Math.max(0, series.length - 1));
        let nearest = available[0];
        let distance = Infinity;
        available.forEach(day => {
            const index = series.findIndex(item => item.date === day.date);
            const next = Math.abs(index - targetIndex);
            if (next < distance) {
                nearest = day;
                distance = next;
            }
        });
        selectedDate = nearest.date;
        drawChart(canvas, series, selectedDate, canvas.__weightCarbsRange || "1w");
        updateTooltip(card, series, selectedDate);
    };

    canvas.addEventListener("pointerdown", event => {
        event.stopPropagation();
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

function clearSelection() {
    selectedDate = null;
    const card = document.querySelector("#weight-progress .weight-chart-card");
    const canvas = card?.querySelector("[data-weight-carbs-canvas]");
    const series = canvas?.__weightCarbsSeries || [];
    if (canvas && series.length) drawChart(canvas, series, null, canvas.__weightCarbsRange || "1w");
    hideTooltip(card);
}

function drawChart(canvas, series, activeDate, range) {
    const context = canvas.getContext("2d");
    if (!context) return;
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
    const weightValues = series.flatMap(day => [day.weight, day.trend]).filter(Number.isFinite).map(value => displayMass(value));
    const carbValues = series.map(day => day.carbs).filter(Number.isFinite);
    if (!weightValues.length && !carbValues.length) return;

    const weightMinRaw = weightValues.length ? Math.min(...weightValues) : 0;
    const weightMaxRaw = weightValues.length ? Math.max(...weightValues) : 1;
    const span = Math.max(unit === "kg" ? .45 : 1, weightMaxRaw - weightMinRaw);
    const weightPadding = Math.max(unit === "kg" ? .35 : .75, span * .18);
    const weightMin = weightMinRaw - weightPadding;
    const weightMax = weightMaxRaw + weightPadding;
    const carbMax = Math.max(50, Math.ceil(Math.max(1, ...carbValues) / 50) * 50);
    const xForIndex = index => padding.left + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth);
    const yWeight = canonical => {
        const value = displayMass(canonical);
        return padding.top + ((weightMax - value) / Math.max(.001, weightMax - weightMin)) * chartHeight;
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
        context.fillText((weightMax - (weightMax - weightMin) * row / 2).toFixed(1), padding.left - 7, y);
        context.textAlign = "left";
        context.fillText(String(Math.round(carbMax - carbMax * row / 2)), width - padding.right + 7, y);
    }
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("g", width - 5, 12);

    const barSlot = chartWidth / Math.max(1, series.length);
    const barWidth = Math.max(2, Math.min(14, barSlot * .52));
    series.forEach((day, index) => {
        if (!Number.isFinite(day.carbs)) return;
        const x = xForIndex(index);
        const y = yCarbs(day.carbs);
        const selected = Boolean(activeDate) && day.date === activeDate;
        context.globalAlpha = selected ? .92 : .32;
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
        context.arc(x, y, selected ? 5 : 2.6, 0, Math.PI * 2);
        context.fillStyle = selected ? "#fff" : DAILY_WEIGHT_POINT;
        context.fill();
        if (selected) {
            context.strokeStyle = TREND_COLOR;
            context.lineWidth = 2;
            context.stroke();
        }
    });

    const selectedIndex = series.findIndex(day => day.date === activeDate);
    if (selectedIndex >= 0) {
        const x = xForIndex(selectedIndex);
        context.strokeStyle = "rgba(255,255,255,.5)";
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(x, padding.top);
        context.lineTo(x, padding.top + chartHeight);
        context.stroke();
        context.setLineDash([]);
    }

    drawDateLabels(context, series, xForIndex, padding.top + chartHeight + 20, range);
}

function drawLine(context, series, key, xForIndex, yForWeight, color, width, maxGap) {
    context.strokeStyle = color;
    context.lineWidth = width;
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
        if (previousIndex === null || index - previousIndex > maxGap) context.moveTo(x, y);
        else context.lineTo(x, y);
        previousIndex = index;
    });
    context.stroke();
}

function drawDateLabels(context, series, xForIndex, y, range) {
    const count = series.length;
    const desiredLabels = range === "1w" ? 7 : range === "1m" ? 6 : range === "3m" ? 6 : range === "6m" ? 6 : 7;
    const step = Math.max(1, Math.ceil(count / desiredLabels));
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
    const recentAverage = recentCarbAverage(series, day.date);
    const carbDifference = Number.isFinite(day.carbs) && Number.isFinite(recentAverage) ? day.carbs - recentAverage : null;

    tooltip.innerHTML = `
        <strong>${formatDate(day.date)}</strong>
        <span>${Number.isFinite(weight) ? `${weight.toFixed(1)} ${unit}` : "No weight logged"}</span>
        <span>${Number.isFinite(day.carbs) ? `${Math.round(day.carbs)} g carbs` : "No carbs logged"}</span>
        <span>${Number.isFinite(difference) ? `${formatSigned(difference, 1)} ${unit} vs trend` : "Weight vs trend unavailable"}</span>
        ${Number.isFinite(carbDifference) ? `<small>${formatSigned(carbDifference, 0)} g vs recent average</small>` : ""}
    `;
    tooltip.hidden = false;
    positionTooltip(card, series, date, tooltip);
}

function hideTooltip(card) {
    const tooltip = card?.querySelector?.("[data-weight-carbs-tooltip]");
    if (tooltip) tooltip.hidden = true;
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
    tooltip.style.width = `${tooltipWidth}px`;
    tooltip.style.left = `${Math.max(8, Math.min(shell.clientWidth - tooltipWidth - 8, x - tooltipWidth / 2))}px`;
}

function updateAnalysis(card, foodLog, visibleSeries) {
    const insight = card.querySelector("[data-weight-carbs-analysis]");
    if (!insight) return;
    const paired = visibleSeries.filter(day => Number.isFinite(day.weight) && Number.isFinite(day.trend) && Number.isFinite(day.carbs));
    const candidate = paired.at(-1) || null;

    if (!candidate) {
        renderAnalysis(insight, "Building a clearer pattern", "More paired data needed", "Log body weight and nutrition on overlapping days. Level Up will compare carbohydrate intake with short-term scale movement as the overlap grows.", "This is explanatory only and does not alter your calorie target.");
        return;
    }

    const recentDates = [candidate.date, shiftDate(candidate.date, -1), shiftDate(candidate.date, -2)];
    const recentCarbs = recentDates.map(date => totalCarbs(foodLog, date)).filter(Number.isFinite);
    const baselineDates = [];
    for (let offset = 3; offset <= 10; offset += 1) baselineDates.push(shiftDate(candidate.date, -offset));
    const baselineCarbs = baselineDates.map(date => totalCarbs(foodLog, date)).filter(Number.isFinite);

    const unit = massUnit();
    const displayDelta = displayMass(candidate.weight - candidate.trend);
    const positionText = Number.isFinite(displayDelta)
        ? `${formatSigned(displayDelta, 1)} ${unit} versus the 7-day trend`
        : "weight trend comparison unavailable";

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

    if (carbsHigh && weightHigh) {
        renderAnalysis(insight, "Possible water retention", "Higher carbs + higher scale weight", `Recent carbohydrate intake is about ${Math.round(carbChange)} g/day above your prior baseline, while scale weight is ${positionText}. This pattern may reflect glycogen and associated water and is consistent with a temporary scale fluctuation rather than an equivalent tissue change.`, "Other contributors can include sodium, hydration, food volume and training-related inflammation.");
        return;
    }

    if (carbsHigh && !weightHigh) {
        renderAnalysis(insight, "Higher carbs, weight near trend", "Carbs are up without a clear weight spike", `Recent carbohydrate intake is about ${Math.round(carbChange)} g/day above baseline, but scale weight remains ${positionText}. There is not a strong carb-related weight fluctuation signal right now.`, "A higher-carb period does not always produce a visible scale increase.");
        return;
    }

    if (!carbsHigh && weightHigh) {
        renderAnalysis(insight, "Weight elevated without a clear carb signal", "Look beyond carbohydrates", `Scale weight is ${positionText}, while recent carbohydrate intake is only ${formatSigned(carbChange, 0)} g/day versus baseline. Carbohydrates do not clearly explain this fluctuation.`, "Sodium, hydration, food volume, bowel contents and training-related inflammation may also influence short-term scale weight.");
        return;
    }

    if (carbsLow && weightLow) {
        renderAnalysis(insight, "Lower carbs and lower scale weight", "A compatible short-term pattern", `Recent carbohydrate intake is about ${Math.abs(Math.round(carbChange))} g/day below baseline and scale weight is ${positionText}. Lower glycogen-associated water could contribute, but the graph cannot determine the cause with certainty.`, "Continue watching the longer-term trend rather than interpreting a single day in isolation.");
        return;
    }

    renderAnalysis(insight, "No strong carb-related fluctuation", "Weight and carbs are broadly stable", `Recent carbohydrate intake is ${formatSigned(carbChange, 0)} g/day versus baseline and scale weight is ${positionText}. The current data does not show a strong carb-linked scale fluctuation.`, "The 7-day trend remains the better guide for longer-term progress.");
}

function renderAnalysis(node, title, subtitle, body, footnote) {
    node.innerHTML = `
        <span>WEIGHT &amp; CARB ANALYSIS</span>
        <strong>${title}</strong>
        <b>${subtitle}</b>
        <p>${body}</p>
        <small>${footnote}</small>
    `;
}

function readWeights() {
    return normalizeWeightEntries(readJson(WEIGHT_KEY, []));
}

function readActivePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null : null;
}

function recentCarbAverage(series, selectedDate) {
    const index = series.findIndex(day => day.date === selectedDate);
    if (index <= 0) return null;
    const values = series.slice(Math.max(0, index - 7), index).map(day => day.carbs).filter(Number.isFinite);
    return values.length >= 2 ? mean(values) : null;
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
    const values = [];
    let cursor = startDate;
    while (cursor && cursor <= endDate) {
        values.push(cursor);
        cursor = shiftDate(cursor, 1);
    }
    return values;
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

function formatDate(value) {
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
        #weight-progress .weight-chart-card{overflow:hidden}
        #weight-progress .weight-chart-range-control{position:relative;z-index:3}
        .weight-graph-carousel-track{display:flex;width:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain;scrollbar-width:none}
        .weight-graph-carousel-track::-webkit-scrollbar{display:none}
        .weight-graph-carousel-slide{flex:0 0 100%;width:100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always}
        .weight-graph-carousel-slide.is-carbs{display:grid;gap:12px}
        .weight-graph-carousel-pager{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:10px;padding:3px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.025)}
        .weight-graph-carousel-pager button{min-height:32px;border:0;border-radius:8px;background:transparent;color:#8f8f98;font:900 10px/1 inherit}
        .weight-graph-carousel-pager button[aria-pressed="true"]{background:rgba(255,255,255,.08);color:#fff}
        .weight-carbs-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.weight-carbs-head>div{display:grid;gap:4px;min-width:0}.weight-carbs-head h3{margin:0}.weight-carbs-head p{margin:0;color:#96969f;font-size:11px;line-height:1.45}
        .weight-carbs-info{position:relative;flex:0 0 auto}.weight-carbs-info summary{display:grid;place-items:center;width:30px;height:30px;border:1px solid #3b3b42;border-radius:50%;background:#242429;color:#c6c6cd;font-size:13px;font-weight:900;cursor:pointer;list-style:none}.weight-carbs-info summary::-webkit-details-marker{display:none}.weight-carbs-info>div{position:absolute;z-index:8;top:36px;right:0;width:min(300px,calc(100vw - 52px));padding:12px;border:1px solid #3a3a41;border-radius:14px;background:#202024;box-shadow:0 14px 36px rgba(0,0,0,.5)}.weight-carbs-info strong{font-size:12px}.weight-carbs-info p{margin:6px 0;color:#a1a1aa;font-size:10px;line-height:1.45}.weight-carbs-info small{display:block;color:#85858e;font-size:9px;line-height:1.4;letter-spacing:0}
        .weight-carbs-chart-shell{position:relative;min-height:330px;border-top:1px solid #303036;border-bottom:1px solid #303036}.weight-carbs-chart-shell canvas{display:block;width:100%;height:330px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
        .weight-carbs-tooltip{position:absolute;z-index:4;top:12px;display:grid;gap:3px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(24,24,28,.94);box-shadow:0 10px 28px rgba(0,0,0,.4);pointer-events:none}.weight-carbs-tooltip strong{font-size:11px}.weight-carbs-tooltip span{color:#d2d2d7;font-size:10px}.weight-carbs-tooltip small{color:#8f8f99;font-size:8px;letter-spacing:0}
        .weight-carbs-legend{display:flex;flex-wrap:wrap;gap:8px 13px;color:#92929c;font-size:9px;font-weight:800}.weight-carbs-legend span{display:flex;align-items:center;gap:5px}.weight-carbs-legend i{display:block;width:13px;height:3px;border-radius:999px}.weight-carbs-legend .is-weight{background:${DAILY_WEIGHT_POINT}}.weight-carbs-legend .is-trend{background:${TREND_COLOR}}.weight-carbs-legend .is-carbs{height:8px;border-radius:3px;background:${CARB_COLOR}}
        .weight-carbs-interaction-note{margin:0;color:#777780;font-size:9px;line-height:1.4}
        .weight-carbs-empty{padding:15px;border:1px dashed #3a3a42;border-radius:14px;background:#1b1b1f}.weight-carbs-empty strong{font-size:14px}.weight-carbs-empty p{margin:5px 0 0;color:#9696a0;font-size:11px;line-height:1.45}
        .weight-carbs-analysis{display:grid;gap:4px;padding:13px 14px;border:1px solid rgba(79,168,255,.22);border-radius:15px;background:rgba(79,168,255,.055)}.weight-carbs-analysis>span{color:${CARB_COLOR};font-size:8px;font-weight:900;letter-spacing:.1em}.weight-carbs-analysis strong{font-size:15px}.weight-carbs-analysis b{color:#d5d5da;font-size:10px}.weight-carbs-analysis p{margin:0;color:#b2b2ba;font-size:10.5px;line-height:1.5}.weight-carbs-analysis small{color:#85858e;font-size:9px;line-height:1.45;letter-spacing:0}
        @media(min-width:521px){.weight-carbs-chart-shell{min-height:380px}.weight-carbs-chart-shell canvas{height:380px}}
        @media(max-width:390px){.weight-graph-carousel-pager button{font-size:9px}.weight-carbs-head h3{font-size:18px}}
    `;
    document.head.appendChild(style);
}
