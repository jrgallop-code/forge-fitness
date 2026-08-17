const RANGE_STORAGE_KEY = "level_up_training_analytics_range";

const RANGE_LABELS = {
    "1w": "1W",
    "1m": "1M",
    "3m": "3M",
    "6m": "6M",
    "1y": "1Y",
    all: "ALL"
};

let syncTimer = null;

function readRangeLabel() {
    const key = String(localStorage.getItem(RANGE_STORAGE_KEY) || "3m").toLowerCase();
    return RANGE_LABELS[key] || "3M";
}

function parseMetricValue(value) {
    const number = Number.parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
}

function readSelectedMuscleTotals() {
    return [...document.querySelectorAll("#muscle-distribution .volume-trend-row")]
        .map(row => {
            const muscle = row.querySelector(".volume-trend-muscle strong")?.textContent?.trim() || "";
            const totalMetric = [...row.querySelectorAll(".volume-trend-metric")]
                .find(metric => metric.querySelector("span")?.textContent?.trim().toLowerCase() === "total");
            const total = parseMetricValue(totalMetric?.querySelector("strong")?.textContent);
            return { muscle, total };
        })
        .filter(item => item.muscle && item.total > 0)
        .sort((a, b) => b.total - a.total || a.muscle.localeCompare(b.muscle));
}

function formatSets(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function renderRow(item, maximum) {
    const width = maximum > 0 ? Math.max(4, Math.min(100, item.total / maximum * 100)) : 0;
    return `
        <div class="seven-day-volume-row" data-range-synced-breakdown-row="true">
            <div class="seven-day-volume-row-top">
                <strong>${escapeHtml(item.muscle)}</strong>
                <span>${escapeHtml(formatSets(item.total))} sets</span>
            </div>
            <div class="seven-day-volume-track" aria-hidden="true">
                <div class="seven-day-volume-fill" style="width:${width.toFixed(1)}%"></div>
            </div>
        </div>
    `;
}

function syncBreakdownToSelectedRange() {
    const breakdown = document.querySelector(".seven-day-volume-breakdown");
    const trends = document.getElementById("muscle-distribution");
    if (!breakdown || !trends) return;

    const entries = readSelectedMuscleTotals();
    const headingMeta = breakdown.querySelector(".seven-day-volume-breakdown-heading span");
    if (headingMeta) {
        headingMeta.textContent = `${readRangeLabel()} · Primary 1.0 · Secondary 0.5`;
    }

    breakdown
        .querySelectorAll(".seven-day-volume-row, .empty-state")
        .forEach(node => node.remove());

    if (!entries.length) {
        breakdown.insertAdjacentHTML(
            "beforeend",
            `<p class="empty-state">No muscle volume in the selected ${escapeHtml(readRangeLabel())} timeframe.</p>`
        );
        return;
    }

    const maximum = Math.max(...entries.map(item => item.total));
    breakdown.insertAdjacentHTML(
        "beforeend",
        entries.map(item => renderRow(item, maximum)).join("")
    );
}

function scheduleSync(delay = 180) {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => requestAnimationFrame(syncBreakdownToSelectedRange), delay);
}

document.addEventListener("click", event => {
    if (
        event.target.closest?.("[data-training-analytics-range]") ||
        event.target.closest?.('.training-progress-tab[data-view="training"]') ||
        event.target.closest?.("#lifting-tab") ||
        event.target.closest?.("#load-training-demo") ||
        event.target.closest?.("#remove-training-demo") ||
        event.target.closest?.('[data-muscle-overview-mode="volume"]')
    ) {
        scheduleSync(240);
    }
});

document.addEventListener("change", event => {
    if (event.target?.id === "progress-range") scheduleSync(200);
});

window.addEventListener("storage", event => {
    if (event.key === RANGE_STORAGE_KEY || event.key === "forge_workout_sessions") {
        scheduleSync(180);
    }
});

window.addEventListener("pageshow", () => scheduleSync(220));
window.setTimeout(() => scheduleSync(300), 0);

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
