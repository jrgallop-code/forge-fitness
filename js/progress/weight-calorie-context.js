import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_KEY = "forge_weight_entries";
const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_KEY = "level_up_goal_weight";
const RANGE_KEY = "level_up_weight_chart_range";
const STYLE_ID = "level-up-weight-calorie-context-styles";
const DAY_MS = 86400000;
const TREND_GREEN = "#45cb75";
const TREND_GLOW = "rgba(69,203,117,.32)";
const DAILY_WEIGHT = "rgba(126,194,151,.82)";
const DAILY_WEIGHT_LINE = "rgba(112,181,137,.34)";
const CALORIE_COLOR = "#ff5a5f";
const CALORIE_FADE = "rgba(255,90,95,.28)";
const RANGE_OPTIONS = {
    "1w": { days: 7 },
    "1m": { days: 30 },
    "3m": { days: 90 },
    "6m": { days: 180 },
    phase: {},
    all: {}
};

let observer = null;
let refreshQueued = false;
let selectedCalorieDate = null;
const boundWeightCanvases = new WeakSet();
const boundCalorieCanvases = new WeakSet();
const boundPagers = new WeakSet();

export function initializeWeightCalorieContext(root = document) {
    ensureStyles();
    ensureEnhancements(root);

    if (!observer) {
        const target = root.querySelector?.("#weight-progress") || document.querySelector("#weight-progress");
        if (target) {
            observer = new MutationObserver(() => scheduleRefresh(document));
            observer.observe(target, { childList: true, subtree: true });
        }
    }

    if (document.documentElement.dataset.weightCalorieContextEvents !== "1") {
        document.documentElement.dataset.weightCalorieContextEvents = "1";
        [
            "levelup:food-log-updated",
            "levelup:weight-updated",
            "levelup:units-changed",
            "levelup:nutrition-updated",
            "levelup:nutrition-phase-updated"
        ].forEach(name => window.addEventListener(name, () => scheduleRefresh(document)));
        window.addEventListener("resize", () => scheduleRefresh(document));
        document.addEventListener("click", event => {
            if (event.target.closest?.("button[data-weight-chart-range]")) {
                hideWeightSnapshot(document);
                selectedCalorieDate = null;
                setTimeout(() => scheduleRefresh(document), 0);
            }
        });
    }
}

function scheduleRefresh(root) {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        ensureEnhancements(root);
    });
}

function ensureEnhancements(root) {
    const scope = root?.querySelector ? root : document;
    const card = scope.querySelector?.("#weight-progress .weight-chart-card")
        || document.querySelector("#weight-progress .weight-chart-card");
    if (!card) return;

    bindWeightSnapshot(card);
    ensureCalorieSlide(card);
    refreshCalorieSlide(card);
}

function bindWeightSnapshot(card) {
    const canvas = card.querySelector("#weight-trend-chart");
    if (!canvas) return;

    const slide = canvas.closest('[data-weight-graph-slide-v2="trend"]') || canvas.parentElement;
    if (slide) slide.classList.add("weight-trend-interactive-slide");
    ensureWeightSnapshotNodes(slide || card);

    if (boundWeightCanvases.has(canvas)) return;
    boundWeightCanvases.add(canvas);

    let startX = 0;
    let startY = 0;
    let moved = false;

    canvas.addEventListener("pointerdown", event => {
        startX = event.clientX;
        startY = event.clientY;
        moved = false;
    }, { passive: true });

    canvas.addEventListener("pointermove", event => {
        if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) moved = true;
    }, { passive: true });

    canvas.addEventListener("pointerup", event => {
        if (moved) return;
        selectWeightPoint(canvas, card, event.clientX, event.clientY, event.pointerType === "mouse" ? 15 : 24);
    }, { passive: true });
}

function ensureWeightSnapshotNodes(container) {
    if (!container || container.querySelector("[data-weight-point-tooltip]")) return;
    const tooltip = document.createElement("div");
    tooltip.className = "weight-point-tooltip";
    tooltip.dataset.weightPointTooltip = "1";
    tooltip.hidden = true;
    container.appendChild(tooltip);

    const marker = document.createElement("i");
    marker.className = "weight-point-marker";
    marker.dataset.weightPointMarker = "1";
    marker.hidden = true;
    container.appendChild(marker);
}

