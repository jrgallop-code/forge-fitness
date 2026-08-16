const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const NUTRITION_PHASES_STORAGE_KEY = "level_up_nutrition_phases";
const DAY_MS = 86400000;
const MIN_TREND_DAYS = 7;
const MIN_TREND_WEIGH_INS = 4;
const TREND_GREEN = "#4ade80";

let queued = false;

function readWeightEntries() {
    try {
        const entries = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]");
        if (!Array.isArray(entries)) return [];
        return entries
            .map(entry => ({ date: String(entry?.date || ""), weight: Number(entry?.weight) }))
            .filter(entry => entry.date && Number.isFinite(entry.weight) && entry.weight > 0)
            .sort((a, b) => dateMs(a.date) - dateMs(b.date));
    }
    catch {
        return [];
    }
}

function readActiveNutritionPhase() {
    try {
        const phases = JSON.parse(localStorage.getItem(NUTRITION_PHASES_STORAGE_KEY) || "[]");
        if (!Array.isArray(phases)) return null;
        return [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null;
    }
    catch {
        return null;
    }
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

function countLoggedDays(entries) {
    return new Set(entries.map(entry => entry.date)).size;
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTrendReadiness(entries) {
    const today = localDateString();
    const eligibleEntries = entries.filter(entry => entry.date <= today);
    const activePhase = readActiveNutritionPhase();

    if (activePhase?.startDate) {
        const phaseEntries = eligibleEntries.filter(entry => entry.date >= String(activePhase.startDate));
        const elapsedDays = Math.max(1, Math.floor((dateMs(today) - dateMs(activePhase.startDate)) / DAY_MS) + 1);
        const weighIns = countLoggedDays(phaseEntries);
        return {
            elapsedDays,
            weighIns,
            hasEnoughData: elapsedDays >= MIN_TREND_DAYS && weighIns >= MIN_TREND_WEIGH_INS,
            phaseBased: true,
            eligibleEntries
        };
    }

    const firstDate = eligibleEntries[0]?.date || null;
    const latestDate = eligibleEntries.at(-1)?.date || null;
    const elapsedDays = firstDate && latestDate
        ? Math.max(1, Math.floor((dateMs(latestDate) - dateMs(firstDate)) / DAY_MS) + 1)
        : 0;
    const weighIns = countLoggedDays(eligibleEntries);

    return {
        elapsedDays,
        weighIns,
        hasEnoughData: elapsedDays >= MIN_TREND_DAYS && weighIns >= MIN_TREND_WEIGH_INS,
        phaseBased: false,
        eligibleEntries
    };
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
    const firstTime = dateMs(points[0].date);
    const lastTime = dateMs(points.at(-1).date);
    const elapsed = Math.max(1, lastTime - firstTime);

    return points.map((point, index) => {
        const time = dateMs(point.date);
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
    const readiness = getTrendReadiness(entries);
    const trend = readiness.hasEnoughData ? calculateMovingAverage(readiness.eligibleEntries) : [];
    const recent = trend.slice(-7);
    const latest = trend.at(-1)?.weight ?? null;
    const signature = JSON.stringify({
        elapsedDays: readiness.elapsedDays,
        weighIns: readiness.weighIns,
        phaseBased: readiness.phaseBased,
        recent: recent.map(point => [point.date, Math.round(point.weight * 1000) / 1000])
    });

    if (card.dataset.weightTrendSignature === signature) return;

    card.dataset.weightTrendSignature = signature;
    card.classList.add("dashboard-weight-trend-card");

    const path = readiness.hasEnoughData ? buildSparklinePath(recent) : "";
    const value = latest === null ? "--" : latest.toFixed(1);
    const daysReady = readiness.elapsedDays >= MIN_TREND_DAYS;
    const weighInsReady = readiness.weighIns >= MIN_TREND_WEIGH_INS;
    const dayProgress = Math.min(readiness.elapsedDays, MIN_TREND_DAYS);
    const weighInProgress = Math.min(readiness.weighIns, MIN_TREND_WEIGH_INS);
    const emptyMessage = !daysReady
        ? "Building 7-day trend"
        : !weighInsReady
            ? "Need more weigh-ins"
            : "Not enough data";
    const readinessPrimary = daysReady
        ? `${weighInProgress} / ${MIN_TREND_WEIGH_INS} weigh-ins`
        : `Day ${dayProgress} / ${MIN_TREND_DAYS}`;
    const readinessSecondary = daysReady
        ? "needed to unlock trend"
        : `${weighInProgress} / ${MIN_TREND_WEIGH_INS} weigh-ins logged`;

    card.innerHTML = `
        <button type="button" class="dashboard-weight-trend-button" data-dashboard-weight-trend-open aria-label="Open Weight Progress">
            <span class="dashboard-weight-trend-heading">
                <span>
                    <h3>Weight Trend</h3>
                    <small>7-Day Moving Average</small>
                </span>
            </span>
            <span class="dashboard-weight-trend-chart" aria-hidden="true">
                ${readiness.hasEnoughData && path
                    ? `<svg viewBox="0 0 100 42" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="${TREND_GREEN}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path></svg>`
                    : `<span class="dashboard-weight-trend-empty">${emptyMessage}</span>`}
            </span>
            <span class="dashboard-weight-trend-value">
                ${readiness.hasEnoughData
                    ? `<strong>${value} lb</strong><small>trend weight</small>`
                    : `<strong>${readinessPrimary}</strong><small>${readinessSecondary}</small>`}
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
    if (event.key === WEIGHT_STORAGE_KEY || event.key === NUTRITION_PHASES_STORAGE_KEY) queueRender();
});
window.addEventListener("levelup:nutrition-phase-updated", queueRender);
window.addEventListener("levelup:nutrition-updated", queueRender);

queueRender();
