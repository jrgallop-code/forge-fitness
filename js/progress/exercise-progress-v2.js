import { displayMass, massUnit } from "../core/unit-system.js";
import { getExerciseById } from "../workouts/exercise-library.js";
import { calculateSetVolume } from "../workouts/volume-calculator.js?v=two-dumbbells-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
let unitListenerBound = false;
let selectedMetric = "volume";

export function initializeExerciseProgressV2() {
    const oldCanvas = document.getElementById("exercise-strength-chart");
    const existingHost = document.getElementById("exercise-strength-chart-v2");
    if (oldCanvas && !existingHost) {
        const host = document.createElement("div");
        host.id = "exercise-strength-chart-v2";
        host.className = oldCanvas.className || "training-chart";
        host.setAttribute("aria-label", "Exercise session volume chart");
        oldCanvas.replaceWith(host);
    }
    if (!document.getElementById("exercise-strength-chart-v2")) return;
    addAllHistoryExercises();
    bindControls();
    renderExerciseProgressV2();
    if (!unitListenerBound) {
        unitListenerBound = true;
        window.addEventListener("levelup:units-changed", renderExerciseProgressV2);
    }
}

function addAllHistoryExercises() {
    const select = document.getElementById("exercise-progress-select");
    if (!select) return;
    const existing = new Set([...select.options].map(option => option.value));
    const ids = getSessions().flatMap(session => session.exercises || [])
        .filter(exercise => exercise?.exerciseId && exercise?.trackingType !== "notes")
        .map(exercise => exercise.exerciseId);
    [...new Set(ids)].forEach(id => {
        if (existing.has(id)) return;
        const option = document.createElement("option");
        option.value = id;
        option.textContent = getExerciseById(id)?.name || id;
        select.appendChild(option);
    });
}

function bindControls() {
    bindOnce(document.getElementById("exercise-progress-select"), "change", renderExerciseProgressV2);
    bindOnce(document.getElementById("lifting-tab"), "click", () => requestAnimationFrame(renderExerciseProgressV2));
    bindOnce(document.getElementById("progress-range"), "change", renderExerciseProgressV2);
    document.querySelectorAll("[data-exercise-metric]").forEach(button => bindOnce(button, "click", () => {
        selectedMetric = button.dataset.exerciseMetric;
        renderExerciseProgressV2();
    }));
}

function bindOnce(element, eventName, handler) {
    if (!element) return;
    const key = `epv2${eventName}`;
    if (element.dataset[key]) return;
    element.dataset[key] = "1";
    element.addEventListener(eventName, handler);
}

function renderExerciseProgressV2() {
    const host = document.getElementById("exercise-strength-chart-v2");
    const select = document.getElementById("exercise-progress-select");
    const history = document.getElementById("exercise-history-body");
    if (!host || !select || !history) return;
    const allRecords = getExerciseRecords(select.value);
    const records = filterRange(allRecords);
    updateControls();
    renderComparison(allRecords);
    renderSvgChart(host, records);
    renderHistory(history, records);
}

function getExerciseRecords(exerciseId) {
    if (!exerciseId) return [];
    return getSessions().map(session => {
        const sets = (session.exercises || [])
            .filter(exercise => exercise?.exerciseId === exerciseId && exercise?.trackingType !== "notes")
            .flatMap(exercise => Array.isArray(exercise.sets) ? exercise.sets : [])
            .filter(isWorkingSet);
        if (!sets.length) return null;
        const ranked = sets.map(set => ({ set, oneRepMax: estimateOneRepMax(set) })).sort((a, b) => b.oneRepMax - a.oneRepMax);
        return {
            date: session.date,
            completedAt: session.completedAt || session.updatedAt || "",
            bestSet: ranked[0].set,
            estimatedOneRepMax: ranked[0].oneRepMax,
            completedSets: sets.length,
            totalReps: sets.reduce((sum, set) => sum + Number(set.reps) + dropReps(set), 0),
            sessionVolume: sets.reduce((sum, set) => sum + calculateSetVolume(set, exerciseId), 0),
            heaviestWeight: Math.max(...sets.map(set => Number(set.weight)))
        };
    }).filter(Boolean).sort(compareRecords);
}

function isWorkingSet(set) {
    if (!set || set.isWarmup || set.warmup || set.type === "warmup" || set.setType === "warmup") return false;
    const reps = Number(set.reps);
    const weight = Number(set.weight);
    return Number.isFinite(reps) && reps > 0 && Number.isFinite(weight) && weight > 0;
}

