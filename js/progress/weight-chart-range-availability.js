const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const NUTRITION_PHASES_STORAGE_KEY = "level_up_nutrition_phases";
const RANGE_STORAGE_KEY = "level_up_weight_chart_range";
const DEFAULT_MIGRATION_KEY = "level_up_weight_chart_default_week_v1";
const RANGE_POLISH_STYLE_ID = "level-up-weight-range-polish-v2";
const DAY_MS = 86400000;

const FIXED_RANGE_ORDER = ["1w", "1m", "3m", "6m"];
const RANGE_LABELS = {
    "1w": "1W",
    "1m": "1M",
    "3m": "3M",
    "6m": "6M",
    "phase": "PHASE",
    "all": "ALL"
};

const RANGE_RULES = {
    "1w": { available: true },
    "1m": { minSpanDays: 14, minEntries: 4, description: "about 2 weeks" },
    "3m": { minSpanDays: 45, minEntries: 6, description: "about 6 weeks" },
    "6m": { minSpanDays: 90, minEntries: 8, description: "about 3 months" },
    "all": { available: true }
};

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

function readActivePhase() {
    try {
        const phases = JSON.parse(localStorage.getItem(NUTRITION_PHASES_STORAGE_KEY) || "[]");
        if (!Array.isArray(phases)) return null;
        return [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null;
    }
    catch {
        return null;
    }
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}

function historySpanDays(entries) {
    if (entries.length < 2) return entries.length ? 1 : 0;
    return Math.floor((dateMs(entries.at(-1).date) - dateMs(entries[0].date)) / DAY_MS) + 1;
}

function getAvailability(range, entries, activePhase) {
    if (range === "phase") {
        if (!activePhase?.startDate) {
            return { available: false, reason: "Start a nutrition phase to use this timeframe." };
        }
        const phaseEntries = entries.filter(entry => entry.date >= String(activePhase.startDate));
        if (phaseEntries.length < 2) {
            return { available: false, reason: "Add at least two weigh-ins in this phase first." };
        }
        return { available: true, reason: "" };
    }

    const rule = RANGE_RULES[range];
    if (!rule) return { available: false, reason: "This timeframe is not available." };
    if (rule.available) return { available: true, reason: "" };

    const spanDays = historySpanDays(entries);
    const enoughSpan = spanDays >= rule.minSpanDays;
    const enoughEntries = entries.length >= rule.minEntries;
    if (enoughSpan && enoughEntries) return { available: true, reason: "" };

    return {
        available: false,
        reason: `Available after ${rule.description} of weight history and ${rule.minEntries} weigh-ins.`
    };
}

function getLargestSupportedFixedRange(entries, activePhase, maxRange = "6m") {
    const maxIndex = Math.max(0, FIXED_RANGE_ORDER.indexOf(maxRange));
    for (let index = maxIndex; index >= 0; index -= 1) {
        const range = FIXED_RANGE_ORDER[index];
        if (getAvailability(range, entries, activePhase).available) return range;
    }
    return "1w";
}

function resolveDisplayRange(requestedRange, entries, activePhase) {
    if (getAvailability(requestedRange, entries, activePhase).available) return requestedRange;

    if (FIXED_RANGE_ORDER.includes(requestedRange)) {
        return getLargestSupportedFixedRange(entries, activePhase, requestedRange);
    }

    if (requestedRange === "phase") {
        return getLargestSupportedFixedRange(entries, activePhase);
    }

    return "1w";
}

function migrateDefaultToWeek() {
    if (localStorage.getItem(DEFAULT_MIGRATION_KEY) === "1") return false;
    localStorage.setItem(RANGE_STORAGE_KEY, "1w");
    localStorage.setItem(DEFAULT_MIGRATION_KEY, "1");
    return true;
}

function ensureRangePolishStyles() {
    if (document.getElementById(RANGE_POLISH_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = RANGE_POLISH_STYLE_ID;
    style.textContent = `
        #weight-progress .weight-chart-range-control button {
            font-size: 11px !important;
        }
        @media (max-width: 380px) {
            #weight-progress .weight-chart-range-control button {
                font-size: 10px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

function requestChartRefresh() {
    window.dispatchEvent(new Event("resize"));
}

function applyAvailability() {
    ensureRangePolishStyles();

    const controls = document.querySelector(".weight-chart-range-control");
    if (!controls) return;

    const entries = readWeightEntries();
    const activePhase = readActivePhase();
    const selected = String(localStorage.getItem(RANGE_STORAGE_KEY) || "1w").toLowerCase();
    const resolvedSelected = resolveDisplayRange(selected, entries, activePhase);

    if (resolvedSelected !== selected) {
        localStorage.setItem(RANGE_STORAGE_KEY, resolvedSelected);
        requestAnimationFrame(requestChartRefresh);
        return;
    }

    controls.querySelectorAll("button[data-weight-chart-range]").forEach(button => {
        const range = button.dataset.weightChartRange;
        const availability = getAvailability(range, entries, activePhase);
        const fallback = resolveDisplayRange(range, entries, activePhase);

        button.disabled = false;
        button.setAttribute("aria-disabled", "false");
        button.dataset.rangeLimited = String(!availability.available);
        button.title = availability.available
            ? ""
            : `${availability.reason} Tapping will show ${RANGE_LABELS[fallback] || fallback}.`;
    });
}

function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        applyAvailability();
    });
}

const migrated = migrateDefaultToWeek();
ensureRangePolishStyles();
if (migrated) requestAnimationFrame(requestChartRefresh);

document.addEventListener("click", event => {
    const button = event.target.closest?.("button[data-weight-chart-range]");
    if (!button) return;

    const requestedRange = button.dataset.weightChartRange;
    const entries = readWeightEntries();
    const activePhase = readActivePhase();
    const displayRange = resolveDisplayRange(requestedRange, entries, activePhase);

    if (displayRange !== requestedRange) {
        event.preventDefault();
        event.stopImmediatePropagation();
        localStorage.setItem(RANGE_STORAGE_KEY, displayRange);
        requestChartRefresh();
        queueApply();
    }
}, true);

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueApply).observe(content, { childList: true, subtree: true });
}

document.addEventListener("click", event => {
    if (event.target.closest?.("#weight-tab, #save-weight-btn, .remove-weight-entry")) {
        setTimeout(queueApply, 0);
    }
});

window.addEventListener("levelup:nutrition-phase-updated", queueApply);
window.addEventListener("resize", queueApply);
queueApply();
