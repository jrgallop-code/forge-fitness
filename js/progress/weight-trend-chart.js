const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const GOAL_WEIGHT_STORAGE_KEY = "level_up_goal_weight";
const DAY_MS = 86400000;
const TREND_GREEN = "#4ade80";

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

function readGoalWeight() {
    const value = Number(localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function calculateMovingAverage(entries) {
    return entries.map(entry => {
        const currentTime = new Date(`${entry.date}T12:00:00`).getTime();
        const windowStart = currentTime - (6 * DAY_MS);
        const windowEntries = entries.filter(item => {
            const itemTime = new Date(`${item.date}T12:00:00`).getTime();
            return itemTime >= windowStart && itemTime <= currentTime;
        });
        const average = windowEntries.reduce((sum, item) => sum + item.weight, 0) / windowEntries.length;
        return { date: entry.date, weight: average };
    });
}

function formatDate(date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    });
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

    legacyCanvas.hidden = true;

    let canvas = document.getElementById("weight-trend-chart");
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "weight-trend-chart";
        canvas.className = legacyCanvas.className;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Weight entries with a 7-day trend line");
        legacyCanvas.insertAdjacentElement("afterend", canvas);
    }

    drawWeightTrendChart(canvas, readWeightEntries(), readGoalWeight());
}

function drawWeightTrendChart(canvas, entries, goalWeight) {
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

    if (entries.length < 2) {
        context.fillStyle = "#a0a0a0";
        context.font = "14px Arial";
        context.textAlign = "left";
        context.fillText("Add at least two entries to display the graph.", 20, 45);
        return;
    }

    const movingAverage = calculateMovingAverage(entries);
    const legend = [
        { type: "point", color: "#ffffff", label: "Daily Weight" },
        { type: "dash", color: TREND_GREEN, label: "Trend Line" },
        ...(goalWeight === null
            ? []
            : [{ type: "dash", color: "#facc15", label: `Goal ${goalWeight.toFixed(1)} lb` }])
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
    const values = [
        ...entries.map(item => item.weight),
        ...movingAverage.map(item => item.weight),
        ...(goalWeight === null ? [] : [goalWeight])
    ];
    const minimum = Math.min(...values) - 1;
    const maximum = Math.max(...values) + 1;
    const range = Math.max(1, maximum - minimum);

    const firstTime = new Date(`${entries[0].date}T12:00:00`).getTime();
    const lastTime = new Date(`${entries.at(-1).date}T12:00:00`).getTime();
    const elapsed = Math.max(1, lastTime - firstTime);

    const xPosition = date => padding.left + (
        (new Date(`${date}T12:00:00`).getTime() - firstTime) / elapsed
    ) * chartWidth;
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

    context.fillStyle = "#a0a0a8";
    context.font = "11px Arial";
    context.textAlign = "left";
    context.fillText(formatDate(entries[0].date), padding.left, height - 16);
    context.textAlign = "right";
    context.fillText(formatDate(entries.at(-1).date), width - padding.right, height - 16);

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

    context.fillStyle = "#ffffff";
    entries.forEach(entry => {
        context.beginPath();
        context.arc(xPosition(entry.date), yPosition(entry.weight), 4, 0, Math.PI * 2);
        context.fill();
    });

    if (goalWeight !== null) {
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
        context.lineWidth = 2;

        if (item.type === "point") {
            context.beginPath();
            context.arc(item.x + 5, item.y, 3.5, 0, Math.PI * 2);
            context.fill();
        }
        else {
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
    if (event.target.closest("#weight-tab, #save-weight-btn, .remove-weight-entry")) {
        window.setTimeout(scheduleEnhance, 0);
    }
});

window.addEventListener("resize", scheduleEnhance);
scheduleEnhance();
