const RED = "#ff3139";
const MUTED_RED = "rgba(205, 54, 64, 0.78)";

export function drawTrainingBarChart(canvas, points, options = {}) {
    const context = canvas?.getContext?.("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 700;
    const height = canvas.clientHeight || 280;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const axisLabel = options.axisLabel || "Value";
    const rangeLabel = options.rangeLabel || "selected timeframe";
    canvas.setAttribute("aria-label", `${axisLabel} for ${rangeLabel}`);

    const padding = { top: 28, right: 14, bottom: 40, left: 42 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const values = points.map(point => Number(point.value) || 0);
    const peak = Math.max(0, ...values);
    const maximum = niceMaximum(peak);

    for (let tick = 0; tick < 3; tick++) {
        const value = maximum - maximum * tick / 2;
        const y = padding.top + plotHeight * tick / 2;
        context.strokeStyle = "rgba(255, 255, 255, 0.06)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillStyle = "rgba(181, 181, 190, 0.68)";
        context.font = "500 10px Arial";
        context.textAlign = "right";
        context.fillText(formatValue(value), padding.left - 7, y + 3.5);
    }

    if (!points.length) {
        context.fillStyle = "rgba(181, 181, 190, 0.72)";
        context.font = "600 12px Arial";
        context.textAlign = "center";
        context.fillText("No workout history yet", padding.left + plotWidth / 2, padding.top + plotHeight / 2);
        return;
    }

    const slot = plotWidth / points.length;
    const barWidth = Math.max(4, Math.min(slot * 0.58, 30));
    const labelIndexes = selectLabelIndexes(points.length, plotWidth);
    const lastIndex = points.length - 1;

    points.forEach((point, index) => {
        const value = values[index];
        const barHeight = maximum > 0 ? value / maximum * plotHeight : 0;
        const x = padding.left + index * slot + (slot - barWidth) / 2;
        const y = padding.top + plotHeight - barHeight;
        const centerX = x + barWidth / 2;
        const latest = index === lastIndex;

        if (barHeight > 0) {
            const gradient = context.createLinearGradient(0, y, 0, padding.top + plotHeight);
            gradient.addColorStop(0, latest ? RED : MUTED_RED);
            gradient.addColorStop(1, latest ? "rgba(111, 22, 32, 0.78)" : "rgba(91, 24, 32, 0.6)");
            context.save();
            if (latest) {
                context.shadowColor = "rgba(255, 49, 57, 0.34)";
                context.shadowBlur = 11;
            }
            roundedTopBar(context, x, y, barWidth, barHeight, Math.min(7, barWidth / 2));
            context.fillStyle = gradient;
            context.fill();
            context.restore();
        }

        if (labelIndexes.has(index)) {
            context.fillStyle = latest ? "rgba(235, 235, 240, 0.9)" : "rgba(174, 174, 183, 0.7)";
            context.font = latest ? "700 10px Arial" : "500 10px Arial";
            context.textAlign = "center";
            context.fillText(point.label, centerX, height - 15);
        }

        if (shouldShowValue(values, index, peak)) {
            context.fillStyle = latest ? "#ffffff" : "rgba(235, 235, 239, 0.86)";
            context.font = latest ? "800 10px Arial" : "650 10px Arial";
            context.textAlign = "center";
            context.fillText(formatValue(value), centerX, Math.max(13, y - 7));
        }
    });
}

function roundedTopBar(context, x, y, width, height, radius) {
    const bottom = y + height;
    const rounded = Math.min(radius, height, width / 2);
    context.beginPath();
    context.moveTo(x, bottom);
    context.lineTo(x, y + rounded);
    context.quadraticCurveTo(x, y, x + rounded, y);
    context.lineTo(x + width - rounded, y);
    context.quadraticCurveTo(x + width, y, x + width, y + rounded);
    context.lineTo(x + width, bottom);
    context.closePath();
}

function selectLabelIndexes(count, plotWidth) {
    const result = new Set();
    if (!count) return result;
    const maximumLabels = Math.max(2, Math.floor(plotWidth / 72));
    const visibleCount = Math.min(count, maximumLabels);
    if (visibleCount === 1) return new Set([0]);
    for (let index = 0; index < visibleCount; index++) {
        result.add(Math.round(index * (count - 1) / (visibleCount - 1)));
    }
    return result;
}

function shouldShowValue(values, index, peak) {
    const value = values[index];
    if (value <= 0) return false;
    if (values.length <= 7) return true;
    if (index === values.length - 1 || value === peak) return true;
    return index === 0 || value !== values[index - 1];
}

function niceMaximum(value) {
    if (!Number.isFinite(value) || value <= 0) return 4;
    const roughStep = value / 2;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const normalized = roughStep / magnitude;
    const steps = [1, 2, 2.5, 3, 4, 5, 10];
    const step = (steps.find(candidate => candidate >= normalized) || 10) * magnitude;
    return Math.max(4, Math.ceil(value / step) * step);
}

function formatValue(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
