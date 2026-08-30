export const UNIT_SYSTEM_KEY = "level_up_unit_system";
export const UNIT_PREFERENCES_KEY = "level_up_unit_preferences_v2";
export const IMPERIAL = "imperial";
export const METRIC = "metric";
export const UNIT_KINDS = Object.freeze({
    BODY_WEIGHT: "bodyWeight",
    LIFTING_WEIGHT: "liftingWeight",
    DISTANCE: "distance",
    LENGTH: "length"
});

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const MI_TO_KM = 1.609344;
let observer = null;
let refreshQueued = false;

export function getUnitSystem() {
    return localStorage.getItem(UNIT_SYSTEM_KEY) === METRIC ? METRIC : IMPERIAL;
}

export function getUnitPreferences() {
    const fallback = legacyPreferences();
    try {
        const saved = JSON.parse(localStorage.getItem(UNIT_PREFERENCES_KEY) || "null");
        if (!saved || typeof saved !== "object") return fallback;
        return {
            bodyWeight: ["lb", "kg"].includes(saved.bodyWeight) ? saved.bodyWeight : fallback.bodyWeight,
            liftingWeight: ["lb", "kg"].includes(saved.liftingWeight) ? saved.liftingWeight : fallback.liftingWeight,
            distance: ["mi", "km"].includes(saved.distance) ? saved.distance : fallback.distance,
            length: ["in", "cm"].includes(saved.length) ? saved.length : fallback.length
        };
    } catch {
        return fallback;
    }
}

export function isMetric(kind = UNIT_KINDS.BODY_WEIGHT) {
    const preferences = getUnitPreferences();
    if (kind === UNIT_KINDS.DISTANCE) return preferences.distance === "km";
    if (kind === UNIT_KINDS.LENGTH) return preferences.length === "cm";
    return preferences[kind === UNIT_KINDS.LIFTING_WEIGHT ? "liftingWeight" : "bodyWeight"] === "kg";
}

export function setUnitPreferences(values, { reload = false } = {}) {
    const current = getUnitPreferences();
    const next = {
        bodyWeight: ["lb", "kg"].includes(values?.bodyWeight) ? values.bodyWeight : current.bodyWeight,
        liftingWeight: ["lb", "kg"].includes(values?.liftingWeight) ? values.liftingWeight : current.liftingWeight,
        distance: ["mi", "km"].includes(values?.distance) ? values.distance : current.distance,
        length: ["in", "cm"].includes(values?.length) ? values.length : current.length
    };
    localStorage.setItem(UNIT_PREFERENCES_KEY, JSON.stringify(next));
    const allMetric = next.bodyWeight === "kg" && next.liftingWeight === "kg" && next.distance === "km" && next.length === "cm";
    const allImperial = next.bodyWeight === "lb" && next.liftingWeight === "lb" && next.distance === "mi" && next.length === "in";
    if (allMetric || allImperial) localStorage.setItem(UNIT_SYSTEM_KEY, allMetric ? METRIC : IMPERIAL);
    window.dispatchEvent(new CustomEvent("levelup:units-changed", { detail: { preferences: next } }));
    if (reload) window.location.reload();
    else queueUnitRefresh();
    return next;
}

export function setUnitSystem(value, { reload = false } = {}) {
    const next = value === METRIC ? METRIC : IMPERIAL;
    localStorage.setItem(UNIT_SYSTEM_KEY, next);
    setUnitPreferences(next === METRIC
        ? { bodyWeight: "kg", liftingWeight: "kg", distance: "km", length: "cm" }
        : { bodyWeight: "lb", liftingWeight: "lb", distance: "mi", length: "in" }, { reload });
    return next;
}

function legacyPreferences() {
    if (localStorage.getItem(UNIT_SYSTEM_KEY)) {
        return getUnitSystem() === METRIC
            ? { bodyWeight: "kg", liftingWeight: "kg", distance: "km", length: "cm" }
            : { bodyWeight: "lb", liftingWeight: "lb", distance: "mi", length: "in" };
    }
    const locale = String(globalThis.navigator?.language || "").toUpperCase();
    if (locale.endsWith("-CA")) return { bodyWeight: "lb", liftingWeight: "lb", distance: "km", length: "cm" };
    if (locale.endsWith("-US")) return { bodyWeight: "lb", liftingWeight: "lb", distance: "mi", length: "in" };
    return { bodyWeight: "kg", liftingWeight: "kg", distance: "km", length: "cm" };
}

