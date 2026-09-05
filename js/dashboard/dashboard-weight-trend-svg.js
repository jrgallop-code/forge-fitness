const WIDTH = 160;
const HEIGHT = 44;
const X_PADDING = 4;
const Y_PADDING = 5;
const DAY_MS = 86400000;

export function buildDashboardWeightTrendSvg(movingAverage) {
    const latestDate = movingAverage.at(-1)?.date;
    if (!latestDate) return "";
    const sevenDayStart = dateMs(latestDate) - 6 * DAY_MS;
    const trend = movingAverage.filter(point => dateMs(point.date) >= sevenDayStart);
    if (!trend.length) return "";

    const startDate = trend[0].date;
    const endDate = trend.at(-1).date;
    const values = trend
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

    const trendPoints = coordinates(trend);
    const trendPath = traceSmoothPath(trendPoints);

    return `
        <svg class="dashboard-weight-trend-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none">
            <path class="dashboard-weight-trend-average" d="${trendPath}"></path>
        </svg>
    `;
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
