const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const GOAL_WEIGHT_STORAGE_KEY = "level_up_goal_weight";
const NUTRITION_PHASES_STORAGE_KEY = "level_up_nutrition_phases";
const RANGE_STORAGE_KEY = "level_up_weight_chart_range";
const DAY_MS = 86400000;
const TREND_GREEN = "#4ade80";
const DAILY_WEIGHT_LINE = "rgba(190, 190, 200, 0.35)";
const DAILY_WEIGHT_POINT = "rgba(255, 255, 255, 0.88)";
const DAILY_WEIGHT_POINT_RADIUS = 2.5;
const RANGE_STYLE_ID = "level-up-weight-chart-range-styles";
const RANGE_OPTIONS = [
    { id: "1w", label: "1W", days: 7 },
    { id: "1m", label: "1M", days: 30 },
    { id: "3m", label: "3M", days: 90 },
    { id: "6m", label: "6M", days: 180 },
    { id: "phase", label: "PHASE" },
    { id: "all", label: "ALL" }
];

let queued = false;

function readWeightEntries() {
    try {
        const entries = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]");
        if (!Array.isArray(entries)) return [];
        return entries
            .map(entry => ({ date: String(entry?.date || ""), weight: Number(entry?.weight) }))
            .filter(entry => entry.date && Number.isFinite(entry.weight) && entry.weight > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    catch {
        return [];
    }
}

function readNutritionPhases() {
    try {
        const phases = JSON.parse(localStorage.getItem(NUTRITION_PHASES_STORAGE_KEY) || "[]");
        return Array.isArray(phases) ? phases : [];
    }
    catch {
        return [];
    }
}

function readActiveNutritionPhase() {
    return [...readNutritionPhases()]
        .reverse()
        .find(phase => phase?.startDate && !phase?.endDate) || null;
}

function readGoalWeight() {
    const activePhase = readActiveNutritionPhase();
    const phaseValue = Number(activePhase?.goalWeight ?? activePhase?.targetWeight);
    if (Number.isFinite(phaseValue) && phaseValue > 0) return phaseValue;

    const value = Number(localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function readSelectedRange(activePhase) {
    const saved = String(localStorage.getItem(RANGE_STORAGE_KEY) || "").toLowerCase();
    const valid = RANGE_OPTIONS.some(option => option.id === saved);
    if (!valid) return "3m";
    if (saved === "phase" && !activePhase?.startDate) return "3m";
    return saved;
}

function saveSelectedRange(range) {
    if (!RANGE_OPTIONS.some(option => option.id === range)) return;
    localStorage.setItem(RANGE_STORAGE_KEY, range);
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

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function subtractDays(date, days) {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() - days);
    return localDateString(value);
}

function formatDate(date, includeYear = false) {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "2-digit" } : {})
    });
}

function getChartWindow(range, entries, activePhase) {
    const today = localDateString();

    if (range === "phase" && activePhase?.startDate) {
        return {
            startDate: String(activePhase.startDate),
            endDate: today,
            label: "Current phase"
        };
    }

    if (range === "all") {
        return {
            startDate: entries[0]?.date || today,
            endDate: entries.at(-1)?.date || today,
            label: "All time"
        };
    }

    const option = RANGE_OPTIONS.find(item => item.id === range) || RANGE_OPTIONS[2];
    const days = Number(option.days) || 90;
    return {
        startDate: subtractDays(today, days - 1),
        endDate: today,
        label: option.label
    };
}

function filterEntriesToWindow(entries, window) {
    if (!window?.startDate || !window?.endDate) return entries;
    return entries.filter(entry => entry.date >= window.startDate && entry.date <= window.endDate);
}

function ensureRangeStyles() {
    if (document.getElementById(RANGE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = RANGE_STYLE_ID;
    style.textContent = `
        #weight-progress .weight-chart-range-control {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 4px;
            margin: 10px 0 6px;
            padding: 3px;
            border: 1px solid rgba(255,255,255,.08);
            border-radius: 11px;
            background: rgba(255,255,255,.025);
        }
        #weight-progress .weight-chart-range-control button {
            min-width: 0;
            min-height: 32px;
            margin: 0;
            padding: 5px 3px;
            border: 1px solid transparent;
            border-radius: 8px;
            background: transparent;
            color: #8f8f98;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .02em;
            line-height: 1;
            touch-action: manipulation;
        }
        #weight-progress .weight-chart-range-control button[aria-pressed="true"] {
            border-color: rgba(255,49,95,.5);
            background: rgba(255,49,95,.18);
            color: #fff;
            box-shadow: inset 0 0 0 1px rgba(255,49,95,.08);
        }
        #weight-progress .weight-chart-range-control button:disabled {
            opacity: .32;
        }
        @media (max-width: 380px) {
            #weight-progress .weight-chart-range-control {
                gap: 3px;
                padding: 3px;
            }
            #weight-progress .weight-chart-range-control button {
                min-height: 30px;
                padding-inline: 2px;
                font-size: 9px;
            }
        }
    `;
    document.head.appendChild(style);
}

function ensureRangeControls(legacyCanvas, selectedRange, activePhase) {
    const card = legacyCanvas.closest(".weight-chart-card") || legacyCanvas.parentElement;
    if (!card) return null;

    let controls = card.querySelector(".weight-chart-range-control");
    if (!controls) {
        controls = document.createElement("div");
        controls.className = "weight-chart-range-control";
        controls.setAttribute("role", "group");
        controls.setAttribute("aria-label", "Weight chart timeframe");
        controls.innerHTML = RANGE_OPTIONS.map(option => `
            <button type="button" data-weight-chart-range="${option.id}" aria-pressed="false">${option.label}</button>
        `).join("");
        legacyCanvas.insertAdjacentElement("beforebegin", controls);
    }

    controls.querySelectorAll("button[data-weight-chart-range]").forEach(button => {
        const range = button.dataset.weightChartRange;
        const phaseUnavailable = range === "phase" && !activePhase?.startDate;
        button.disabled = phaseUnavailable;
        button.setAttribute("aria-pressed", String(range === selectedRange));
        button.title = phaseUnavailable ? "Start a nutrition phase to use this timeframe" : "";
    });

    return controls;
}

function scheduleEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        enhanceWeightChart();
    });
}

