const WIDTH = 160;
const HEIGHT = 44;
const X_PADDING = 4;
const Y_PADDING = 5;
const MAX_TREND_POINTS = 14;

export function buildDashboardWeightTrendSvg(entries, movingAverage) {
    const trend = movingAverage.slice(-MAX_TREND_POINTS);
    if (!trend.length) return "";

    const startDate = trend[0].date;
    const endDate = trend.at(-1).date;
    const visibleEntries = entries.filter(entry => entry.date >= startDate && entry.date <= endDate);
    const values = [...visibleEntries, ...trend]
        .map(point => Number(point.weight))
        .filter(Number.isFinite);
    if (!values.length) return "";

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = Math.max(0.35, maximum - minimum);
    const firstTime = dateMs(startDate);
    const lastTime = dateMs(endDate);
    const elapsed = Math.max(1, lastTime - firstTime);
    const xFor = date => X_PADDING + ((dateMs(date) - firstTime) / elapsed) * (WIDTH - X_PADDING * 2);
    const yFor = weight => Y_PADDING + ((maximum - weight) / range) * (HEIGHT - Y_PADDING * 2);
    const coordinates = points => points.map(point => ({
        x: xFor(point.date),
        y: yFor(Number(point.weight))
    }));

    const dailyPoints = coordinates(visibleEntries);
    const trendPoints = coordinates(trend);
    const dailyPath = traceStraightPath(dailyPoints);
    const trendPath = traceSmoothPath(trendPoints);
    const latest = trendPoints.at(-1);
    const fillPath = trendPoints.length > 1
        ? `${trendPath} L ${latest.x.toFixed(2)} ${HEIGHT - Y_PADDING} L ${trendPoints[0].x.toFixed(2)} ${HEIGHT - Y_PADDING} Z`
        : "";

    return `
        <svg class="dashboard-weight-trend-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="dashboard-weight-trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#45cb75" stop-opacity=".25"></stop>
                    <stop offset="56%" stop-color="#247042" stop-opacity=".12"></stop>
                    <stop offset="100%" stop-color="#123f27" stop-opacity="0"></stop>
                </linearGradient>
            </defs>
            ${dailyPath ? `<path class="dashboard-weight-trend-daily-line" d="${dailyPath}"></path>` : ""}
            ${dailyPoints.map(point => `<circle class="dashboard-weight-trend-daily-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="1.05"></circle>`).join("")}
            ${fillPath ? `<path class="dashboard-weight-trend-area" d="${fillPath}"></path>` : ""}
            <path class="dashboard-weight-trend-average" d="${trendPath}"></path>
            <circle class="dashboard-weight-trend-latest-halo" cx="${latest.x.toFixed(2)}" cy="${latest.y.toFixed(2)}" r="3.3"></circle>
            <circle class="dashboard-weight-trend-latest" cx="${latest.x.toFixed(2)}" cy="${latest.y.toFixed(2)}" r="1.65"></circle>
        </svg>
    `;
}

function traceStraightPath(points) {
    return points.map((point, index) =>
        `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    ).join(" ");
}

function traceSmoothPath(points) {
    if (!points.length) return "";
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    if (points.length === 1) return path;
    for (let index = 1; index < points.length - 1; index++) {
        const current = points[index];
        const next = points[index + 1];
        const midpointX = (current.x + next.x) / 2;
        const midpointY = (current.y + next.y) / 2;
        path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midpointX.toFixed(2)} ${midpointY.toFixed(2)}`;
    }
    const last = points.at(-1);
    return `${path} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}