export const poundsToKilograms = value => Number(value) * LB_TO_KG;
export const kilogramsToPounds = value => Number(value) / LB_TO_KG;
export const inchesToCentimeters = value => Number(value) * IN_TO_CM;
export const centimetersToInches = value => Number(value) / IN_TO_CM;
export const milesToKilometers = value => Number(value) * MI_TO_KM;
export const kilometersToMiles = value => Number(value) / MI_TO_KM;

export function displayMass(value, digits = 1, kind = UNIT_KINDS.BODY_WEIGHT) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric(kind) ? round(number * LB_TO_KG, digits) : round(number, digits);
}

export function canonicalMass(value, kind = UNIT_KINDS.BODY_WEIGHT) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric(kind) ? number / LB_TO_KG : number;
}

export function displayLength(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric(UNIT_KINDS.LENGTH) ? round(number * IN_TO_CM, digits) : round(number, digits);
}

export function canonicalLength(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric(UNIT_KINDS.LENGTH) ? number / IN_TO_CM : number;
}

export function displayDistance(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric(UNIT_KINDS.DISTANCE) ? round(number * MI_TO_KM, digits) : round(number, digits);
}

export function canonicalDistance(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric(UNIT_KINDS.DISTANCE) ? number / MI_TO_KM : number;
}

export function massUnit(kind = UNIT_KINDS.BODY_WEIGHT) { return isMetric(kind) ? "kg" : "lb"; }
export function lengthUnit() { return isMetric(UNIT_KINDS.LENGTH) ? "cm" : "in"; }
export function distanceUnit() { return isMetric(UNIT_KINDS.DISTANCE) ? "km" : "mi"; }

export function initializeUnitSystem() {
    if (observer || typeof document === "undefined") return;
    const start = () => {
        applyUnitPreferences(document.body);
        observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === "characterData") applyTextNode(mutation.target);
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) applyTextNode(node);
                    else if (node.nodeType === Node.ELEMENT_NODE) applyUnitPreferences(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        document.addEventListener("input", handleLiveInput, true);
        document.addEventListener("change", handleCanonicalEvent, true);
        document.addEventListener("submit", handleCanonicalEvent, true);
        document.addEventListener("click", handleActionClick, true);
        window.addEventListener("levelup:units-changed", () => queueUnitRefresh());
    };
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
}

export function applyUnitPreferences(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
        prepareInput(root);
        root.querySelectorAll?.("input").forEach(prepareInput);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) applyTextNode(node);
}

function applyTextNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,textarea,[data-unit-text-ignore]")) return;
    const current = node.nodeValue || "";
    if (!node.__levelUpUnitSource || current !== node.__levelUpUnitRendered) node.__levelUpUnitSource = current;
    const source = node.__levelUpUnitSource;
    const rendered = preferenceText(source, parent);
    if (current !== rendered) node.nodeValue = rendered;
    node.__levelUpUnitRendered = rendered;
}

function preferenceText(source, parent) {
    let text = String(source);
    const massKind = workoutMassContext(parent) ? UNIT_KINDS.LIFTING_WEIGHT : UNIT_KINDS.BODY_WEIGHT;
    if (isMetric(massKind)) {
        text = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\b/gi, (_, raw) => {
            const value = Number(raw.replace(/,/g, ""));
            return Number.isFinite(value) ? `${formatConverted(value * LB_TO_KG, raw)} kg` : _;
        });
        text = text.replace(/\b(?:lb|lbs)\s*\/\s*(wk|week)\b/gi, "kg/$1");
        text = text.replace(/\b(?:lb|lbs|pounds?)\b/gi, "kg");
    }
    if (isMetric(UNIT_KINDS.DISTANCE)) {
        text = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*(?:miles?|mi)\b/gi, (_, raw) => {
            const value = Number(raw.replace(/,/g, ""));
            return Number.isFinite(value) ? `${formatConverted(value * MI_TO_KM, raw, 2)} km` : _;
        });
        text = text.replace(/\b(?:miles?|mi)\b/gi, "km");
    }
    if (isMetric(UNIT_KINDS.LENGTH) && parent.closest(".measurements-page,.measurement-entry-card,.measurement-progress-card,.measurement-history,.measurement-history-detail")) {
        text = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*in\b/gi, (_, raw) => {
            const value = Number(raw.replace(/,/g, ""));
            return Number.isFinite(value) ? `${formatConverted(value * IN_TO_CM, raw)} cm` : _;
        });
        text = text.replace(/\(in\)|\binches?\b/gi, match => match.startsWith("(") ? "(cm)" : "cm");
    }
    return text;
}