function enhanceWeightChart() {
    const legacyCanvas = document.getElementById("weight-chart");
    if (!legacyCanvas) return;

    ensureRangeStyles();
    legacyCanvas.hidden = true;

    const allEntries = readWeightEntries();
    const activePhase = readActiveNutritionPhase();
    const selectedRange = readSelectedRange(activePhase);
    const window = getChartWindow(selectedRange, allEntries, activePhase);
    const fullMovingAverage = calculateMovingAverage(allEntries);
    const visibleEntries = filterEntriesToWindow(allEntries, window);
    const visibleMovingAverage = filterEntriesToWindow(fullMovingAverage, window);

    ensureRangeControls(legacyCanvas, selectedRange, activePhase);

    let canvas = document.getElementById("weight-trend-chart");
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "weight-trend-chart";
        canvas.className = legacyCanvas.className;
        canvas.setAttribute("role", "img");
        legacyCanvas.insertAdjacentElement("afterend", canvas);
    }

    canvas.setAttribute(
        "aria-label",
        `Weight chart for ${window.label}, showing daily entries and a 7-day trend line`
    );

    drawWeightTrendChart(
        canvas,
        visibleEntries,
        visibleMovingAverage,
        readGoalWeight(),
        window,
        selectedRange,
        allEntries.length
    );
}

