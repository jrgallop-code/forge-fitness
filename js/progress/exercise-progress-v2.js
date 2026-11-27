import { exerciseThumbnail } from "../workouts/exercise-thumbnails.js";
import { isStaticHold } from "../workouts/static-holds.js";
import { holdProgressRecords, holdComparison } from "./hold-progress-model.js";
import { UNIT_KINDS, displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";
import { getExerciseById } from "../workouts/exercise-library.js";
import { calculateSetVolume } from "../workouts/volume-calculator.js?v=two-dumbbells-1";

import { supportsEquipmentProfiles } from "../workouts/equipment-profiles.js";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
let unitListenerBound = false;
let selectedMetric = "volume";
let selectedEquipment = "all";
let selectedExerciseId = "";
let selectedMachineView = "combined";

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
    selectedEquipment = "all";
    selectedMachineView = "combined";
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
    installProgressExercisePicker(document.getElementById("exercise-progress-select"));
    bindOnce(document.getElementById("exercise-progress-select"), "change", renderExerciseProgressV2);
    bindOnce(document.getElementById("lifting-tab"), "click", () => requestAnimationFrame(renderExerciseProgressV2));
    bindOnce(document.getElementById("progress-range"), "change", renderExerciseProgressV2);
    bindOnce(document.getElementById("exercise-equipment-filter"), "change", event => {
        selectedEquipment = event.target.value || "all";
        if (selectedEquipment === "all") selectedMachineView = "combined";
        renderExerciseProgressV2();
    });
    document.querySelectorAll("[data-exercise-metric]").forEach(button => bindOnce(button, "click", () => {
        selectedMetric = button.dataset.exerciseMetric;
        renderExerciseProgressV2();
    }));
    document.querySelectorAll("[data-machine-view]").forEach(button => bindOnce(button, "click", () => {
        selectedMachineView = button.dataset.machineView || "combined";
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
    addAllHistoryExercises();
    const host = document.getElementById("exercise-strength-chart-v2");
    const select = document.getElementById("exercise-progress-select");
    const history = document.getElementById("exercise-history-body");
    if (!host || !select || !history) return;
    installProgressExercisePicker(select);
    const hold = isStaticHold(select.value);
    document.querySelectorAll('[data-exercise-metric]').forEach(button => {
        const metric = button.dataset.exerciseMetric;
        button.hidden = hold && metric !== 'strength';
        button.textContent = hold ? ({volume:'Total time', strength:'Best hold', weight:'Added weight'}[metric]) : ({volume:'Session Volume', strength:'Estimated 1RM', weight:'Weight & reps'}[metric]);
    });
    if (hold) { renderHoldProgress(host, history, select.value); return; }
    document.getElementById('hold-progress-filter')?.remove();
    history.previousElementSibling?.classList.remove('hold-best-history');
    document.getElementById('exercise-volume-comparison')?.classList.remove('hold-progress-summary');
    const allRecords = getExerciseRecords(select.value).filter(record => selectedMetric !== "weight" || record.weightSet);
    const profiles = getProfiles(allRecords);
    if (selectedExerciseId !== select.value) {
        selectedExerciseId = select.value;
        selectedEquipment = "all";
        selectedMachineView = "combined";
    }
    updateEquipmentFilter(profiles);
    if (!supportsEquipmentProfiles(getExerciseById(select.value))) { selectedEquipment = "all"; selectedMachineView = "combined"; }
    const hasMachineBreakdown = selectedEquipment === "all" && profiles.length > 1 && supportsEquipmentProfiles(getExerciseById(select.value));
    const comparisonProfiles = profiles.filter(profile => profile.id !== "default");
    updateMachineViewControls(hasMachineBreakdown, comparisonProfiles.length > 1);
    updateControls(hasMachineBreakdown);

    if (hasMachineBreakdown && selectedMachineView === "compare") {
        const records = filterRange(allRecords.filter(record => record.profileId !== "default"));
        renderNormalizedEquipmentSummary(records, comparisonProfiles);
        renderNormalizedMachineChart(host, records, comparisonProfiles);
        renderEquipmentLegend(comparisonProfiles, "Compare each machine from its own baseline.");
        renderHistory(history, records);
        return;
    }

    if (hasMachineBreakdown && selectedMachineView === "separate") {
        const records = filterRange(allRecords);
        renderEquipmentSummary(records, profiles);
        renderSeparateMachineCharts(host, records, profiles);
        renderEquipmentLegend(profiles, "Raw results stay separated by machine.");
        renderHistory(history, records);
        return;
    }

    const equipmentRecords = selectedEquipment === "all"
        ? aggregateEquipmentRecords(allRecords)
        : allRecords.filter(record => record.profileId === selectedEquipment);
    const records = filterRange(equipmentRecords);
    renderComparison(equipmentRecords);
    renderSvgChart(host, records);
    renderEquipmentLegend(
        selectedEquipment === "all" && hasMachineBreakdown
            ? []
            : profiles.filter(profile => selectedEquipment === "all" || profile.id === selectedEquipment),
        hasMachineBreakdown ? "Combined line — machines are not differentiated." : ""
    );
    renderHistory(history, selectedEquipment === "all" && hasMachineBreakdown ? filterRange(allRecords) : records);
}

function updateMachineViewControls(visible, canCompare) {
    const controls = document.getElementById("exercise-machine-view-controls");
    if (!controls) return;
    controls.hidden = !visible;
    controls.classList.toggle("has-two-options", !canCompare);
    const compareButton = controls.querySelector('[data-machine-view="compare"]');
    if (compareButton) compareButton.hidden = !canCompare;
    if (!canCompare && selectedMachineView === "compare") selectedMachineView = "separate";
    controls.querySelectorAll("[data-machine-view]").forEach(button =>
        button.setAttribute("aria-pressed", String(button.dataset.machineView === selectedMachineView))
    );
}

function getExerciseRecords(exerciseId) {
    if (!exerciseId) return [];
    return getSessions().flatMap(session => {
        const grouped = new Map();
        (session.exercises || [])
            .filter(exercise => exercise?.exerciseId === exerciseId && exercise?.trackingType !== "notes" && !isStaticHold(exercise))
            .forEach(exercise => {
                const profileId = exercise.equipmentProfileId || "default";
                const current = grouped.get(profileId) || {
                    profileId,
                    profileName: resolveEquipmentLabel(exerciseId, profileId, exercise.equipmentProfileName),
                    sets: []
                };
                current.sets.push(...(Array.isArray(exercise.sets) ? exercise.sets : []).filter(isWorkingSet));
                grouped.set(profileId, current);
            });

        return [...grouped.values()].map(group => {
            if (!group.sets.length) return null;
            const ranked = group.sets.map(set => ({ set, oneRepMax: estimateOneRepMax(set) })).sort((a, b) => b.oneRepMax - a.oneRepMax);
            return {
                date: session.date,
                completedAt: session.completedAt || session.updatedAt || "",
                profileId: group.profileId,
                profileName: group.profileName,
                bestSet: ranked[0].set,
                weightSet: selectWeightSet(group.sets),
                estimatedOneRepMax: ranked[0].oneRepMax,
                completedSets: group.sets.length,
                totalReps: group.sets.reduce((sum, set) => sum + Number(set.reps) + dropReps(set), 0),
                sessionVolume: group.sets.reduce((sum, set) => sum + calculateSetVolume(set, exerciseId), 0),
                heaviestWeight: Math.max(...group.sets.map(set => Number(set.weight)))
            };
        }).filter(Boolean);
    }).sort(compareRecords);
}

export function resolveEquipmentLabel(exerciseId, profileId = "default", savedName = "") {
    const cleanSavedName = String(savedName || "").trim();
    if (profileId !== "default" && cleanSavedName && cleanSavedName !== "Default machine") {
        return cleanSavedName;
    }
    const libraryEquipment = String(getExerciseById(exerciseId)?.equipment || "").trim();
    if (libraryEquipment) return libraryEquipment;
    if (cleanSavedName && cleanSavedName !== "Default machine") return cleanSavedName;
    return "Equipment";
}

function getProfiles(records) {
    const profiles = new Map();
    records.forEach(record => profiles.set(record.profileId, {
        id: record.profileId,
        name: record.profileName
    }));
    return [...profiles.values()];
}

function updateEquipmentFilter(profiles) {
    const select = document.getElementById("exercise-equipment-filter");
    if (!select) return;
    const machine = supportsEquipmentProfiles(getExerciseById(selectedExerciseId));
    select.closest("label").hidden = !machine;
    if (profiles.length < 2) {
        selectedEquipment = "all";
        select.innerHTML = `<option value="all">${escapeHtml(profiles[0]?.name || "Equipment")}</option>`;
        select.value = "all";
        select.disabled = true;
        return;
    }
    select.innerHTML = `<option value="all">All machines</option>${profiles.map(profile =>
        `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>`
    ).join("")}`;
    const values = ["all", ...profiles.map(profile => profile.id)];
    if (!values.includes(selectedEquipment)) selectedEquipment = "all";
    select.value = selectedEquipment;
    select.disabled = profiles.length < 2;
}

function aggregateEquipmentRecords(records) {
    const grouped = new Map();
    records.forEach(record => {
        const key = `${record.date || ""}|${record.completedAt || ""}`;
        const current = grouped.get(key) || {
            ...record,
            profileId: "all",
            profileName: "All equipment",
            completedSets: 0,
            totalReps: 0,
            sessionVolume: 0,
            heaviestWeight: 0
        };
        current.completedSets += record.completedSets;
        current.totalReps += record.totalReps;
        current.sessionVolume += record.sessionVolume;
        current.heaviestWeight = Math.max(current.heaviestWeight, record.heaviestWeight);
        if (record.weightSet && (!current.weightSet || Number(record.weightSet.weight) > Number(current.weightSet.weight) ||
            (Number(record.weightSet.weight) === Number(current.weightSet.weight) && Number(record.weightSet.reps) > Number(current.weightSet.reps)))) current.weightSet = record.weightSet;
        if (record.estimatedOneRepMax > current.estimatedOneRepMax) {
            current.estimatedOneRepMax = record.estimatedOneRepMax;
            current.bestSet = record.bestSet;
        }
        grouped.set(key, current);
    });
    return [...grouped.values()].sort(compareRecords);
}

export function selectWeightSet(sets) {
    return sets.filter(isWorkingSet).filter(set => !["drop", "dropset", "drop-set"].includes(set.type || set.setType))
        .sort((a, b) => Number(b.weight) - Number(a.weight) || Number(b.reps) - Number(a.reps))[0] || null;
}

function rawMetricValue(record) {
    if (selectedMetric === "weight") return Number(record.weightSet?.weight || 0);
    return selectedMetric === "volume" ? record.sessionVolume : record.estimatedOneRepMax;
}
function metricSet(record) { return selectedMetric === "weight" ? record.weightSet : record.bestSet; }

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

function updateControls(hasMachineBreakdown = false) {
    document.querySelectorAll("[data-exercise-metric]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.exerciseMetric === selectedMetric)));
    const note = document.getElementById("exercise-progress-note");
    if (!note) return;
    if (hasMachineBreakdown && selectedMachineView === "compare") {
        note.textContent = "Each machine starts at 0%. Compare improvement—not the displayed weight.";
    }
    else if (hasMachineBreakdown && selectedMachineView === "separate") {
        note.textContent = "Each card uses only workouts logged on that machine.";
    }
    else if (hasMachineBreakdown) {
        note.textContent = "Combined view connects every workout without differentiating machines.";
    }
    else {
        note.textContent = selectedMetric === "volume"
            ? "Two-dumbbell exercises count both dumbbells; other loads use weight × reps."
            : selectedMetric === "weight" ? "Heaviest working set with reps. More weight and more reps are separate milestones; weight alone does not prove a strength gain." : "Best-set Epley estimate—not a tested maximum.";
    }
}

function renderComparison(records) {
    const container = document.getElementById("exercise-volume-comparison");
    if (!container) return;
    container.hidden = false;
    if (!records.length) {
        container.innerHTML = `<p class="empty-state">Log this exercise to establish your first ${selectedMetric === "volume" ? "session volume" : selectedMetric === "weight" ? "working weight" : "estimated 1RM"}.</p>`;
        return;
    }
    const latest = records.at(-1);
    const previous = records.at(-2);
    const first = records[0];
    const isVolume = selectedMetric === "volume";
    const latestValue = rawMetricValue(latest);
    const previousValue = previous ? (rawMetricValue(previous)) : null;
    const baselineValue = rawMetricValue(first);
    const change = previous ? latestValue - previousValue : null;
    const percent = previousValue > 0 ? change / previousValue * 100 : null;
    const baselineChange = records.length > 1 ? latestValue - baselineValue : null;
    const baselinePercent = baselineValue > 0 && baselineChange !== null ? baselineChange / baselineValue * 100 : null;
    const valueLabel = value => isVolume ? formatVolume(value) : formatMass(value, 1);
    const changeLabel = value => isVolume ? signedVolume(value) : signedMass(value, 1);
    const baselineSummary = `<p class="exercise-progress-baseline">
            <span>Since first logged</span>
            <strong class="${baselineChange > 0 ? "is-positive" : baselineChange < 0 ? "is-negative" : ""}">${baselineChange === null ? "Baseline established" : `${changeLabel(baselineChange)} · ${signedPercent(baselinePercent)}`}</strong>
            <small>Baseline ${valueLabel(baselineValue)} · ${formatDate(first.date)}</small>
        </p>`;
    container.innerHTML = `
        <div class="exercise-volume-stat is-summary"><span>Latest</span><strong>${valueLabel(latestValue)}</strong></div>
        <div class="exercise-volume-stat is-summary"><span>Previous</span><strong>${previous ? valueLabel(previousValue) : "—"}</strong></div>
        <div class="exercise-volume-stat is-summary"><span>Since Previous</span><strong class="${change > 0 ? "is-positive" : change < 0 ? "is-negative" : ""}">${change === null ? "First session" : `${changeLabel(change)} · ${signedPercent(percent)}`}</strong></div>
        ${baselineSummary}
        <p class="exercise-volume-detail">${isVolume ? buildChangeDetail(latest, previous) : (selectedMetric === "weight" ? buildWeightDetail(latest, previous) : buildStrengthDetail(latest, previous))}</p>`;
}

function renderEquipmentSummary(records, profiles) {
    const container = document.getElementById("exercise-volume-comparison");
    if (!container) return;
    container.hidden = false;
    container.innerHTML = profiles.map(profile => {
        const profileRecords = records.filter(record => record.profileId === profile.id);
        const latest = profileRecords.at(-1);
        const first = profileRecords[0];
        const value = record => rawMetricValue(record);
        const label = number => selectedMetric === "volume" ? formatVolume(number) : formatMass(number, 1);
        const change = latest && first && profileRecords.length > 1 && value(first) > 0
            ? (value(latest) - value(first)) / value(first) * 100
            : null;
        return `<div class="exercise-volume-stat"><span>${escapeHtml(profile.name)}</span><strong>${latest ? label(value(latest)) : "—"}</strong><small class="${changeToneClass(change)}">${change === null ? "Baseline" : `${signedPercent(change)} from baseline`}</small></div>`;
    }).join("") + `<p class="exercise-volume-detail">Single workouts establish a baseline. More workouts form each machine’s line.</p>`;
}

function renderNormalizedEquipmentSummary(records, profiles) {
    const container = document.getElementById("exercise-volume-comparison");
    if (!container) return;
    container.hidden = false;
    container.innerHTML = profiles.map(profile => {
        const profileRecords = records.filter(record => record.profileId === profile.id);
        const first = profileRecords[0];
        const latest = profileRecords.at(-1);
        const value = record => rawMetricValue(record);
        const change = first && latest && profileRecords.length > 1 && value(first) > 0
            ? (value(latest) - value(first)) / value(first) * 100
            : null;
        return `<div class="exercise-volume-stat"><span>${escapeHtml(profile.name)}</span><strong class="${change > 0 ? "is-positive" : change < 0 ? "is-negative" : ""}">${change === null ? "Baseline" : signedPercent(change)}</strong><small>${profileRecords.length} workout${profileRecords.length === 1 ? "" : "s"}</small></div>`;
    }).join("") + `<p class="exercise-volume-detail">Each machine begins at 0%, so different resistance systems can be compared fairly.</p>`;
}

function buildWeightDetail(latest, previous) {
    if (!latest.weightSet) return "No regular weighted working sets recorded.";
    const current = formatSet(latest.weightSet);
    if (!previous?.weightSet) return `Heaviest working set ${current} establishes your baseline`;
    const delta = Number(latest.weightSet.weight) - Number(previous.weightSet.weight);
    const reps = Number(latest.weightSet.reps) - Number(previous.weightSet.reps);
    const milestone = delta > 0 ? "Weight increased" : delta === 0 && reps > 0 ? "Rep improvement" : delta === 0 ? "Same working weight" : "Lower working weight";
    return `${milestone} · ${current} · previously ${formatSet(previous.weightSet)}`;
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
        ? "<span>Date</span><span>Volume</span><span>Change</span><span>Equipment</span><span>Sets</span>"
        : (selectedMetric === "weight" ? "<span>Date</span><span>Weight & reps</span><span>Weight</span><span>Machine</span><span>Sets</span>" : "<span>Date</span><span>Best Set</span><span>Est. 1RM</span><span>Equipment</span><span>Sets</span>");
    if (!records.length) {
        container.innerHTML = '<p class="empty-state">No completed weighted working sets in this timeframe.</p>';
        return;
    }
    container.innerHTML = [...records].reverse().map((record, reverseIndex) => {
        const originalIndex = records.length - 1 - reverseIndex;
        const previous = records.slice(0, originalIndex).reverse()
            .find(item => item.profileId === record.profileId) || null;
        return selectedMetric === "volume" ? `
            <div class="exercise-history-row"><span>${formatDate(record.date)}</span><strong>${formatVolume(record.sessionVolume)}</strong>
            <span class="exercise-history-change ${previous ? changeToneClass(record.sessionVolume - previous.sessionVolume) : ""}">${previous ? signedPercent((record.sessionVolume - previous.sessionVolume) / previous.sessionVolume * 100) : "Baseline"}</span><span>${escapeHtml(record.profileName)}</span><span>${record.completedSets}</span></div>` : `
            <div class="exercise-history-row"><span>${formatDate(record.date)}</span><strong>${formatSet(metricSet(record))}</strong>
            <span>${formatMass(rawMetricValue(record), 1)}</span><span>${escapeHtml(record.profileName)}</span><span>${record.completedSets}</span></div>`;
    }).join("");
}

function equipmentColor(index) {
    return ["#2f91ff", "#31c978", "#ffb020", "#b879ff", "#ff5b67", "#3ed6d0"][index % 6];
}

function renderEquipmentLegend(profiles, message = "") {
    const legend = document.getElementById("exercise-equipment-legend");
    if (!legend) return;
    legend.innerHTML = profiles.map((profile, index) => `
        <span><i style="background:${profiles.length === 1 ? "var(--accent)" : equipmentColor(index)}"></i>${escapeHtml(profile.name)}</span>
    `).join("") + (message ? `<p>${escapeHtml(message)}</p>` : "");
}

function renderMultiEquipmentStrengthChart(host, records, profiles) {
    const width = Math.max(320, Math.round(host.clientWidth || 700));
    const height = width <= 520 ? 280 : 310;
    const padding = { top: 38, right: 18, bottom: 42, left: 56 };
    const values = records.map(record => displayMass(rawMetricValue(record), 1, UNIT_KINDS.LIFTING_WEIGHT));
    const axisLabel = `Estimated 1RM (${massUnit(UNIT_KINDS.LIFTING_WEIGHT)})`;
    if (!values.length) {
        host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="No exercise progress data"><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="var(--muted)" font-size="12">No completed weighted sets to plot</text></svg>`;
        return;
    }
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = Math.max(5, maxValue - minValue);
    const step = 5;
    const axisMin = Math.max(0, Math.floor((minValue - spread * .12) / step) * step);
    const axisMax = Math.max(axisMin + 10, Math.ceil((maxValue + spread * .12) / step) * step);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const orderedKeys = [...new Set(records.map(record => `${record.date}|${record.completedAt}`))].sort();
    const getX = record => orderedKeys.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + orderedKeys.indexOf(`${record.date}|${record.completedAt}`) / (orderedKeys.length - 1) * chartWidth;
    const getY = value => padding.top + (axisMax - value) / (axisMax - axisMin) * chartHeight;
    const ticks = Array.from({ length: 3 }, (_, index) => axisMin + (axisMax - axisMin) * index / 2);
    const seriesMarkup = profiles.map((profile, profileIndex) => {
        const points = records.filter(record => record.profileId === profile.id).map(record => ({
            ...record,
            value: displayMass(rawMetricValue(record), 1, UNIT_KINDS.LIFTING_WEIGHT)
        }));
        const color = equipmentColor(profileIndex);
        const coordinates = points.map(point => `${getX(point)},${getY(point.value)}`).join(" ");
        return `${points.length > 1 ? `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ""}${points.map(point => `<circle cx="${getX(point)}" cy="${getY(point.value)}" r="4" fill="${color}" stroke="var(--card)" stroke-width="2"><title>${escapeHtml(profile.name)} · ${formatDate(point.date)}: ${(selectedMetric === "weight" ? formatSet(point.weightSet) : formatMass(point.estimatedOneRepMax, 1))}</title></circle>`).join("")}`;
    }).join("");
    host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="${axisLabel} by equipment">
        <text x="${padding.left}" y="20" fill="var(--accent-text)" font-size="10" font-weight="800" letter-spacing="1.2">${axisLabel.toUpperCase()}</text>
        ${ticks.map(tick => { const y = getY(tick); return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--line)"/><text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--muted)" font-size="10">${formatAxis(tick)}</text>`; }).join("")}
        ${seriesMarkup}
        ${orderedKeys.map((key, index) => { const record = records.find(item => `${item.date}|${item.completedAt}` === key); const show = orderedKeys.length <= 6 || index === 0 || index === orderedKeys.length - 1 || index % Math.ceil(orderedKeys.length / 5) === 0; const x = orderedKeys.length === 1 ? padding.left + chartWidth / 2 : padding.left + index / (orderedKeys.length - 1) * chartWidth; return show ? `<text x="${x}" y="${height - 16}" text-anchor="middle" fill="var(--muted)" font-size="10">${formatShortDate(record?.date)}</text>` : ""; }).join("")}
    </svg>`;
}

function metricValue(record) {
    return selectedMetric === "volume"
        ? displayVolume(record.sessionVolume)
        : displayMass(rawMetricValue(record), 1, UNIT_KINDS.LIFTING_WEIGHT);
}

function renderNormalizedMachineChart(host, records, profiles) {
    const width = Math.max(320, Math.round(host.clientWidth || 700));
    const height = width <= 520 ? 280 : 310;
    const padding = { top: 38, right: 18, bottom: 42, left: 56 };
    const orderedKeys = [...new Set(records.map(record => `${record.date}|${record.completedAt}`))].sort();
    const series = profiles.map(profile => {
        const profileRecords = records.filter(record => record.profileId === profile.id);
        const baseline = metricValue(profileRecords[0]);
        return {
            profile,
            points: profileRecords.map(record => ({
                ...record,
                value: baseline > 0 ? (metricValue(record) - baseline) / baseline * 100 : 0
            }))
        };
    }).filter(item => item.points.length);
    const values = series.flatMap(item => item.points.map(point => point.value));
    if (!values.length) {
        host.innerHTML = '<p class="empty-state">Log a workout on a saved machine to establish its baseline.</p>';
        return;
    }
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(0, ...values);
    const spread = Math.max(10, maxValue - minValue);
    const axisMin = Math.floor((minValue - spread * .15) / 5) * 5;
    const axisMax = Math.max(axisMin + 10, Math.ceil((maxValue + spread * .15) / 5) * 5);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const getX = record => orderedKeys.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + orderedKeys.indexOf(`${record.date}|${record.completedAt}`) / (orderedKeys.length - 1) * chartWidth;
    const getY = value => padding.top + (axisMax - value) / (axisMax - axisMin) * chartHeight;
    const ticks = Array.from({ length: 3 }, (_, index) => axisMin + (axisMax - axisMin) * index / 2);
    host.setAttribute("aria-label", "Percentage improvement by machine");
    host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Percentage improvement from each machine baseline">
        <text x="${padding.left}" y="20" fill="var(--accent-text)" font-size="10" font-weight="800" letter-spacing="1.2">PROGRESS FROM BASELINE (%)</text>
        ${ticks.map(tick => { const y = getY(tick); return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--line)"/><text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--muted)" font-size="10">${tick > 0 ? "+" : ""}${Math.round(tick)}%</text>`; }).join("")}
        ${series.map((item, index) => {
            const color = equipmentColor(index);
            const coordinates = item.points.map(point => `${getX(point)},${getY(point.value)}`).join(" ");
            return `${item.points.length > 1 ? `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ""}${item.points.map(point => `<circle cx="${getX(point)}" cy="${getY(point.value)}" r="4" fill="${color}" stroke="var(--card)" stroke-width="2"><title>${escapeHtml(item.profile.name)} · ${formatDate(point.date)}: ${signedPercent(point.value)}</title></circle>`).join("")}`;
        }).join("")}
        ${orderedKeys.map((key, index) => { const record = records.find(item => `${item.date}|${item.completedAt}` === key); const show = orderedKeys.length <= 6 || index === 0 || index === orderedKeys.length - 1 || index % Math.ceil(orderedKeys.length / 5) === 0; const x = orderedKeys.length === 1 ? padding.left + chartWidth / 2 : padding.left + index / (orderedKeys.length - 1) * chartWidth; return show ? `<text x="${x}" y="${height - 16}" text-anchor="middle" fill="var(--muted)" font-size="10">${formatShortDate(record?.date)}</text>` : ""; }).join("")}
    </svg>`;
}

function renderSeparateMachineCharts(host, records, profiles) {
    host.setAttribute("aria-label", "Raw progress separated by machine");
    host.innerHTML = `<div class="machine-small-multiples">${profiles.map((profile, profileIndex) => {
        const points = records.filter(record => record.profileId === profile.id);
        if (!points.length) return "";
        const values = points.map(metricValue);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const spread = Math.max(selectedMetric === "volume" ? 100 : 5, maxValue - minValue);
        const axisMin = Math.max(0, minValue - spread * .18);
        const axisMax = Math.max(axisMin + 1, maxValue + spread * .18);
        const width = 320;
        const height = 150;
        const padding = { top: 18, right: 14, bottom: 27, left: 14 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const coords = points.map((point, index) => ({
            ...point,
            value: values[index],
            x: points.length === 1 ? width / 2 : padding.left + index / (points.length - 1) * chartWidth,
            y: padding.top + (axisMax - values[index]) / (axisMax - axisMin) * chartHeight
        }));
        const color = equipmentColor(profileIndex);
        const coordinates = coords.map(point => `${point.x},${point.y}`).join(" ");
        const latest = points.at(-1);
        const latestLabel = selectedMetric === "volume" ? formatVolume(latest.sessionVolume) : (selectedMetric === "weight" ? formatSet(latest.weightSet) : formatMass(latest.estimatedOneRepMax, 1));
        return `<article class="machine-progress-card">
            <header><div><strong>${escapeHtml(profile.name)}</strong><small>${points.length === 1 ? "Baseline set" : `${points.length} workouts`}</small></div><b>${latestLabel}</b></header>
            <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeHtml(profile.name)} raw progress">
                <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="var(--line)"/>
                ${coords.length > 1 ? `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
                ${coords.map(point => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${color}" stroke="var(--card)" stroke-width="2"><title>${formatDate(point.date)}: ${selectedMetric === "volume" ? formatVolume(point.sessionVolume) : (selectedMetric === "weight" ? formatSet(point.weightSet) : formatMass(point.estimatedOneRepMax, 1))}</title></circle>`).join("")}
                <text x="${padding.left}" y="${height - 8}" fill="var(--muted)" font-size="10">${formatShortDate(points[0].date)}</text>
                ${points.length > 1 ? `<text x="${width - padding.right}" y="${height - 8}" text-anchor="end" fill="var(--muted)" font-size="10">${formatShortDate(points.at(-1).date)}</text>` : ""}
            </svg>
            ${points.length === 1 ? "<p>More workouts will form a line.</p>" : ""}
        </article>`;
    }).join("")}</div>`;
}

function renderSvgChart(host, records) {
    const isVolume = selectedMetric === "volume";
    const valueFor = record => isVolume ? displayVolume(record.sessionVolume) : displayMass(rawMetricValue(record), 1, UNIT_KINDS.LIFTING_WEIGHT);
    const values = records.map(valueFor).filter(Number.isFinite);
    const width = Math.max(320, Math.round(host.clientWidth || 700));
    const height = width <= 520 ? 280 : 310;
    const padding = { top: 38, right: 18, bottom: 42, left: 56 };
    const axisLabel = `${isVolume ? "Session Volume" : selectedMetric === "weight" ? "Working weight" : "Estimated 1RM"} (${massUnit(UNIT_KINDS.LIFTING_WEIGHT)})`;
    host.setAttribute("aria-label", `${axisLabel} across logged sessions`);
    if (!values.length) {
        host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="No exercise progress data"><text x="${padding.left}" y="20" fill="var(--accent-text)" font-size="10" font-weight="800" letter-spacing="1.2">${axisLabel.toUpperCase()}</text><line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="var(--line)"/><line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="var(--line)"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="var(--muted)" font-size="12">No completed weighted sets to plot</text></svg>`;
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
    const ticks = Array.from({ length: 3 }, (_, index) => axisMin + (axisMax - axisMin) * index / 2);
    const linePoints = coords.map(point => `${point.x},${point.y}`).join(" ");
    const areaPoints = `${coords[0].x},${height - padding.bottom} ${linePoints} ${coords.at(-1).x},${height - padding.bottom}`;
    host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="${axisLabel} progress">
        <defs>
            <linearGradient id="exercise-progress-accent-fill" x1="0" y1="${padding.top}" x2="0" y2="${height - padding.bottom}" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity=".28"/>
                <stop offset="56%" stop-color="var(--accent-dark)" stop-opacity=".13"/>
                <stop offset="100%" stop-color="var(--accent-dark)" stop-opacity="0"/>
            </linearGradient>
            <filter id="exercise-progress-accent-glow" x="-20%" y="-35%" width="140%" height="170%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="var(--accent)" flood-opacity=".3"/>
            </filter>
        </defs>
        <text x="${padding.left}" y="20" fill="var(--accent-text)" font-size="10" font-weight="800" letter-spacing="1.2">${axisLabel.toUpperCase()}</text>
        ${ticks.map(tick => { const y = padding.top + (axisMax - tick) / (axisMax - axisMin) * chartHeight; return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--line)"/><text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--muted)" font-size="10">${formatAxis(tick)}</text>`; }).join("")}
        ${coords.length > 1 ? `<polygon points="${areaPoints}" fill="url(#exercise-progress-accent-fill)"/>` : ""}
        <polyline points="${linePoints}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" filter="url(#exercise-progress-accent-glow)"/>
        ${coords.map((point, index) => { const show = coords.length <= 8 || index === 0 || index === coords.length - 1 || index % Math.ceil(coords.length / 6) === 0; const latest = index === coords.length - 1; return `${latest ? `<circle cx="${point.x}" cy="${point.y}" r="8" fill="var(--accent)" fill-opacity=".18"/>` : ""}<circle cx="${point.x}" cy="${point.y}" r="${latest ? 4 : 3}" fill="${latest ? "var(--accent)" : "var(--accent-dark)"}" stroke="var(--card)" stroke-width="2"><title>${formatDate(point.date)}: ${isVolume ? formatVolume(point.sessionVolume) : (selectedMetric === "weight" ? formatSet(point.weightSet) : formatMass(point.estimatedOneRepMax, 1))}</title></circle>${show ? `<text x="${point.x}" y="${height - 16}" text-anchor="middle" fill="var(--muted)" font-size="10">${formatShortDate(point.date)}</text>` : ""}`; }).join("")}</svg>`;
}

function displayVolume(value) { return displayMass(value, 0, UNIT_KINDS.LIFTING_WEIGHT); }
function formatVolume(value) { return `${Number(displayVolume(value)).toLocaleString()} ${massUnit(UNIT_KINDS.LIFTING_WEIGHT)}`; }
function formatMass(value, digits = 0) { const shown = displayMass(value, digits, UNIT_KINDS.LIFTING_WEIGHT); return `${Number(shown).toLocaleString(undefined, { maximumFractionDigits: digits })} ${massUnit(UNIT_KINDS.LIFTING_WEIGHT)}`; }
function signedVolume(value) { return `${value > 0 ? "+" : ""}${Number(displayVolume(value)).toLocaleString()} ${massUnit(UNIT_KINDS.LIFTING_WEIGHT)}`; }
function signedMass(value, digits = 0) { return `${value > 0 ? "+" : ""}${formatMass(value, digits)}`; }
function signedNumber(value) { return `${value > 0 ? "+" : ""}${value}`; }
function signedPercent(value) { return Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : "—"; }
function changeToneClass(value) { return value > 0 ? "is-positive" : value < 0 ? "is-negative" : ""; }
function formatSet(set) { if (!set) return "—"; return `${formatMass(Number(set.weight), 1)} × ${Number(set.reps)}`; }
function formatAxis(value) { return Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : Math.round(value); }
function niceStep(value) { const power = 10 ** Math.floor(Math.log10(Math.max(1, value))); const normalized = value / power; return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power; }
function parseDate(value) { if (!value) return null; const date = new Date(`${String(value).slice(0, 10)}T12:00:00`); return Number.isFinite(date.getTime()) ? date : null; }
function formatDate(value) { const date = parseDate(value); return date ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date) : "Unknown"; }
function formatShortDate(value) { const date = parseDate(value); return date ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date) : ""; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

let selectedHoldLoad = 0;
function renderHoldProgress(host, history, id) {
    if (selectedExerciseId !== id) selectedHoldLoad = 0;
    selectedExerciseId = id;
    selectedMetric = 'strength';
    document.querySelectorAll('[data-exercise-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.exerciseMetric === 'strength')));
    document.getElementById('exercise-equipment-filter')?.closest('label')?.setAttribute('hidden','');
    const machineControls = document.getElementById('exercise-machine-view-controls'); if (machineControls) machineControls.hidden = true;
    const legend = document.getElementById('exercise-equipment-legend'); if (legend) legend.innerHTML = '';
    const sessions = getSessions();
    const loggedSets = sessions.filter(session => !['in_progress','draft'].includes(session.status))
        .flatMap(session => (session.exercises || []).filter(exercise => exercise.exerciseId === id))
        .flatMap(exercise => exercise.sets || [])
        .filter(set => !set.isWarmup && !set.warmup && Number(set.durationSeconds) > 0);
    const loads = [...new Set([0,...loggedSets.map(set => Number(set.weight || 0))])].sort((a,b)=>a-b);
    if (!loads.includes(selectedHoldLoad)) selectedHoldLoad = 0;
    let filter = document.getElementById('hold-progress-filter');
    if (!filter) { filter = document.createElement('label'); filter.id = 'hold-progress-filter'; host.before(filter); }
    filter.innerHTML = `Load<select aria-label="Hold load">${loads.map(load => `<option value="${load}" ${load === selectedHoldLoad ? 'selected' : ''}>${load ? formatMass(load,1) + ' added' : 'Bodyweight'}</option>`).join('')}</select>`;
    filter.querySelector('select').onchange = event => {
        selectedHoldLoad = Number(event.target.value) || 0;
        renderExerciseProgressV2();
    };
    const records = filterRange(holdProgressRecords(sessions,id,{load:selectedHoldLoad,metric:'strength'}));
    const value = record => record.bestSeconds;
    const label = 'Best hold (sec)';
    const note = document.getElementById('exercise-progress-note');
    if (note) note.textContent = 'Longest hold per workout at the selected load.';
    const comparison = document.getElementById('exercise-volume-comparison');
    renderHoldComparison(comparison, records);
    const header = history.previousElementSibling;
    if (header?.classList.contains('exercise-history-header')) {
        header.classList.add('hold-best-history');
        header.innerHTML = '<span>Date</span><span>Best hold</span><span>Sets</span>';
    }
    history.innerHTML = records.map(record => `<div class="exercise-history-row hold-best-history"><span>${formatDate(record.date)}</span><span>${record.bestSeconds} sec</span><span>${record.sets}</span></div>`).reverse().join('');
    if (!records.length) { host.innerHTML = '<p class="empty-state">No completed timed holds in this range.</p>'; return; }
    const max = Math.max(1,...records.map(value));
    const points = records.map((record,index) => ({...record,x:records.length === 1 ? 210 : 45+index/(records.length-1)*330,y:220-value(record)/max*165}));
    host.innerHTML = `<svg viewBox="0 0 400 265" role="img" aria-label="${label}"><text x="45" y="22" fill="var(--muted)" font-size="11">${label}</text>${[0,.5,1].map(f=>`<line x1="45" x2="375" y1="${220-f*165}" y2="${220-f*165}" stroke="var(--line)"/><text x="38" y="${224-f*165}" text-anchor="end" fill="var(--muted)" font-size="10">${Math.round(max*f*10)/10}</text>`).join('')}<polyline points="${points.map(point=>`${point.x},${point.y}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3"/>${points.map((point,index)=>`<circle cx="${point.x}" cy="${point.y}" r="5" fill="var(--accent)"><title>${formatDate(point.date)}: ${value(point)}</title></circle>${index === 0 || index === points.length-1 ? `<text x="${point.x}" y="245" text-anchor="middle" fill="var(--muted)" font-size="10">${formatShortDate(point.date)}</text>` : ''}`).join('')}</svg>`;
}

function renderHoldComparison(container, records) {
    if (!container) return;
    container.hidden = false;
    container.classList.add('hold-progress-summary');
    const summary = holdComparison(records, selectedMetric);
    if (!summary) {
        container.innerHTML = '<p class="empty-state">Log a timed hold to establish your baseline.</p>';
        return;
    }
    const formatValue = value => selectedMetric === 'weight' ? formatMass(value,1) : `${Number(value).toLocaleString()} sec`;
    const signedValue = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatValue(Math.abs(value))}`;
    const percent = value => value === null ? '' : `<small class="${changeToneClass(value)}">${signedPercent(value)}</small>`;
    const {latest, previous, first, latestValue, previousValue, baselineValue, change, baselineChange} = summary;
    const sets = count => `${count} ${count === 1 ? 'set' : 'sets'}`;
    container.innerHTML = `
        <div class="exercise-volume-stat is-summary"><span>Latest</span><strong>${formatValue(latestValue)}</strong><small>${sets(latest.sets)}</small></div>
        <div class="exercise-volume-stat is-summary"><span>Previous</span><strong>${previous ? formatValue(previousValue) : '—'}</strong><small>${previous ? sets(previous.sets) : 'First workout'}</small></div>
        <div class="exercise-volume-stat is-summary"><span>Change</span><strong class="${changeToneClass(change)}">${change === null ? '—' : signedValue(change)}</strong>${percent(summary.percent)}</div>
        <p class="exercise-progress-baseline"><span>Since baseline</span><strong class="${changeToneClass(baselineChange)}">${baselineChange === null ? 'Baseline set' : `${signedValue(baselineChange)}${summary.baselinePercent === null ? '' : ` · ${signedPercent(summary.baselinePercent)}`}`}</strong><small>${formatValue(baselineValue)} · ${formatDate(first.date)}</small></p>`;
}

const PICKER_RECENT_KEY = "level_up_progress_exercise_recent_v1";
const pickerBindings = new WeakMap();
const pickerSearchIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>';
const pickerChevron = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

export function filterProgressExerciseOptions(items, query = "", muscle = "") {
    const normalize = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const terms = normalize(query).split(/[^a-z0-9]+/).filter(Boolean);
    return items.filter(item => (!muscle || item.muscle === muscle) &&
        terms.every(term => normalize([item.name, item.muscle, item.equipment, item.id].join(" ")).includes(term)));
}

function pickerRecent() {
    try { const value = JSON.parse(localStorage.getItem(PICKER_RECENT_KEY) || "[]"); return Array.isArray(value) ? value.filter(id => typeof id === "string") : []; }
    catch { return []; }
}

function pickerItems(select) {
    return [...select.options].filter(option => option.value && !option.disabled).map(option => {
        const exercise = getExerciseById(option.value);
        return { id: option.value, name: exercise?.name || option.textContent.trim(), muscle: exercise?.muscleGroup || "Other", equipment: exercise?.equipment || "", exercise };
    }).sort((a,b) => a.name.localeCompare(b.name));
}

function ensureProgressPickerStyles() {
    if (document.getElementById("progress-exercise-picker-style")) return;
    const style = document.createElement("style");
    style.id = "progress-exercise-picker-style";
    style.textContent = `
      #exercise-progress-select[data-picker-enhanced]{display:none!important}
      .progress-exercise-trigger{width:100%;min-height:54px;display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border,rgba(128,128,128,.25));border-radius:12px;background:var(--card);color:var(--text);text-align:left;font:inherit;box-sizing:border-box}
      .progress-exercise-trigger .pep-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
      .progress-exercise-trigger:disabled{opacity:.55}
      .pep-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.48);display:flex;align-items:flex-end;justify-content:center;overscroll-behavior:contain}
      .pep-overlay[hidden]{display:none!important}
      .pep-sheet{width:100%;max-width:680px;height:min(76dvh,660px);max-height:100%;display:flex;flex-direction:column;background:var(--card,var(--bg));color:var(--text);border-radius:24px 24px 0 0;padding:8px 16px max(12px,env(safe-area-inset-bottom));box-sizing:border-box;overflow:hidden}
      .pep-handle{width:36px;height:4px;border-radius:4px;background:var(--muted);opacity:.6;margin:0 auto 12px;flex:none}
      .pep-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex:none}
      .pep-header h2{font-size:20px;margin:0;color:inherit}
      .pep-icon{background:transparent!important;color:inherit!important;border:0!important;padding:8px!important;min-width:40px;min-height:40px;display:grid;place-items:center}
      .pep-search{display:flex;align-items:center;gap:8px;border:1px solid var(--border,rgba(128,128,128,.25));background:var(--bg,var(--card));border-radius:12px;padding:0 10px;flex:none;color:var(--muted)}
      .pep-search:focus-within{border-color:var(--accent)}
      .pep-search input{background:transparent!important;color:var(--text)!important;border:0!important;outline:none!important;box-shadow:none!important;font-size:16px!important;flex:1;min-width:0;width:100%;padding:12px 0!important;margin:0!important}
      .pep-search input::-webkit-search-cancel-button{display:none}
      .pep-filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;flex:none;padding:12px 0 8px}
      .pep-filters button{white-space:nowrap;border:1px solid var(--border,rgba(128,128,128,.25));background:var(--bg,var(--card));color:var(--text);border-radius:20px;padding:8px 13px;font:inherit;font-size:13px;min-height:36px}
      .pep-filters button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-contrast,#fff)}
      .pep-results{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
      .pep-section{font-size:13px;font-weight:700;color:var(--muted);margin:14px 0 6px}
      .pep-row{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:10px 0;border:0;border-bottom:1px solid var(--border,rgba(128,128,128,.18));border-radius:0;background:transparent;color:var(--text);font:inherit;min-height:66px}
      .pep-row .routine-thumbnail,.progress-exercise-trigger .routine-thumbnail{flex:none;border-radius:9px;background:var(--bg,var(--card))}
      .pep-row .pep-copy{flex:1;min-width:0;display:grid;gap:4px}
      .pep-row strong{font-size:15px;line-height:1.3;overflow-wrap:anywhere;color:inherit}
      .pep-row small{font-size:12px;color:var(--muted)}
      .pep-row[aria-current="true"] .pep-check{color:var(--accent);font-weight:700}
      .pep-empty{padding:28px 8px;text-align:center;color:var(--muted)}
      .pep-status{font-size:12px;color:var(--muted);padding:4px 0;flex:none}
      @media(prefers-reduced-motion:no-preference){.pep-sheet{animation:pep-enter .18s ease-out}@keyframes pep-enter{from{transform:translateY(24px);opacity:.6}to{transform:translateY(0);opacity:1}}}
    `;
    document.head.append(style);
}

function installProgressExercisePicker(select) {
    if (!select) return;
    if (pickerBindings.has(select)) { pickerBindings.get(select)(); return; }
    ensureProgressPickerStyles();
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "progress-exercise-trigger";
    trigger.setAttribute("aria-haspopup","dialog");
    trigger.setAttribute("aria-expanded","false");
    select.before(trigger);
    select.dataset.pickerEnhanced = "true";
    select.setAttribute("aria-hidden","true");
    select.tabIndex = -1;
    const sync = () => {
        const item = pickerItems(select).find(item => item.id === select.value);
        const label = item?.name || "No exercise data yet";
        if (trigger.dataset.label !== label || trigger.dataset.id !== select.value) {
            trigger.innerHTML = pickerSearchIcon + '<span class="pep-label">' + escapeHtml(label) + '</span>' + pickerChevron;
            trigger.dataset.label = label;
            trigger.dataset.id = select.value;
        }
        trigger.disabled = !pickerItems(select).length;
        trigger.setAttribute("aria-label", "Select exercise: " + label);
    };
    pickerBindings.set(select, sync);
    select.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(select, {childList:true,subtree:true,attributes:true,attributeFilter:["selected","disabled"]});
    trigger.addEventListener("click", () => {
        document.querySelector(".pep-overlay")?.remove();
        const items = pickerItems(select);
        if (!items.length) return;
        let muscle = "";
        let matches = [];
        const overlay = document.createElement("div");
        overlay.className = "pep-overlay";
        overlay.innerHTML = '<section class="pep-sheet" role="dialog" aria-modal="true" aria-labelledby="pep-title"><div class="pep-handle"></div><header class="pep-header"><h2 id="pep-title">Select exercise</h2><button type="button" class="pep-icon" data-pep-close aria-label="Close exercise selector">✕</button></header><div class="pep-search">' + pickerSearchIcon + '<input type="search" placeholder="Search exercises…" autocomplete="off" spellcheck="false" aria-label="Search logged exercises"><button type="button" class="pep-icon" data-pep-clear aria-label="Clear search" hidden>✕</button></div><div class="pep-filters" role="group" aria-label="Muscle group"></div><div class="pep-status" role="status" aria-live="polite"></div><div class="pep-results"></div></section>';
        document.body.append(overlay);
        const sheet = overlay.querySelector(".pep-sheet");
        const input = overlay.querySelector("input");
        const results = overlay.querySelector(".pep-results");
        const filters = overlay.querySelector(".pep-filters");
        const clear = overlay.querySelector("[data-pep-clear]");
        const status = overlay.querySelector(".pep-status");
        const groups = ["", ...new Set(items.map(item=>item.muscle))];
        filters.innerHTML = groups.map(group=>'<button type="button" data-pep-muscle="'+escapeHtml(group)+'" aria-pressed="'+String(!group)+'">'+escapeHtml(group || "All")+'</button>').join("");
        const row = item => '<button type="button" class="pep-row" data-pep-id="'+escapeHtml(item.id)+'" aria-current="'+String(item.id===select.value)+'">'+exerciseThumbnail(item.exercise || {id:item.id,name:item.name,muscleGroup:item.muscle})+'<span class="pep-copy"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml([item.muscle,item.equipment].filter(Boolean).join(" · "))+'</small></span>'+(item.id===select.value?'<span class="pep-check" aria-hidden="true">✓</span>':pickerChevron)+'</button>';
        const render = () => {
            matches = filterProgressExerciseOptions(items,input.value,muscle);
            clear.hidden = !input.value;
            status.textContent = matches.length + (matches.length === 1 ? " exercise" : " exercises") + " with workout history";
            const recentIds = !input.value.trim() && !muscle ? pickerRecent().slice(0,5) : [];
            const recent = recentIds.map(id=>matches.find(item=>item.id===id)).filter(Boolean);
            const rest = matches.filter(item=>!recent.some(recentItem=>recentItem.id===item.id));
            results.innerHTML = matches.length ? (recent.length ? '<div class="pep-section">Recently viewed</div>'+recent.map(row).join("") : "")+(rest.length?'<div class="pep-section">'+(input.value.trim()?"Results":"Logged exercises")+'</div>'+rest.map(row).join(""):"") : '<p class="pep-empty">No matching logged exercises. Try another search or muscle group.</p>';
            results.scrollTop = 0;
        };
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        trigger.setAttribute("aria-expanded","true");
        const viewport = window.visualViewport;
        const resize = () => { if(viewport){overlay.style.height=viewport.height+"px";overlay.style.top=viewport.offsetTop+"px";sheet.style.height=Math.min(viewport.height,Math.max(300,viewport.height*.90))+"px";} };
        const close = () => { viewport?.removeEventListener("resize",resize);viewport?.removeEventListener("scroll",resize); document.removeEventListener("keydown", keydown); input.blur();overlay.remove();document.body.style.overflow=oldOverflow;trigger.setAttribute("aria-expanded","false");if(trigger.isConnected)trigger.focus({preventScroll:true}); };
        const choose = id => {
            if (![...select.options].some(option=>option.value===id)) return;
            try {localStorage.setItem(PICKER_RECENT_KEY,JSON.stringify([id,...pickerRecent().filter(value=>value!==id)].slice(0,12)));} catch {}
            select.value=id;
            close();
            select.dispatchEvent(new Event("change",{bubbles:true}));
            sync();
        };
        const keydown = event => {
            if(event.key==="Escape"){event.preventDefault();close();}
            else if(event.key==="Enter" && event.target===input && matches.length===1){event.preventDefault();choose(matches[0].id);}
            else if(event.key==="Tab"){const nodes=[...sheet.querySelectorAll("button:not([hidden]),input")].filter(node=>!node.disabled);const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
        };
        document.addEventListener("keydown",keydown);
        viewport?.addEventListener("resize",resize);
        viewport?.addEventListener("scroll",resize);
        overlay.addEventListener("click",event=>{
            if(event.target===overlay||event.target.closest("[data-pep-close]")){close();return;}
            if(event.target.closest("[data-pep-clear]")){input.value="";render();input.focus();return;}
            const chip=event.target.closest("[data-pep-muscle]");
            if(chip){muscle=chip.dataset.pepMuscle;filters.querySelectorAll("button").forEach(button=>button.setAttribute("aria-pressed",String(button===chip)));render();return;}
            const result=event.target.closest("[data-pep-id]");
            if(result)choose(result.dataset.pepId);
        });
        input.addEventListener("input",render);
        render();
        // Do not summon the keyboard until the user taps search, so recent items remain visible.
        overlay.querySelector("[data-pep-close]").focus({preventScroll:true});
    });
    sync();
}