function selectWeightPoint(canvas, card, clientX, clientY, tolerance) {
    const state = buildWeightState();
    if (!state.entries.length) return hideWeightSnapshot(card);

    const geometry = weightGeometry(canvas, state);
    if (!geometry) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let nearest = null;
    let nearestDistance = Infinity;

    state.entries.forEach(entry => {
        const px = geometry.xPosition(entry.date);
        const py = geometry.yPosition(entry.weight);
        const distance = Math.hypot(px - x, py - y);
        if (distance < nearestDistance) {
            nearest = entry;
            nearestDistance = distance;
        }
    });

    if (!nearest || nearestDistance > tolerance) {
        hideWeightSnapshot(card);
        return;
    }

    const container = canvas.closest('[data-weight-graph-slide-v2="trend"]') || canvas.parentElement || card;
    ensureWeightSnapshotNodes(container);
    const tooltip = container.querySelector("[data-weight-point-tooltip]");
    const marker = container.querySelector("[data-weight-point-marker]");
    if (!tooltip || !marker) return;

    if (tooltip.dataset.date === nearest.date && !tooltip.hidden) {
        hideWeightSnapshot(container);
        return;
    }

    const trend = state.trendByDate.get(nearest.date);
    const unit = massUnit();
    const weight = displayMass(nearest.weight);
    const trendWeight = Number.isFinite(trend) ? displayMass(trend) : null;
    tooltip.dataset.date = nearest.date;
    tooltip.innerHTML = `
        <strong>${formatDate(nearest.date)}</strong>
        <span><b>Weight</b>${weight.toFixed(1)} ${unit}</span>
        <span><b>7-day trend</b>${Number.isFinite(trendWeight) ? `${trendWeight.toFixed(1)} ${unit}` : "—"}</span>
    `;
    tooltip.hidden = false;
    marker.hidden = false;

    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const pointX = canvasRect.left - containerRect.left + geometry.xPosition(nearest.date);
    const pointY = canvasRect.top - containerRect.top + geometry.yPosition(nearest.weight);
    marker.style.left = `${pointX}px`;
    marker.style.top = `${pointY}px`;

    const tooltipWidth = Math.min(190, Math.max(150, container.clientWidth - 24));
    tooltip.style.width = `${tooltipWidth}px`;
    tooltip.style.left = `${Math.max(8, Math.min(container.clientWidth - tooltipWidth - 8, pointX - tooltipWidth / 2))}px`;
    tooltip.style.top = `${Math.max(8, pointY - 88)}px`;
}

function hideWeightSnapshot(root) {
    const scope = root?.querySelector ? root : document;
    const tooltip = scope.querySelector?.("[data-weight-point-tooltip]") || document.querySelector("[data-weight-point-tooltip]");
    const marker = scope.querySelector?.("[data-weight-point-marker]") || document.querySelector("[data-weight-point-marker]");
    if (tooltip) {
        tooltip.hidden = true;
        delete tooltip.dataset.date;
    }
    if (marker) marker.hidden = true;
}

function weightGeometry(canvas, state) {
    if (!state.entries.length) return null;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const height = width <= 520 ? 330 : 380;
    const padding = { left: 48, right: 18, top: 20, bottom: 40 };
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const values = [...state.entries.map(item => item.weight), ...state.movingAverage.map(item => item.weight)].filter(Number.isFinite);
    if (!values.length) return null;
    const dataMinimum = Math.min(...values);
    const dataMaximum = Math.max(...values);
    const dataSpan = Math.max(.5, dataMaximum - dataMinimum);
    const scalePadding = Math.max(.75, dataSpan * .18);
    let minimum = dataMinimum - scalePadding;
    let maximum = dataMaximum + scalePadding;
    const goal = readGoalWeight();
    const goalInRange = Number.isFinite(goal) && (state.range === "all" || (goal >= minimum && goal <= maximum));
    if (goalInRange && state.range === "all") {
        minimum = Math.min(minimum, goal - 1);
        maximum = Math.max(maximum, goal + 1);
    }
    const span = Math.max(1, maximum - minimum);
    const firstTime = dateMs(state.window.startDate || state.entries[0].date);
    const lastTime = dateMs(state.window.endDate || state.entries.at(-1).date);
    const elapsed = Math.max(1, lastTime - firstTime);
    return {
        xPosition: date => padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth,
        yPosition: weight => padding.top + ((maximum - weight) / span) * chartHeight
    };
}