function workoutMassContext(parent) {
    if (parent.closest(".workout-session-logger,.workout-builder,.workout-history,.training-progress,.exercise-progress,.plate-calculator,.starting-weight-modal,[data-workout-id],[data-exercise-id]")) return true;
    const identity = [parent.id, parent.className].join(" ").toLowerCase();
    return /(workout|exercise|lifting|session|plate|load|1rm|one-rep)/.test(identity);
}

function formatConverted(value, source, maximumDigits = 1) {
    const sourceDecimals = String(source).includes(".") ? String(source).split(".")[1].length : 0;
    const digits = Math.min(maximumDigits, Math.max(sourceDecimals, value < 10 ? 1 : 0));
    return round(value, digits).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function prepareInput(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== "number") return;
    if (input.matches("[data-unit-input-ignore]")) return;
    const kind = inputKind(input);
    if (!kind) return;
    input.dataset.levelUpUnitKind = kind;
    if (!input.dataset.levelUpCanonicalStep) input.dataset.levelUpCanonicalStep = input.step || "";
    renderInputForPreference(input);
}

function inputKind(input) {
    if (input.matches("[data-measurement-field]")) return "length";
    const identity = [input.id, input.name, input.className, input.getAttribute("aria-label")].join(" ").toLowerCase();
    if (/distance/.test(identity)) return "distance";
    if (input.matches(".session-weight,.plate-calculator-base-input") || /(load|lifting|exercise|1rm|one.?rep)/.test(identity)) return UNIT_KINDS.LIFTING_WEIGHT;
    if (/weight/.test(identity)) return UNIT_KINDS.BODY_WEIGHT;
    const label = input.closest("label")?.textContent?.toLowerCase() || "";
    if (/\b(lb|lbs|kg)\b/.test(label)) return workoutMassContext(input) ? UNIT_KINDS.LIFTING_WEIGHT : UNIT_KINDS.BODY_WEIGHT;
    return "";
}

function renderInputForPreference(input) {
    const kind = input.dataset.levelUpUnitKind;
    const desired = isMetric(kind) ? METRIC : IMPERIAL;
    const rendered = input.dataset.levelUpRenderedUnit || IMPERIAL;
    if (desired === rendered) return;
    const value = Number(input.value);
    if (Number.isFinite(value) && input.value !== "") {
        const next = desired === METRIC ? fromCanonical(kind, value) : toCanonical(kind, value);
        input.value = formatInput(next, kind);
    }
    input.dataset.levelUpRenderedUnit = desired;
    if (desired === METRIC) input.step = kind === "distance" ? "0.01" : "0.1";
    else input.step = input.dataset.levelUpCanonicalStep || input.step;
}

function handleLiveInput(event) {
    const input = event.target;
    if (!input?.matches?.("input[data-level-up-unit-kind]")) return;
    if (!input.matches(".session-weight,.plate-calculator-base-input,[data-measurement-field]")) return;
    const changed = toCanonicalInput(input);
    if (changed) queueMicrotask(() => renderInputForPreference(input));
}

function handleCanonicalEvent(event) {
    const targets = event.type === "change" && event.target?.matches?.("input[data-level-up-unit-kind]")
        ? [event.target]
        : [...document.querySelectorAll("input[data-level-up-unit-kind]")];
    const changed = targets.filter(toCanonicalInput);
    queueMicrotask(() => changed.forEach(renderInputForPreference));
}

function handleActionClick(event) {
    if (!event.target.closest("button,input[type=submit]")) return;
    handleCanonicalEvent(event);
}

function toCanonicalInput(input) {
    if (input.dataset.levelUpRenderedUnit !== METRIC) return false;
    const value = Number(input.value);
    if (Number.isFinite(value) && input.value !== "") input.value = formatInput(toCanonical(input.dataset.levelUpUnitKind, value), input.dataset.levelUpUnitKind, true);
    input.dataset.levelUpRenderedUnit = IMPERIAL;
    return true;
}

function fromCanonical(kind, value) {
    if (kind === "length") return value * IN_TO_CM;
    if (kind === "distance") return value * MI_TO_KM;
    return value * LB_TO_KG;
}

function toCanonical(kind, value) {
    if (kind === "length") return value / IN_TO_CM;
    if (kind === "distance") return value / MI_TO_KM;
    return value / LB_TO_KG;
}

function formatInput(value, kind, canonical = false) {
    const digits = canonical ? 4 : kind === "distance" ? 2 : 1;
    return String(round(value, digits));
}

function round(value, digits) {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function queueUnitRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        document.querySelectorAll("input[data-level-up-unit-kind]").forEach(input => {
            input.dataset.levelUpRenderedUnit = input.dataset.levelUpRenderedUnit || IMPERIAL;
            renderInputForPreference(input);
        });
        applyUnitPreferences(document.body);
    });
}

initializeUnitSystem();