function validDrops(set) {
    return (Array.isArray(set?.dropSets) ? set.dropSets : []).filter(drop => Number(drop?.weight) > 0 && Number(drop?.reps) > 0);
}
function dropReps(set) { return validDrops(set).reduce((sum, drop) => sum + Number(drop.reps), 0); }
function estimateOneRepMax(set) { return Number(set.weight) * (1 + Number(set.reps) / 30); }
function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}
function compareRecords(a, b) { return `${a.date || ""}|${a.completedAt || ""}`.localeCompare(`${b.date || ""}|${b.completedAt || ""}`); }

function filterRange(records) {
    const days = Number(document.getElementById("progress-range")?.value || 0);
    if (!Number.isFinite(days) || !records.length) return records;
    if (days <= 0) return records;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return records.filter(record => {
        const date = parseDate(record.date);
        return date && date >= cutoff;
    });
}

function updateControls() {
    document.querySelectorAll("[data-exercise-metric]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.exerciseMetric === selectedMetric)));
    const note = document.getElementById("exercise-progress-note");
    if (note) note.textContent = selectedMetric === "volume"
        ? "Two-dumbbell exercises count both dumbbells; other loads use weight × reps."
        : "Best-set Epley estimate—not a tested maximum.";
}

function renderComparison(records) {
    const container = document.getElementById("exercise-volume-comparison");
    if (!container) return;
    container.hidden = false;
    if (!records.length) {
        container.innerHTML = `<p class="empty-state">Log this exercise to establish your first ${selectedMetric === "volume" ? "session volume" : "estimated 1RM"}.</p>`;
        return;
    }
    const latest = records.at(-1);
    const previous = records.at(-2);
    const isVolume = selectedMetric === "volume";
    const latestValue = isVolume ? latest.sessionVolume : latest.estimatedOneRepMax;
    const previousValue = previous ? (isVolume ? previous.sessionVolume : previous.estimatedOneRepMax) : null;
    const change = previous ? latestValue - previousValue : null;
    const percent = previousValue > 0 ? change / previousValue * 100 : null;
    const valueLabel = value => isVolume ? formatVolume(value) : formatMass(value, 1);
    const changeLabel = value => isVolume ? signedVolume(value) : signedMass(value, 1);
    container.innerHTML = `
        <div class="exercise-volume-stat"><span>Latest</span><strong>${valueLabel(latestValue)}</strong></div>
        <div class="exercise-volume-stat"><span>Previous</span><strong>${previous ? valueLabel(previousValue) : "—"}</strong></div>
        <div class="exercise-volume-stat"><span>Change</span><strong class="${change > 0 ? "is-positive" : change < 0 ? "is-negative" : ""}">${change === null ? "First session" : `${changeLabel(change)} · ${signedPercent(percent)}`}</strong></div>
        <p class="exercise-volume-detail">${isVolume ? buildChangeDetail(latest, previous) : buildStrengthDetail(latest, previous)}</p>`;
}

function buildStrengthDetail(latest, previous) {
    if (!previous) return `Best set ${formatSet(latest.bestSet)} establishes your baseline`;
    return `Best set ${formatSet(latest.bestSet)} · previously ${formatSet(previous.bestSet)}`;
}

function buildChangeDetail(latest, previous) {
    if (!previous) return `${latest.completedSets} working sets · ${latest.totalReps} total reps`;
    const weightChange = latest.heaviestWeight - previous.heaviestWeight;
    const repChange = latest.totalReps - previous.totalReps;
    const setChange = latest.completedSets - previous.completedSets;
    const parts = [weightChange === 0 ? "Same top weight" : `${signedMass(weightChange)} top weight`, repChange === 0 ? "same total reps" : `${signedNumber(repChange)} total reps`];
    if (setChange !== 0) parts.push(`${signedNumber(setChange)} working sets`);
    return parts.join(" · ");
}

function renderHistory(container, records) {
    const header = container.previousElementSibling;
    if (header?.classList.contains("exercise-history-header")) header.innerHTML = selectedMetric === "volume"
        ? "<span>Date</span><span>Volume</span><span>Change</span><span>Sets</span>"
        : "<span>Date</span><span>Best Set</span><span>Est. 1RM</span><span>Sets</span>";
    if (!records.length) {
        container.innerHTML = '<p class="empty-state">No completed weighted working sets in this timeframe.</p>';
        return;
    }
    container.innerHTML = [...records].reverse().map((record, reverseIndex) => {
        const originalIndex = records.length - 1 - reverseIndex;
        const previous = originalIndex > 0 ? records[originalIndex - 1] : null;
        return selectedMetric === "volume" ? `
            <div class="exercise-history-row"><span>${formatDate(record.date)}</span><strong>${formatVolume(record.sessionVolume)}</strong>
            <span>${previous ? signedPercent((record.sessionVolume - previous.sessionVolume) / previous.sessionVolume * 100) : "Baseline"}</span><span>${record.completedSets}</span></div>` : `
            <div class="exercise-history-row"><span>${formatDate(record.date)}</span><strong>${formatSet(record.bestSet)}</strong>
            <span>${formatMass(record.estimatedOneRepMax, 1)}</span><span>${record.completedSets}</span></div>`;
    }).join("");
}

function renderSvgChart(host, records) {
    const isVolume = selectedMetric === "volume";
    const valueFor = record => isVolume ? displayVolume(record.sessionVolume) : displayMass(record.estimatedOneRepMax, 1);
    const values = records.map(valueFor).filter(Number.isFinite);
    const width = Math.max(320, Math.round(host.clientWidth || 700));
    const height = 300;
    const padding = { top: 34, right: 18, bottom: 46, left: 62 };
    const axisLabel = isVolume ? `Session Volume (${massUnit()})` : `Estimated 1RM (${massUnit()})`;
    host.setAttribute("aria-label", `${axisLabel} across logged sessions`);
    if (!values.length) {
        host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="300" role="img" aria-label="No exercise progress data"><text x="${padding.left}" y="18" fill="#a0a0a0" font-size="12">${axisLabel}</text><line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#333"/><line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#333"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#a0a0a0" font-size="12">No completed weighted sets to plot</text></svg>`;
        return;
    }
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = Math.max(isVolume ? 100 : 5, maxValue - minValue);
    const step = isVolume ? niceStep(spread / 4) : 5;
    let axisMin = Math.max(0, Math.floor((minValue - spread * .12) / step) * step);
    let axisMax = Math.ceil((maxValue + spread * .12) / step) * step;
    if (axisMax <= axisMin) axisMax = axisMin + step * 2;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const coords = records.map((record, index) => {
        const value = valueFor(record);
        return { ...record, value, x: records.length === 1 ? padding.left + chartWidth / 2 : padding.left + index / (records.length - 1) * chartWidth, y: padding.top + (axisMax - value) / (axisMax - axisMin) * chartHeight };
    });
    const ticks = Array.from({ length: 5 }, (_, index) => axisMin + (axisMax - axisMin) * index / 4);
    host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="300" role="img" aria-label="${axisLabel} progress"><text x="${padding.left}" y="18" fill="#a0a0a0" font-size="12">${axisLabel}</text>
        ${ticks.map(tick => { const y = padding.top + (axisMax - tick) / (axisMax - axisMin) * chartHeight; return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#2f2f2f"/><text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="#a0a0a0" font-size="11">${formatAxis(tick)}</text>`; }).join("")}
        <polyline points="${coords.map(point => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="#ef1b24" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
        ${coords.map((point, index) => { const show = coords.length <= 8 || index === 0 || index === coords.length - 1 || index % Math.ceil(coords.length / 6) === 0; return `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#fff"><title>${formatDate(point.date)}: ${isVolume ? formatVolume(point.sessionVolume) : formatMass(point.estimatedOneRepMax, 1)}</title></circle>${show ? `<text x="${point.x}" y="${height - 18}" text-anchor="middle" fill="#a0a0a0" font-size="11">${formatShortDate(point.date)}</text>` : ""}`; }).join("")}</svg>`;
}

function displayVolume(value) { return displayMass(value, 0); }
function formatVolume(value) { return `${Number(displayVolume(value)).toLocaleString()} ${massUnit()}`; }
function formatMass(value, digits = 0) { const shown = displayMass(value, digits); return `${Number(shown).toLocaleString(undefined, { maximumFractionDigits: digits })} ${massUnit()}`; }
function signedVolume(value) { return `${value > 0 ? "+" : ""}${Number(displayVolume(value)).toLocaleString()} ${massUnit()}`; }
function signedMass(value, digits = 0) { return `${value > 0 ? "+" : ""}${formatMass(value, digits)}`; }
function signedNumber(value) { return `${value > 0 ? "+" : ""}${value}`; }
function signedPercent(value) { return Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : "—"; }
function formatSet(set) { return `${formatMass(Number(set.weight))} × ${Number(set.reps)}`; }
function formatAxis(value) { return Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : Math.round(value); }
function niceStep(value) { const power = 10 ** Math.floor(Math.log10(Math.max(1, value))); const normalized = value / power; return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power; }
function parseDate(value) { if (!value) return null; const date = new Date(`${String(value).slice(0, 10)}T12:00:00`); return Number.isFinite(date.getTime()) ? date : null; }
function formatDate(value) { const date = parseDate(value); return date ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date) : "Unknown"; }
function formatShortDate(value) { const date = parseDate(value); return date ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date) : ""; }