function ensureCalorieSlide(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    const pager = card.querySelector(".weight-graph-carousel-pager-v2");
    if (!track || !pager) return;

    track.querySelector('[data-weight-graph-slide-v2="sodium"]')?.remove();

    let slide = track.querySelector('[data-weight-graph-slide-v2="calories"]');
    if (!slide) {
        slide = document.createElement("section");
        slide.className = "weight-graph-carousel-slide-v2 is-calories";
        slide.dataset.weightGraphSlideV2 = "calories";
        slide.innerHTML = renderCalorieSlide();
        track.appendChild(slide);
    }

    let button = pager.querySelector('[data-weight-graph-page-v2="2"]');
    if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.dataset.weightGraphPageV2 = "2";
        button.setAttribute("aria-pressed", "false");
        pager.appendChild(button);
    }
    button.textContent = "Weight + Calories";

    pager.classList.add("has-three-weight-pages");
    if (!boundPagers.has(pager)) {
        boundPagers.add(pager);
        track.addEventListener("scroll", () => requestAnimationFrame(() => syncThreePagePager(card)), { passive: true });
    }
    syncThreePagePager(card);

    const canvas = slide.querySelector("[data-weight-calories-canvas]");
    if (canvas && !boundCalorieCanvases.has(canvas)) bindCalorieInteraction(canvas, card);
}

function renderCalorieSlide() {
    return `
        <div class="weight-calories-head">
            <div>
                <span class="weight-chart-kicker">WEIGHT CONTEXT</span>
                <h3>Weight &amp; Calories</h3>
                <p>Same 7-day weight trend · daily calorie intake</p>
            </div>
            <details class="weight-calories-info">
                <summary aria-label="How calorie intake relates to weight trend">i</summary>
                <div>
                    <strong>How calories relate to weight trend</strong>
                    <p>Daily calories can fluctuate, so the most useful signal is how intake lines up with your longer-term weight trend across days and weeks.</p>
                    <small>Short-term scale changes can still reflect water, glycogen, food volume and training-related inflammation.</small>
                </div>
            </details>
        </div>
        <div class="weight-calories-chart-shell">
            <canvas data-weight-calories-canvas role="img" aria-label="Body weight, seven-day weight trend, and daily calorie intake"></canvas>
            <div class="weight-calories-tooltip" data-weight-calories-tooltip hidden></div>
        </div>
        <div class="weight-calories-legend" aria-hidden="true">
            <span><i class="is-weight"></i>Daily weight</span>
            <span><i class="is-trend"></i>7-day trend</span>
            <span><i class="is-calories"></i>Calories</span>
        </div>
        <p class="weight-calories-note">Tap a day for weight, trend and calorie values. Today appears after calorie tracking is marked complete.</p>
        <div class="weight-calories-empty" data-weight-calories-empty hidden>
            <strong>More calorie data needed</strong>
            <p>Log food to compare daily calorie intake with your weight trend.</p>
        </div>
    `;
}

function syncThreePagePager(card) {
    const track = card.querySelector("[data-weight-graph-carousel-track-v2]");
    if (!track) return;
    const index = Math.max(0, Math.min(2, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    card.querySelectorAll("[data-weight-graph-page-v2]").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.weightGraphPageV2) === index));
    });
    if (index === 2) refreshCalorieSlide(card);
}

