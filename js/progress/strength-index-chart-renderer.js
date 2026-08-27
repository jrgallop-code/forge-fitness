const TREND_RED = "#ff3139";
const TREND_RED_GLOW = "rgba(255, 49, 57, 0.32)";
const POINT_RED = "#c94c55";

export function drawStrengthIndexChart(canvas, points) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 700;
    const height = canvas.clientHeight || 300;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { top: 24, right: 18, bottom: 40, left: 46 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);

    if (!points.length) {
        context.fillStyle = "#888892";
        context.font = "600 12px Arial";
        context.textAlign = "center";
        context.fillText("No strength-index data in this timeframe", width / 2, height / 2);
        return;
    }

    const values = points.map(point => point.value);
    const rawMinimum = Math.min(100, ...values);
    const rawMaximum = Math.max(100, ...values);
    const range = Math.max(4, rawMaximum - rawMinimum);
    const margin = Math.max(2, range * 0.2);
    const axisMinimum = Math.floor((rawMinimum - margin) / 2) * 2;
    const axisMaximum = Math.ceil((rawMaximum + margin) / 2) * 2;
    const axisRange = Math.max(4, axisMaximum - axisMinimum);
    const yFor = value => height - padding.bottom - ((value - axisMinimum) / axisRange) * plotHeight;
    const xFor = index => points.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + index / (points.length - 1) * plotWidth;

    for (let tick = 0; tick <= 2; tick++) {
        const value = axisMinimum + axisRange * tick / 2;
        const y = yFor(value);
        context.strokeStyle = "rgba(255, 255, 255, 0.055)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillStyle = "rgba(185, 185, 193, 0.72)";
        context.font = "500 10px Arial";
        context.textAlign = "right";
        context.fillText(value.toFixed(0), padding.left - 7, y + 4);
    }

    const baselineY = yFor(100);
    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.28)";
    context.lineWidth = 1.25;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(padding.left, baselineY);
    context.lineTo(width - padding.right, baselineY);
    context.stroke();
    context.restore();

    const baselineLabel = "Baseline 100";
    context.font = "700 9px Arial";
    const baselineWidth = context.measureText(baselineLabel).width + 12;
    const baselineX = width - padding.right - baselineWidth;
    const baselineLabelY = Math.max(padding.top + 2, baselineY - 18);
    context.fillStyle = "rgba(26, 24, 27, 0.9)";
    context.fillRect(baselineX, baselineLabelY, baselineWidth, 15);
    context.fillStyle = "rgba(225, 225, 230, 0.82)";
    context.textAlign = "center";
    context.fillText(baselineLabel, baselineX + baselineWidth / 2, baselineLabelY + 10.5);

    const coordinates = points.map((point, index) => ({
        ...point,
        x: xFor(index),
        y: yFor(point.value)
    }));

    if (coordinates.length > 1) {
        const gradient = context.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, "rgba(255, 49, 57, 0.28)");
        gradient.addColorStop(0.56, "rgba(157, 31, 43, 0.13)");
        gradient.addColorStop(1, "rgba(67, 16, 24, 0)");
        context.save();
        context.beginPath();
        context.moveTo(coordinates[0].x, height - padding.bottom);
        coordinates.forEach(point => context.lineTo(point.x, point.y));
        context.lineTo(coordinates.at(-1).x, height - padding.bottom);
        context.closePath();
        context.fillStyle = gradient;
        context.fill();
        context.restore();
    }

    context.save();
    context.strokeStyle = TREND_RED;
    context.shadowColor = TREND_RED_GLOW;
    context.shadowBlur = 8;
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    coordinates.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.stroke();
    context.restore();

    coordinates.forEach((point, index) => {
        const latest = index === coordinates.length - 1;
        if (latest) {
            context.fillStyle = "rgba(255, 49, 57, 0.18)";
            context.beginPath();
            context.arc(point.x, point.y, 8, 0, Math.PI * 2);
            context.fill();
        }
        context.fillStyle = latest ? TREND_RED : POINT_RED;
        context.strokeStyle = "#151114";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(point.x, point.y, latest ? 4 : 3, 0, Math.PI * 2);
        context.fill();
        context.stroke();
    });

    context.fillStyle = "rgba(185, 185, 193, 0.72)";
    context.font = "500 10px Arial";
    context.textAlign = "left";
    context.fillText(formatShortDate(points[0].date), padding.left, height - 14);
    context.textAlign = "right";
    context.fillText(formatShortDate(points.at(-1).date), width - padding.right, height - 14);
}

export function renderStrengthIndexSummary(target, latest, timeframeLabel = "") {
    if (!target || !latest) return;
    const change = Number(latest.value) - 100;
    const sign = change > 0 ? "+" : "";
    const changeClass = change > 0 ? "is-positive" : change < 0 ? "is-negative" : "is-neutral";
    const context = timeframeLabel ? `${timeframeLabel} view · ` : "";

    target.className = "strength-index-summary";
    target.innerHTML = `
        <span class="strength-index-summary__kicker">Current index</span>
        <span class="strength-index-summary__metrics">
            <strong>${Number(latest.value).toFixed(1)}</strong>
            <span class="strength-index-summary__change ${changeClass}">
                <b>${sign}${change.toFixed(1)}%</b>
                <small>vs baseline</small>
            </span>
        </span>
        <small class="strength-index-summary__context">${context}${latest.exerciseCount} of 6 movement categories</small>
    `;
}

function formatShortDate(value) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
        .format(new Date(`${value}T12:00:00`));
}
