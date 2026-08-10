const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
let previewEnabled = false;

export function initializeWeightTrendSummary(root = document) {
    const section = root.querySelector?.("#weight-progress") || document.getElementById("weight-progress");
    if (!section) return;

    let card = section.querySelector("[data-weight-trend-summary]");
    if (!card) {
        card = document.createElement("section");
        card.className = "weight-trend-summary";
        card.dataset.weightTrendSummary = "true";
        const summary = section.querySelector(".weight-summary");
        summary?.insertAdjacentElement("afterend", card);
    }

    renderSummary(card);
    if (card.dataset.initialized === "true") return;
    card.dataset.initialized = "true";

    card.addEventListener("click", event => {
        const toggle = event.target.closest("[data-trend-preview]");
        if (!toggle) return;
        previewEnabled = !previewEnabled;
        renderSummary(card);
    });

    window.addEventListener("levelup:weight-updated", () => renderSummary(card));
}

function renderSummary(card) {
    const entries = previewEnabled ? createPreviewEntries() : getEligibleEntries();
    const stats = analyzeEntries(entries);
    const sourceLabel = previewEnabled ? "28-day example · not saved" : "Your recorded entries";

    card.innerHTML = `<div class="weight-trend-heading">
        <div><span class="eyebrow">TREND SUMMARY</span><h3>14-Day View</h3></div>
        <button class="secondary-btn" type="button" data-trend-preview>${previewEnabled ? "Use My Data" : "Preview 28-Day Example"}</button>
    </div>
    <p class="weight-trend-source">${sourceLabel}</p>
    ${renderStats(stats)}`;
}

function renderStats(stats) {
    if (stats.state === "empty") {
        return '<div class="weight-trend-message"><strong>Not enough data</strong><span>Record at least seven measurements to establish an early trend.</span></div>';
    }

    const comparison = stats.previousRate === null
        ? "Not available yet"
        : `${formatRate(stats.previousRate)} in the previous period`;

    return `<div class="weight-trend-status">
        <strong>${stats.label}</strong>
        <span>${stats.description}</span>
    </div>
    <div class="weight-trend-grid">
        <div><span>14-day direction</span><strong>${stats.direction}</strong></div>
        <div><span>Estimated change</span><strong>${formatRate(stats.rate)}</strong></div>
        <div><span>Entries recorded</span><strong>${stats.recentCount} of 14 days</strong></div>
        <div><span>Data confidence</span><strong>${stats.confidence}</strong></div>
    </div>
    <div class="weight-trend-comparison"><span>Previous 14 days</span><strong>${comparison}</strong></div>`;
}

function analyzeEntries(entries) {
    if (entries.length < 7) return { state: "empty" };
    const averages = movingAverages(entries);
    const latestDate = dateMs(entries.at(-1).date);
    const recentStart = latestDate - (13 * 86400000);
    const previousStart = latestDate - (27 * 86400000);
    const recent = averages.filter(row => dateMs(row.date) >= recentStart);
    const previous = averages.filter(row => dateMs(row.date) >= previousStart && dateMs(row.date) < recentStart);
    const rate = weeklyRate(recent);
    const previousRate = previous.length >= 2 ? weeklyRate(previous) : null;
    const coveredDays = recent.length ? Math.round((dateMs(recent.at(-1).date) - dateMs(recent[0].date)) / 86400000) + 1 : 0;
    const confidence = recent.length >= 12 && coveredDays >= 12 ? "High" : recent.length >= 8 && coveredDays >= 10 ? "Moderate" : "Early";
    const direction = Math.abs(rate) < 0.1 ? "Relatively stable" : rate > 0 ? "Upward" : "Downward";
    const label = entries.length >= 14 ? "Established trend" : "Early trend";
    const description = `Based on 7-day moving averages across the latest ${Math.min(14, coveredDays)}-day window. This describes the recorded pattern and does not prescribe a change.`;
    return { state: "ready", rate, previousRate, recentCount: recent.length, confidence, direction, label, description };
}

function movingAverages(entries) {
    return entries.map(entry => {
        const end = dateMs(entry.date);
        const start = end - (6 * 86400000);
        const rows = entries.filter(row => {
            const time = dateMs(row.date);
            return time >= start && time <= end;
        });
        return { date: entry.date, value: rows.reduce((sum, row) => sum + row.weight, 0) / rows.length };
    });
}

function weeklyRate(rows) {
    if (rows.length < 2) return 0;
    const first = rows[0], last = rows.at(-1);
    const days = Math.max(1, (dateMs(last.date) - dateMs(first.date)) / 86400000);
    return ((last.value - first.value) / days) * 7;
}

function getEligibleEntries() {
    const entries = readJson(WEIGHT_KEY, [])
        .map(row => ({ date: String(row?.date || ""), weight: Number(row?.weight) }))
        .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.weight) && row.weight > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
    const phase = readJson(PHASES_KEY, []).find?.(item => !item?.endDate);
    return phase?.startDate ? entries.filter(row => row.date >= phase.startDate) : entries;
}

function createPreviewEntries() {
    const values = [170.2,170.5,170.1,170.4,170.3,170.7,170.4,170.6,170.8,170.5,170.9,170.7,171.0,170.8,171.1,170.9,171.2,171.0,171.4,171.1,171.3,171.5,171.2,171.6,171.4,171.7,171.5,171.8];
    const today = new Date();
    return values.map((weight, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (values.length - 1 - index));
        return { date: localDate(date), weight };
    });
}

function readJson(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value ?? fallback; }
    catch { return fallback; }
}
function formatRate(value) { const number = Number(value) || 0; return `${number > 0 ? "+" : ""}${number.toFixed(2)} lb/week`; }
function dateMs(value) { return new Date(`${value}T12:00:00`).getTime(); }
function localDate(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