function drawWeightTrendChart(canvas, entries, movingAverage, goalWeight, window, selectedRange, totalEntryCount) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const height = 400;
    const scale = window.devicePixelRatio || 1;

    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.height = `${height}px`;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);

    if (!entries.length) {
        context.fillStyle = "#d6d6db";
        context.font = "600 14px Arial";
        context.textAlign = "left";
        context.fillText(totalEntryCount ? "No weight entries in this range." : "Add a weight entry to display the graph.", 20, 50);
        if (totalEntryCount) {
            context.fillStyle = "#8f8f98";
            context.font = "12px Arial";
            context.fillText("Choose a longer timeframe or add a new weigh-in.", 20, 72);
        }
        return;
    }

    const dataValues = [
        ...entries.map(item => item.weight),
        ...movingAverage.map(item => item.weight)
    ].filter(Number.isFinite);

    const dataMinimum = Math.min(...dataValues);
    const dataMaximum = Math.max(...dataValues);
    const dataSpan = Math.max(0.5, dataMaximum - dataMinimum);
    const scalePadding = Math.max(0.75, dataSpan * 0.18);
    let minimum = dataMinimum - scalePadding;
    let maximum = dataMaximum + scalePadding;

    const showGoal = goalWeight !== null && (
        selectedRange === "all" || (goalWeight >= minimum && goalWeight <= maximum)
    );

    if (showGoal && selectedRange === "all") {
        minimum = Math.min(minimum, goalWeight - 1);
        maximum = Math.max(maximum, goalWeight + 1);
    }

    const range = Math.max(1, maximum - minimum);
    const legend = [
        { type: "linepoint", color: DAILY_WEIGHT_LINE, pointColor: DAILY_WEIGHT_POINT, label: "Daily Weight" },
        { type: "dash", color: TREND_GREEN, label: "Trend Line" },
        ...(showGoal
            ? [{ type: "dash", color: "#facc15", label: `Goal ${goalWeight.toFixed(1)} lb` }]
            : [])
    ];

    context.font = "10px Arial";
    const legendLayout = layoutLegend(context, legend, width, 58, 22);
    const padding = {
        left: 58,
        right: 22,
        top: Math.max(48, legendLayout.bottom + 14),
        bottom: 48
    };

    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const firstTime = dateMs(window.startDate || entries[0].date);
    const lastTime = dateMs(window.endDate || entries.at(-1).date);
    const hasTimeSpan = lastTime > firstTime;
    const elapsed = Math.max(1, lastTime - firstTime);

    const xPosition = date => {
        if (!hasTimeSpan) return padding.left + chartWidth / 2;
        return padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth;
    };
    const yPosition = weight => padding.top + ((maximum - weight) / range) * chartHeight;

    context.strokeStyle = "#303037";
    context.lineWidth = 1;
    for (let index = 0; index <= 4; index++) {
        const y = padding.top + (chartHeight * index / 4);
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();

        const value = maximum - (range * index / 4);
        context.fillStyle = "#a0a0a8";
        context.font = "11px Arial";
        context.textAlign = "right";
        context.fillText(value.toFixed(1), padding.left - 8, y + 4);
    }

    const includeYear = (lastTime - firstTime) >= 300 * DAY_MS;
    context.fillStyle = "#a0a0a8";
    context.font = "11px Arial";
    context.textAlign = "left";
    context.fillText(formatDate(window.startDate, includeYear), padding.left, height - 16);
    context.textAlign = "right";
    context.fillText(formatDate(window.endDate, includeYear), width - padding.right, height - 16);

    context.save();
    context.strokeStyle = DAILY_WEIGHT_LINE;
    context.lineWidth = 1.25;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    entries.forEach((entry, index) => {
        const x = xPosition(entry.date);
        const y = yPosition(entry.weight);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();

    if (movingAverage.length) {
        context.save();
        context.strokeStyle = TREND_GREEN;
        context.lineWidth = 1.5;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.setLineDash([6, 5]);
        context.beginPath();
        movingAverage.forEach((entry, index) => {
            const x = xPosition(entry.date);
            const y = yPosition(entry.weight);
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });
        context.stroke();
        context.restore();
    }

    context.fillStyle = DAILY_WEIGHT_POINT;
    entries.forEach(entry => {
        context.beginPath();
        context.arc(xPosition(entry.date), yPosition(entry.weight), DAILY_WEIGHT_POINT_RADIUS, 0, Math.PI * 2);
        context.fill();
    });

    if (showGoal) {
        context.save();
        context.strokeStyle = "#facc15";
        context.lineWidth = 2;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(padding.left, yPosition(goalWeight));
        context.lineTo(width - padding.right, yPosition(goalWeight));
        context.stroke();
        context.restore();
    }

    drawLegend(context, legendLayout.items);
}

function layoutLegend(context, legend, width, startX, rightPadding) {
    const items = [];
    let x = startX;
    let y = 18;
    const rowHeight = 18;
    const maxX = width - rightPadding;

    legend.forEach(item => {
        const markerWidth = item.type === "point" ? 12 : 18;
        const labelWidth = context.measureText(item.label).width;
        const itemWidth = markerWidth + 7 + labelWidth + 18;

        if (x !== startX && x + itemWidth > maxX) {
            x = startX;
            y += rowHeight;
        }

        items.push({ ...item, x, y, markerWidth });
        x += itemWidth;
    });

    return { items, bottom: y + 4 };
}

function drawLegend(context, items) {
    context.font = "10px Arial";
    context.textAlign = "left";

    items.forEach(item => {
        context.save();
        context.strokeStyle = item.color;
        context.fillStyle = item.color;

        if (item.type === "point") {
            context.beginPath();
            context.arc(item.x + 5, item.y, 3, 0, Math.PI * 2);
            context.fill();
        }
        else if (item.type === "linepoint") {
            context.lineWidth = 1.25;
            context.beginPath();
            context.moveTo(item.x, item.y);
            context.lineTo(item.x + item.markerWidth, item.y);
            context.stroke();
            context.fillStyle = item.pointColor || item.color;
            context.beginPath();
            context.arc(item.x + item.markerWidth / 2, item.y, 2.5, 0, Math.PI * 2);
            context.fill();
        }
        else {
            context.lineWidth = 2;
            if (item.type === "dash") context.setLineDash([5, 4]);
            context.beginPath();
            context.moveTo(item.x, item.y);
            context.lineTo(item.x + item.markerWidth, item.y);
            context.stroke();
        }
        context.restore();

        context.fillStyle = "#b9b9c1";
        context.fillText(item.label, item.x + item.markerWidth + 7, item.y + 3);
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(scheduleEnhance).observe(content, { childList: true, subtree: true });
}

document.addEventListener("click", event => {
    const rangeButton = event.target.closest("button[data-weight-chart-range]");
    if (rangeButton) {
        saveSelectedRange(rangeButton.dataset.weightChartRange);
        scheduleEnhance();
        return;
    }

    if (event.target.closest("#weight-tab, #save-weight-btn, .remove-weight-entry")) {
        window.setTimeout(scheduleEnhance, 0);
    }
});

window.addEventListener("levelup:nutrition-updated", scheduleEnhance);
window.addEventListener("levelup:nutrition-phase-updated", scheduleEnhance);
window.addEventListener("resize", scheduleEnhance);
scheduleEnhance();
