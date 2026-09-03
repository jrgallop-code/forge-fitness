const FOOD_LOG_KEY = "level_up_food_log_v1";
const RANGE_KEY = "level_up_calorie_stats_range_v1";
const RANGE_DAYS = { "7": 7, "28": 28, "84": 84 };
let queued = false;

install();

function install() {
    schedule();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    ["levelup:nutrition-updated", "levelup:food-log-updated", "pageshow"].forEach(name => window.addEventListener(name, schedule));
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        syncProteinMinimumConsistency();
    });
}

function syncProteinMinimumConsistency() {
    const consistency = document.querySelector("#calorie-progress .calorie-stat-consistency");
    if (!consistency) return;

    const proteinStat = [...consistency.querySelectorAll("span")].find(span => {
        const label = span.querySelector("small")?.textContent?.trim().toLowerCase() || "";
        return label === "protein goal hit" || label === "protein minimum hit";
    });
    if (!proteinStat) return;

    const target = activeProteinTarget();
    const count = proteinGoalHitDays(target);
    const value = proteinStat.querySelector("strong");
    const label = proteinStat.querySelector("small");

    if (value) value.textContent = String(count);
    if (label) label.textContent = "Protein minimum hit";
    proteinStat.title = target > 0
        ? `${Math.round(target)} g or more counts as hitting the protein goal.`
        : "Set a protein target to track this metric.";
}

function activeProteinTarget() {
    const macro = readJson("level_up_nutrition_macro", {});
    const manual = macro?.useManual ? macro.manualMacros : null;
    const auto = macro?.autoBaseline;
    const target = Number(manual?.protein ?? auto?.protein);
    return Number.isFinite(target) && target > 0 ? target : 0;
}

function proteinGoalHitDays(target) {
    if (!(target > 0)) return 0;
    const log = readJson(FOOD_LOG_KEY, {});
    const count = RANGE_DAYS[localStorage.getItem(RANGE_KEY)] || 7;
    let hits = 0;

    for (let offset = -(count - 1); offset <= 0; offset += 1) {
        const date = dateKeyOffset(offset);
        const entries = Array.isArray(log?.[date]) ? log[date] : [];
        if (!entries.length) continue;
        const protein = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.protein) || 0), 0);
        if (protein >= target) hits += 1;
    }
    return hits;
}

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function dateKeyOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