function refreshCalorieSlide(card) {
    const slide = card.querySelector('[data-weight-graph-slide-v2="calories"]');
    const canvas = slide?.querySelector("[data-weight-calories-canvas]");
    if (!slide || !canvas) return;
    const state = buildCalorieState();
    canvas.__weightCalorieState = state;
    const empty = slide.querySelector("[data-weight-calories-empty]");
    const calorieDays = state.series.filter(day => Number.isFinite(day.calories));
    if (empty) empty.hidden = calorieDays.length > 0;
    if (selectedCalorieDate && !state.series.some(day => day.date === selectedCalorieDate)) selectedCalorieDate = null;
    drawCalorieChart(canvas, state, selectedCalorieDate);
    updateCalorieTooltip(card, state, selectedCalorieDate);
    if (!boundCalorieCanvases.has(canvas)) bindCalorieInteraction(canvas, card);
}

function bindCalorieInteraction(canvas, card) {
    boundCalorieCanvases.add(canvas);
    let startX = 0;
    let startY = 0;
    let moved = false;
    canvas.addEventListener("pointerdown", event => {
        startX = event.clientX;
        startY = event.clientY;
        moved = false;
    }, { passive: true });
    canvas.addEventListener("pointermove", event => {
        if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) moved = true;
    }, { passive: true });
    canvas.addEventListener("pointerup", event => {
        if (moved) return;
        const state = canvas.__weightCalorieState || buildCalorieState();
        const candidates = state.series.filter(day => Number.isFinite(day.weight) || Number.isFinite(day.calories));
        if (!candidates.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const first = dateMs(state.window.startDate);
        const elapsed = Math.max(1, dateMs(state.window.endDate) - first);
        const chartWidth = Math.max(1, rect.width - 96);
        const ratio = Math.max(0, Math.min(1, (x - 48) / chartWidth));
        const target = first + ratio * elapsed;
        let nearest = candidates[0];
        let distance = Infinity;
        candidates.forEach(day => {
            const delta = Math.abs(dateMs(day.date) - target);
            if (delta < distance) {
                distance = delta;
                nearest = day;
            }
        });
        selectedCalorieDate = selectedCalorieDate === nearest.date ? null : nearest.date;
        drawCalorieChart(canvas, state, selectedCalorieDate);
        updateCalorieTooltip(card, state, selectedCalorieDate);
    }, { passive: true });
}

function buildWeightState() {
    const allEntries = readWeights();
    const phase = readActivePhase();
    const range = readRange(phase);
    const window = chartWindow(range, allEntries, phase);
    const fullMoving = movingAverage(allEntries);
    const entries = allEntries.filter(item => item.date >= window.startDate && item.date <= window.endDate);
    const visibleMoving = fullMoving.filter(item => item.date >= window.startDate && item.date <= window.endDate);
    return {
        entries,
        movingAverage: visibleMoving,
        trendByDate: new Map(visibleMoving.map(item => [item.date, item.weight])),
        window,
        range
    };
}

function buildCalorieState() {
    const weightState = buildWeightState();
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const completedDays = readJson(FOOD_COMPLETE_KEY, {});
    const today = localDate();
    const weightByDate = new Map(weightState.entries.map(item => [item.date, item.weight]));
    const dates = datesBetween(weightState.window.startDate, weightState.window.endDate);
    const series = dates.map(date => {
        const entries = Array.isArray(foodLog?.[date]) ? foodLog[date] : [];
        const includeCalories = date !== today || completedDays?.[date] === true;
        const calories = includeCalories && entries.length
            ? entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0)
            : null;
        return {
            date,
            weight: weightByDate.get(date) ?? null,
            trend: weightState.trendByDate.get(date) ?? null,
            calories: Number.isFinite(calories) ? calories : null
        };
    });
    return { ...weightState, series };
}

