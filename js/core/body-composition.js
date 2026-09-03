const RANGE_KEY = "level_up_body_fat_profile_v1";
const ENTRIES_KEY = "level_up_body_fat_entries_v1";

export const BODY_FAT_RANGES = [
    { id: "5-7", label: "5–7%", min: 5, max: 7, midpoint: 6 },
    { id: "8-12", label: "8–12%", min: 8, max: 12, midpoint: 10 },
    { id: "13-17", label: "13–17%", min: 13, max: 17, midpoint: 15 },
    { id: "18-23", label: "18–23%", min: 18, max: 23, midpoint: 20.5 },
    { id: "24-29", label: "24–29%", min: 24, max: 29, midpoint: 26.5 },
    { id: "30-34", label: "30–34%", min: 30, max: 34, midpoint: 32 },
    { id: "35-39", label: "35–39%", min: 35, max: 39, midpoint: 37 },
    { id: "40-plus", label: "40%+", min: 40, max: null, midpoint: 42 }
];

export const BODY_FAT_METHODS = [
    { id: "visual", label: "Visual estimate" },
    { id: "smart-scale", label: "Smart scale / BIA" },
    { id: "calipers", label: "Calipers" },
    { id: "dexa", label: "DEXA" },
    { id: "other", label: "Other" }
];

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function todayKey(date = new Date()) {
    const value = new Date(date);
    if (!Number.isFinite(value.getTime())) return "";
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function validDateKey(value) {
    const key = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function getBodyFatRange() {
    const saved = readJson(RANGE_KEY, null);
    if (!saved?.rangeId) return null;
    const range = BODY_FAT_RANGES.find(item => item.id === saved.rangeId);
    return range ? { ...saved, ...range } : null;
}

export function saveBodyFatRange(rangeId, { source = "visual" } = {}) {
    const range = BODY_FAT_RANGES.find(item => item.id === rangeId);
    if (!range) {
        localStorage.removeItem(RANGE_KEY);
        window.dispatchEvent(new CustomEvent("levelup:body-composition-updated"));
        return null;
    }
    const saved = {
        rangeId: range.id,
        midpoint: range.midpoint,
        source,
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem(RANGE_KEY, JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent("levelup:body-composition-updated", { detail: saved }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "body-composition" } }));
    return { ...saved, ...range };
}

export function getBodyFatEntries() {
    const entries = readJson(ENTRIES_KEY, []);
    if (!Array.isArray(entries)) return [];
    return entries
        .map(entry => ({
            date: validDateKey(entry?.date),
            percent: Number(entry?.percent),
            method: BODY_FAT_METHODS.some(item => item.id === entry?.method) ? entry.method : "other",
            createdAt: entry?.createdAt || null
        }))
        .filter(entry => entry.date && Number.isFinite(entry.percent) && entry.percent >= 2 && entry.percent <= 70)
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function saveBodyFatEntry({ date = todayKey(), percent, method = "visual" } = {}) {
    const key = validDateKey(date) || todayKey();
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 2 || value > 70) throw new Error("Enter a body-fat estimate between 2% and 70%.");
    const normalizedMethod = BODY_FAT_METHODS.some(item => item.id === method) ? method : "other";
    const entries = getBodyFatEntries().filter(entry => entry.date !== key);
    entries.push({ date: key, percent: Math.round(value * 10) / 10, method: normalizedMethod, createdAt: new Date().toISOString() });
    entries.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries.slice(-260)));
    window.dispatchEvent(new CustomEvent("levelup:body-composition-updated", { detail: { date: key } }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "body-composition" } }));
    return entries.at(-1);
}

export function removeBodyFatEntry(date) {
    const key = validDateKey(date);
    if (!key) return;
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(getBodyFatEntries().filter(entry => entry.date !== key)));
    window.dispatchEvent(new CustomEvent("levelup:body-composition-updated", { detail: { date: key, removed: true } }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "body-composition" } }));
}

export function getBodyFatPrior(endDate = new Date()) {
    const key = validDateKey(typeof endDate === "string" ? endDate : todayKey(endDate)) || todayKey();
    const exact = getBodyFatEntries().filter(entry => entry.date <= key).at(-1);
    if (exact) return { percent: exact.percent, source: exact.method, date: exact.date, exact: true };
    const range = getBodyFatRange();
    if (range) return { percent: Number(range.midpoint), source: "visual-range", date: null, exact: false, rangeId: range.id, label: range.label };
    return null;
}

export function estimateTissueEnergyPerLb(endDate = new Date()) {
    const prior = getBodyFatPrior(endDate);
    if (!prior || !Number.isFinite(Number(prior.percent))) {
        return { kcalPerLb: 3500, bodyFatPercent: null, source: "traditional-default", adjustment: 0 };
    }

    // Fat and lean tissue have very different stored-energy densities. Because
    // consumer body-fat estimates are noisy, Level Up deliberately uses BF only
    // as a weak prior: 25% body-composition model + 75% traditional 3,500 kcal/lb.
    const bodyFat = clamp(Number(prior.percent), 5, 45);
    const estimatedFatFraction = clamp(0.68 + ((bodyFat - 10) * 0.006), 0.68, 0.86);
    const fatEnergyPerLb = 9400 * 0.45359237;
    const leanEnergyPerLb = 1800 * 0.45359237;
    const tissueModel = (estimatedFatFraction * fatEnergyPerLb) + ((1 - estimatedFatFraction) * leanEnergyPerLb);
    const blended = (0.75 * 3500) + (0.25 * tissueModel);
    const kcalPerLb = Math.round(clamp(blended, 3350, 3600) / 25) * 25;
    return {
        kcalPerLb,
        bodyFatPercent: Number(prior.percent),
        source: prior.source,
        adjustment: kcalPerLb - 3500
    };
}

export function estimateBodyComposition(weightLb, bodyFatPercent) {
    const weight = Number(weightLb);
    const percent = Number(bodyFatPercent);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(percent) || percent <= 0 || percent >= 100) return null;
    const fatMassLb = weight * percent / 100;
    return {
        weightLb: weight,
        bodyFatPercent: percent,
        fatMassLb,
        leanMassLb: Math.max(0, weight - fatMassLb)
    };
}

export function bodyFatMethodLabel(method) {
    return BODY_FAT_METHODS.find(item => item.id === method)?.label || "Other";
}
