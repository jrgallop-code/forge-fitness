const WEIGHT_STORAGE_KEY = "forge_weight_entries";
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

function buildSparklinePath(points) {
    if (!points.length) return "";

    const width = 100;
    const height = 42;
    const xPad = 4;
    const yPad = 5;
    const values = points.map(point => point.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(0.1, max - min);
    const firstTime = new Date(`${points[0].date}T12:00:00`).getTime();
    const lastTime = new Date(`${points.at(-1).date}T12:00:00`).getTime();
    const elapsed = Math.max(1, lastTime - firstTime);

    if (points.length === 1) {
        const y = height / 2;
        return `M ${xPad} ${y} L ${width - xPad} ${y}`;
    }

    return points.map((point, index) => {
        const time = new Date(`${point.date}T12:00:00`).getTime();
        const x = xPad + ((time - firstTime) / elapsed) * (width - xPad * 2);
        const y = yPad + ((max - point.weight) / range) * (height - yPad * 2);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
}

function findWeightCard() {
    const dashboard = document.querySelector("#content .dashboard.dashboard-command-insights, #content .dashboard");
    if (!dashboard) return null;

    const enhanced = dashboard.querySelector(".dashboard-weight-trend-card");
    if (enhanced) return enhanced;

    return [...dashboard.querySelectorAll(".metric-card")].find(card => {
        const title = String(card.querySelector("h3")?.textContent || "").trim();
        return title === "Latest Weight" || title === "Latest Recorded Weight";
    }) || null;
}

function renderWeightTrendCard() {
    const card = findWeightCard();
    if (!card) return;

    const entries = readWeightEntries();
    const trend = calculateMovingAverage(entries);
    const recent = trend.slice(-7);
    const latest = trend.at(-1)?.weight ?? null;
    const signature = JSON.stringify(recent.map(point => [point.date, Math.round(point.weight * 1000) / 1000]));

    if (card.dataset.weightTrendSignature === signature) return;

    card.dataset.weightTrendSignature = signature;
    card.classList.add("dashboard-weight-trend-card");

    const path = buildSparklinePath(recent);
    const value = latest === null ? "--" : latest.toFixed(1);

    card.innerHTML = `
        <button type="button" class="dashboard-weight-trend-button" data-dashboard-weight-trend-open aria-label="Open Weight Progress">
            <span class="dashboard-weight-trend-heading">
                <span>
                    <h3>Weight Trend</h3>
                    <small>7-Day Moving Average</small>
                </span>
            </span>
            <span class="dashboard-weight-trend-chart" aria-hidden="true">
                ${path
                    ? `<svg viewBox="0 0 100 42" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="${TREND_GREEN}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path></svg>`
                    : `<span class="dashboard-weight-trend-empty">Add weigh-ins to see your trend</span>`}
            </span>
            <span class="dashboard-weight-trend-value">
                <strong>${value}${latest === null ? "" : " lb"}</strong>
                <small>trend weight</small>
            </span>
        </button>
    `;
}

function openWeightProgress() {
    const progressButton = document.querySelector('.nav-btn[data-page="progress"]');
    if (!progressButton) return;

    progressButton.click();
    window.setTimeout(() => {
        document.getElementById("weight-tab")?.click();
        document.getElementById("weight-progress")?.scrollIntoView({ block: "start" });
    }, 0);
}

function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        renderWeightTrendCard();
    });
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-dashboard-weight-trend-open]")) {
        openWeightProgress();
    }
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueRender).observe(content, { childList: true, subtree: true });
}

window.addEventListener("storage", event => {
    if (event.key === WEIGHT_STORAGE_KEY) queueRender();
});

queueRender();