function drawCalorieChart(canvas, state, activeDate) {
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
    const weightValues = [...state.series.map(day => day.weight), ...state.movingAverage.map(day => day.weight)]
        .filter(Number.isFinite).map(value => displayMass(value));
    const calorieValues = state.series.map(day => day.calories).filter(Number.isFinite);
    if (!weightValues.length && !calorieValues.length) return;

    const weightMin = weightValues.length ? Math.min(...weightValues) : 0;
    const weightMax = weightValues.length ? Math.max(...weightValues) : 1;
    const weightSpan = Math.max(unit === "kg" ? .45 : 1, weightMax - weightMin);
    const weightPad = Math.max(unit === "kg" ? .35 : .75, weightSpan * .18);
    const minimum = weightMin - weightPad;
    const maximum = weightMax + weightPad;
    const calorieMax = Math.max(500, Math.ceil(Math.max(1, ...calorieValues) / 500) * 500);
    const firstTime = dateMs(state.window.startDate);
    const lastTime = dateMs(state.window.endDate);
    const elapsed = Math.max(1, lastTime - firstTime);
    const xPosition = date => padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth;
    const yWeight = weight => padding.top + ((maximum - displayMass(weight)) / Math.max(.001, maximum - minimum)) * chartHeight;
    const yCalories = calories => padding.top + chartHeight - (calories / calorieMax) * chartHeight;

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
        context.fillText(String(Math.round(calorieMax - calorieMax * row / 2)), width - padding.right + 7, y);
    }
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.fillText(unit, 5, 12);
    context.textAlign = "right";
    context.fillText("kcal", width - 5, 12);

    const barWidth = Math.max(2, Math.min(14, chartWidth / Math.max(1, state.series.length) * .52));
    state.series.forEach(day => {
        if (!Number.isFinite(day.calories)) return;
        const x = xPosition(day.date);
        const y = yCalories(day.calories);
        context.globalAlpha = activeDate === day.date ? .94 : .38;
        context.fillStyle = activeDate === day.date ? CALORIE_COLOR : CALORIE_FADE;
        roundRect(context, x - barWidth / 2, y, barWidth, padding.top + chartHeight - y, Math.min(4, barWidth / 2));
        context.fill();
    });
    context.globalAlpha = 1;

    const weightPoints = state.series.filter(day => Number.isFinite(day.weight));
    if (weightPoints.length) {
        context.save();
        context.strokeStyle = DAILY_WEIGHT_LINE;
        context.lineWidth = 1.5;
        context.beginPath();
        weightPoints.forEach((entry, index) => {
            const x = xPosition(entry.date);
            const y = yWeight(entry.weight);
            if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
        context.restore();
    }

    const trendPoints = state.movingAverage.map(entry => ({ x: xPosition(entry.date), y: yWeight(entry.weight) }));
    if (trendPoints.length) {
        context.save();
        context.strokeStyle = TREND_GREEN;
        context.shadowColor = TREND_GLOW;
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
        context.arc(xPosition(entry.date), yWeight(entry.weight), selected ? 5 : 2.6, 0, Math.PI * 2);
        context.fillStyle = selected ? "#fff" : DAILY_WEIGHT;
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

    drawDateLabels(context, state.series, xPosition, padding.top + chartHeight + 20, state.range);
}

function updateCalorieTooltip(card, state, date) {
    const tooltip = card.querySelector("[data-weight-calories-tooltip]");
    if (!tooltip) return;
    if (!date) {
        tooltip.hidden = true;
        return;
    }
    const day = state.series.find(item => item.date === date);
    if (!day) {
        tooltip.hidden = true;
        return;
    }
    const unit = massUnit();
    const weight = Number.isFinite(day.weight) ? displayMass(day.weight) : null;
    const trend = Number.isFinite(day.trend) ? displayMass(day.trend) : null;
    tooltip.innerHTML = `
        <strong>${formatDate(date)}</strong>
        <span>${Number.isFinite(weight) ? `${weight.toFixed(1)} ${unit}` : "No weight logged"}</span>
        <span>${Number.isFinite(trend) ? `${trend.toFixed(1)} ${unit} trend` : "Trend unavailable"}</span>
        <span class="is-calorie-value">${Number.isFinite(day.calories) ? `${Math.round(day.calories).toLocaleString()} kcal` : "Calories unavailable"}</span>
    `;
    tooltip.hidden = false;
    const shell = card.querySelector(".weight-calories-chart-shell");
    if (!shell) return;
    const first = dateMs(state.window.startDate);
    const elapsed = Math.max(1, dateMs(state.window.endDate) - first);
    const x = 48 + ((dateMs(date) - first) / elapsed) * Math.max(1, shell.clientWidth - 96);
    const tooltipWidth = Math.min(190, Math.max(150, shell.clientWidth - 24));
    tooltip.style.width = `${tooltipWidth}px`;
    tooltip.style.left = `${Math.max(8, Math.min(shell.clientWidth - tooltipWidth - 8, x - tooltipWidth / 2))}px`;
}

function readWeights() {
    const entries = readJson(WEIGHT_KEY, []);
    return (Array.isArray(entries) ? entries : [])
        .map(item => ({ date: String(item?.date || ""), weight: Number(item?.weight) }))
        .filter(item => item.date && Number.isFinite(item.weight) && item.weight > 0 && item.date <= localDate())
        .sort((a, b) => dateMs(a.date) - dateMs(b.date));
}

function movingAverage(entries) {
    return entries.map(entry => {
        const current = dateMs(entry.date);
        const start = current - 6 * DAY_MS;
        const windowEntries = entries.filter(item => {
            const value = dateMs(item.date);
            return value >= start && value <= current;
        });
        return {
            date: entry.date,
            weight: windowEntries.reduce((sum, item) => sum + item.weight, 0) / windowEntries.length
        };
    });
}

function readActivePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null : null;
}

function readGoalWeight() {
    const phase = readActivePhase();
    const phaseGoal = Number(phase?.goalWeight ?? phase?.targetWeight);
    if (Number.isFinite(phaseGoal) && phaseGoal > 0) return phaseGoal;
    const stored = Number(localStorage.getItem(GOAL_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
}

function readRange(activePhase) {
    const value = String(localStorage.getItem(RANGE_KEY) || "3m").toLowerCase();
    if (!RANGE_OPTIONS[value]) return "3m";
    if (value === "phase" && !activePhase?.startDate) return "3m";
    return value;
}

function chartWindow(range, weights, phase) {
    const today = localDate();
    if (range === "phase" && phase?.startDate) return { startDate: String(phase.startDate), endDate: today };
    if (range === "all") return { startDate: weights[0]?.date || today, endDate: weights.at(-1)?.date || today };
    const days = Number(RANGE_OPTIONS[range]?.days || 90);
    return { startDate: shiftDate(today, -(days - 1)), endDate: today };
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

function drawDateLabels(context, series, xPosition, y, range) {
    const desired = range === "1w" ? 7 : 6;
    const step = Math.max(1, Math.ceil(series.length / desired));
    context.fillStyle = "#777780";
    context.font = "800 8px Arial";
    context.textAlign = "center";
    series.forEach((day, index) => {
        if (index !== 0 && index !== series.length - 1 && index % step !== 0) return;
        context.fillText(formatDate(day.date), xPosition(day.date), y);
    });
}

function traceSmoothLine(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    if (points.length === 1) return;
    for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    context.lineTo(points.at(-1).x, points.at(-1).y);
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

function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
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

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    }
    catch {
        return fallback;
    }
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress .weight-trend-interactive-slide{position:relative}
        #weight-progress .weight-point-tooltip{position:absolute;z-index:12;display:grid;gap:4px;padding:9px 10px;border:1px solid rgba(255,255,255,.15);border-radius:11px;background:rgba(24,24,28,.98);box-shadow:0 10px 28px rgba(0,0,0,.42);pointer-events:none}
        #weight-progress .weight-point-tooltip[hidden]{display:none!important}
        #weight-progress .weight-point-tooltip strong{font-size:11px;color:#fff}
        #weight-progress .weight-point-tooltip span{display:flex;justify-content:space-between;gap:12px;color:#d2d2d7;font-size:10px}
        #weight-progress .weight-point-tooltip b{color:#8f8f98;font-size:9px}
        #weight-progress .weight-point-marker{position:absolute;z-index:11;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid ${TREND_GREEN};border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(69,203,117,.16);pointer-events:none}
        #weight-progress .weight-point-marker[hidden]{display:none!important}
        #weight-progress .weight-graph-carousel-pager-v2.has-three-weight-pages{grid-template-columns:repeat(3,minmax(0,1fr))}
        #weight-progress .weight-graph-carousel-pager-v2.has-three-weight-pages button{padding-inline:2px;font-size:8.5px}
        #weight-progress .weight-graph-carousel-slide-v2.is-calories{padding:0 1px}
        #weight-progress .weight-calories-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        #weight-progress .weight-calories-head h3{margin:3px 0;font-size:18px}
        #weight-progress .weight-calories-head p{margin:0;color:#9898a3;font-size:10px}
        #weight-progress .weight-calories-info{position:relative}
        #weight-progress .weight-calories-info summary{display:grid;place-items:center;width:30px;height:30px;border:1px solid #3b3b42;border-radius:50%;background:#242429;color:#c6c6cd;font-weight:900;list-style:none}
        #weight-progress .weight-calories-info summary::-webkit-details-marker{display:none}
        #weight-progress .weight-calories-info>div{position:absolute;z-index:14;top:36px;right:0;width:min(300px,calc(100vw - 52px));padding:12px;border:1px solid #3a3a41;border-radius:14px;background:#202024;box-shadow:0 14px 36px rgba(0,0,0,.5)}
        #weight-progress .weight-calories-info p{margin:6px 0;color:#a1a1aa;font-size:10px;line-height:1.45}
        #weight-progress .weight-calories-info small{color:#85858e;font-size:9px;line-height:1.4}
        #weight-progress .weight-calories-chart-shell{position:relative;min-height:330px;border-top:1px solid #303036;border-bottom:1px solid #303036}
        #weight-progress .weight-calories-chart-shell canvas{display:block;width:100%;height:330px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
        #weight-progress .weight-calories-tooltip{position:absolute;z-index:5;top:12px;display:grid;gap:3px;padding:9px 10px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(24,24,28,.97);box-shadow:0 10px 28px rgba(0,0,0,.4);pointer-events:none}
        #weight-progress .weight-calories-tooltip[hidden]{display:none!important}
        #weight-progress .weight-calories-tooltip strong{font-size:11px}
        #weight-progress .weight-calories-tooltip span{color:#d2d2d7;font-size:10px}
        #weight-progress .weight-calories-tooltip .is-calorie-value{color:${CALORIE_COLOR}}
        #weight-progress .weight-calories-legend{display:flex;flex-wrap:wrap;gap:8px 13px;margin-top:9px;color:#92929c;font-size:9px;font-weight:800}
        #weight-progress .weight-calories-legend span{display:flex;align-items:center;gap:5px}
        #weight-progress .weight-calories-legend i{display:block;width:13px;height:3px;border-radius:999px}
        #weight-progress .weight-calories-legend .is-weight{background:${DAILY_WEIGHT}}
        #weight-progress .weight-calories-legend .is-trend{background:${TREND_GREEN}}
        #weight-progress .weight-calories-legend .is-calories{height:8px;border-radius:3px;background:${CALORIE_COLOR}}
        #weight-progress .weight-calories-note{margin:0;color:#777780;font-size:8.5px}
        #weight-progress .weight-calories-empty{margin-top:8px;padding:12px 13px;border:1px dashed rgba(255,90,95,.28);border-radius:13px;background:rgba(255,90,95,.045)}
        #weight-progress .weight-calories-empty strong{font-size:12px}
        #weight-progress .weight-calories-empty p{margin:4px 0 0;color:#9696a0;font-size:9.5px;line-height:1.45}
        @media(max-width:520px){#weight-progress .weight-calories-chart-shell,#weight-progress .weight-calories-chart-shell canvas{min-height:330px;height:330px}}
    `;
    document.head.appendChild(style);
}
