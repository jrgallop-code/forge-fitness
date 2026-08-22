export const UNIT_SYSTEM_KEY = "level_up_unit_system";
export const IMPERIAL = "imperial";
export const METRIC = "metric";

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const MI_TO_KM = 1.609344;
let observer = null;
let refreshQueued = false;

export function getUnitSystem() {
    return localStorage.getItem(UNIT_SYSTEM_KEY) === METRIC ? METRIC : IMPERIAL;
}

export function isMetric() {
    return getUnitSystem() === METRIC;
}

export function setUnitSystem(value, { reload = false } = {}) {
    const next = value === METRIC ? METRIC : IMPERIAL;
    localStorage.setItem(UNIT_SYSTEM_KEY, next);
    window.dispatchEvent(new CustomEvent("levelup:units-changed", { detail: { unitSystem: next } }));
    if (reload) window.location.reload();
    else queueUnitRefresh();
    return next;
}

export const poundsToKilograms = value => Number(value) * LB_TO_KG;
export const kilogramsToPounds = value => Number(value) / LB_TO_KG;
export const inchesToCentimeters = value => Number(value) * IN_TO_CM;
export const centimetersToInches = value => Number(value) / IN_TO_CM;
export const milesToKilometers = value => Number(value) * MI_TO_KM;
export const kilometersToMiles = value => Number(value) / MI_TO_KM;

export function displayMass(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric() ? round(number * LB_TO_KG, digits) : round(number, digits);
}

export function canonicalMass(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric() ? number / LB_TO_KG : number;
}

export function displayLength(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric() ? round(number * IN_TO_CM, digits) : round(number, digits);
}

export function canonicalLength(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric() ? number / IN_TO_CM : number;
}

export function displayDistance(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric() ? round(number * MI_TO_KM, digits) : round(number, digits);
}

export function canonicalDistance(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return isMetric() ? number / MI_TO_KM : number;
}

export function massUnit() { return isMetric() ? "kg" : "lb"; }
export function lengthUnit() { return isMetric() ? "cm" : "in"; }
export function distanceUnit() { return isMetric() ? "km" : "mi"; }

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
    const rendered = isMetric() ? metricText(source, parent) : source;
    if (current !== rendered) node.nodeValue = rendered;
    node.__levelUpUnitRendered = rendered;
}

function metricText(source, parent) {
    let text = String(source);
    text = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\b/gi, (_, raw) => {
        const value = Number(raw.replace(/,/g, ""));
        return Number.isFinite(value) ? `${formatConverted(value * LB_TO_KG, raw)} kg` : _;
    });
    text = text.replace(/\b(?:lb|lbs)\s*\/\s*(wk|week)\b/gi, "kg/$1");
    text = text.replace(/\b(?:lb|lbs|pounds?)\b/gi, "kg");
    text = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*(?:miles?|mi)\b/gi, (_, raw) => {
        const value = Number(raw.replace(/,/g, ""));
        return Number.isFinite(value) ? `${formatConverted(value * MI_TO_KM, raw, 2)} km` : _;
    });
    text = text.replace(/\b(?:miles?|mi)\b/gi, "km");
    if (parent.closest(".measurements-page,.measurement-entry-card,.measurement-progress-card,.measurement-history,.measurement-history-detail")) {
        text = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*in\b/gi, (_, raw) => {
            const value = Number(raw.replace(/,/g, ""));
            return Number.isFinite(value) ? `${formatConverted(value * IN_TO_CM, raw)} cm` : _;
        });
        text = text.replace(/\(in\)|\binches?\b/gi, match => match.startsWith("(") ? "(cm)" : "cm");
    }
    return text;
}

function formatConverted(value, source, maximumDigits = 1) {
    const sourceDecimals = String(source).includes(".") ? String(source).split(".")[1].length : 0;
    const digits = Math.min(maximumDigits, Math.max(sourceDecimals, value < 10 ? 1 : 0));
    return round(value, digits).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function prepareInput(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== "number") return;
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
    if (/(weight|load)/.test(identity) || input.matches(".session-weight,.plate-calculator-base-input")) return "mass";
    const label = input.closest("label")?.textContent?.toLowerCase() || "";
    if (/\b(lb|lbs|kg)\b/.test(label)) return "mass";
    return "";
}

function renderInputForPreference(input) {
    const kind = input.dataset.levelUpUnitKind;
    const desired = getUnitSystem();
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
