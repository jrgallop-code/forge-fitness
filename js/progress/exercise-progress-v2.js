import { UNIT_KINDS, displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";
import { getExerciseById } from "../workouts/exercise-library.js";
import { calculateSetVolume } from "../workouts/volume-calculator.js?v=two-dumbbells-1";

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
    const host = document.getElementById("exercise-strength-chart-v2");
    const select = document.getElementById("exercise-progress-select");
    const history = document.getElementById("exercise-history-body");
    if (!host || !select || !history) return;
    const allRecords = getExerciseRecords(select.value);
    const profiles = getProfiles(allRecords);
    if (selectedExerciseId !== select.value) {
        selectedExerciseId = select.value;
        selectedEquipment = "all";
        selectedMachineView = "combined";
    }
    updateEquipmentFilter(profiles);
    const hasMachineBreakdown = selectedEquipment === "all" && profiles.length > 1;
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
            .filter(exercise => exercise?.exerciseId === exerciseId && exercise?.trackingType !== "notes")
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
    if (profiles.length < 2) {
        selectedEquipment = "all";
        select.innerHTML = `<option value="all">${escapeHtml(profiles[0]?.name || "Equipment")}</option>`;
        select.value = "all";
        select.disabled = true;
        return;
    }
    select.innerHTML = `<option value="all">All equipment</option>${profiles.map(profile =>
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
        if (record.estimatedOneRepMax > current.estimatedOneRepMax) {
            current.estimatedOneRepMax = record.estimatedOneRepMax;
            current.bestSet = record.bestSet;
        }
        grouped.set(key, current);
    });
    return [...grouped.values()].sort(compareRecords);
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
            : "Best-set Epley estimate—not a tested maximum.";
    }
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
    const first = records[0];
    const isVolume = selectedMetric === "volume";
    const latestValue = isVolume ? latest.sessionVolume : latest.estimatedOneRepMax;
    const previousValue = previous ? (isVolume ? previous.sessionVolume : previous.estimatedOneRepMax) : null;
    const baselineValue = isVolume ? first.sessionVolume : first.estimatedOneRepMax;
    const change = previous ? latestValue - previousValue : null;
    const percent = previousValue > 0 ? change / previousValue * 100 : null;
    const baselineChange = records.length > 1 ? latestValue - baselineValue : null;
    const baselinePercent = baselineValue > 0 && baselineChange !== null ? baselineChange / baselineValue * 100 : null;
    const valueLabel = value => isVolume ? formatVolume(value) : formatMass(value, 1);
    const changeLabel = value => isVolume ? signedVolume(value) : signedMass(value, 1);
    const baselineSummary = !isVolume
        ? `<p class="exercise-strength-baseline">
            <span>Since first logged</span>
            <strong class="${baselineChange > 0 ? "is-positive" : baselineChange < 0 ? "is-negative" : ""}">${baselineChange === null ? "Baseline established" : `${changeLabel(baselineChange)} · ${signedPercent(baselinePercent)}`}</strong>
            <small>Baseline ${valueLabel(baselineValue)} · ${formatDate(first.date)}</small>
        </p>`
        : "";
    container.innerHTML = `
        <div class="exercise-volume-stat is-summary"><span>Latest</span><strong>${valueLabel(latestValue)}</strong></div>
        <div class="exercise-volume-stat is-summary"><span>Previous</span><strong>${previous ? valueLabel(previousValue) : "—"}</strong></div>
        <div class="exercise-volume-stat is-summary"><span>${isVolume ? "Change" : "Since Previous"}</span><strong class="${change > 0 ? "is-positive" : change < 0 ? "is-negative" : ""}">${change === null ? "First session" : `${changeLabel(change)} · ${signedPercent(percent)}`}</strong></div>
        ${baselineSummary}
        <p class="exercise-volume-detail">${isVolume ? buildChangeDetail(latest, previous) : buildStrengthDetail(latest, previous)}</p>`;
}

function renderEquipmentSummary(records, profiles) {
    const container = document.getElementById("exercise-volume-comparison");
    if (!container) return;
    container.hidden = false;
    container.innerHTML = profiles.map(profile => {
        const profileRecords = records.filter(record => record.profileId === profile.id);
        const latest = profileRecords.at(-1);
        const first = profileRecords[0];
        const value = record => selectedMetric === "volume" ? record.sessionVolume : record.estimatedOneRepMax;
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
        const value = record => selectedMetric === "volume" ? record.sessionVolume : record.estimatedOneRepMax;
        const change = first && latest && profileRecords.length > 1 && value(first) > 0
            ? (value(latest) - value(first)) / value(first) * 100
            : null;
        return `<div class="exercise-volume-stat"><span>${escapeHtml(profile.name)}</span><strong class="${change > 0 ? "is-positive" : change < 0 ? "is-negative" : ""}">${change === null ? "Baseline" : signedPercent(change)}</strong><small>${profileRecords.length} workout${profileRecords.length === 1 ? "" : "s"}</small></div>`;
    }).join("") + `<p class="exercise-volume-detail">Each machine begins at 0%, so different resistance systems can be compared fairly.</p>`;
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
        : "<span>Date</span><span>Best Set</span><span>Est. 1RM</span><span>Equipment</span><span>Sets</span>";
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
            <div class="exercise-history-row"><span>${formatDate(record.date)}</span><strong>${formatSet(record.bestSet)}</strong>
            <span>${formatMass(record.estimatedOneRepMax, 1)}</span><span>${escapeHtml(record.profileName)}</span><span>${record.completedSets}</span></div>`;
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
    const values = records.map(record => displayMass(record.estimatedOneRepMax, 1, UNIT_KINDS.LIFTING_WEIGHT));
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
            value: displayMass(record.estimatedOneRepMax, 1, UNIT_KINDS.LIFTING_WEIGHT)
        }));
        const color = equipmentColor(profileIndex);
        const coordinates = points.map(point => `${getX(point)},${getY(point.value)}`).join(" ");
        return `${points.length > 1 ? `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ""}${points.map(point => `<circle cx="${getX(point)}" cy="${getY(point.value)}" r="4" fill="${color}" stroke="var(--card)" stroke-width="2"><title>${escapeHtml(profile.name)} · ${formatDate(point.date)}: ${formatMass(point.estimatedOneRepMax, 1)}</title></circle>`).join("")}`;
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
        : displayMass(record.estimatedOneRepMax, 1, UNIT_KINDS.LIFTING_WEIGHT);
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
        const latestLabel = selectedMetric === "volume" ? formatVolume(latest.sessionVolume) : formatMass(latest.estimatedOneRepMax, 1);
        return `<article class="machine-progress-card">
            <header><div><strong>${escapeHtml(profile.name)}</strong><small>${points.length === 1 ? "Baseline set" : `${points.length} workouts`}</small></div><b>${latestLabel}</b></header>
            <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeHtml(profile.name)} raw progress">
                <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="var(--line)"/>
                ${coords.length > 1 ? `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
                ${coords.map(point => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${color}" stroke="var(--card)" stroke-width="2"><title>${formatDate(point.date)}: ${selectedMetric === "volume" ? formatVolume(point.sessionVolume) : formatMass(point.estimatedOneRepMax, 1)}</title></circle>`).join("")}
                <text x="${padding.left}" y="${height - 8}" fill="var(--muted)" font-size="10">${formatShortDate(points[0].date)}</text>
                ${points.length > 1 ? `<text x="${width - padding.right}" y="${height - 8}" text-anchor="end" fill="var(--muted)" font-size="10">${formatShortDate(points.at(-1).date)}</text>` : ""}
            </svg>
            ${points.length === 1 ? "<p>More workouts will form a line.</p>" : ""}
        </article>`;
    }).join("")}</div>`;
}

function renderSvgChart(host, records) {
    const isVolume = selectedMetric === "volume";
    const valueFor = record => isVolume ? displayVolume(record.sessionVolume) : displayMass(record.estimatedOneRepMax, 1, UNIT_KINDS.LIFTING_WEIGHT);
    const values = records.map(valueFor).filter(Number.isFinite);
    const width = Math.max(320, Math.round(host.clientWidth || 700));
    const height = width <= 520 ? 280 : 310;
    const padding = { top: 38, right: 18, bottom: 42, left: 56 };
    const axisLabel = isVolume ? `Session Volume (${massUnit(UNIT_KINDS.LIFTING_WEIGHT)})` : `Estimated 1RM (${massUnit(UNIT_KINDS.LIFTING_WEIGHT)})`;
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
        ${coords.map((point, index) => { const show = coords.length <= 8 || index === 0 || index === coords.length - 1 || index % Math.ceil(coords.length / 6) === 0; const latest = index === coords.length - 1; return `${latest ? `<circle cx="${point.x}" cy="${point.y}" r="8" fill="var(--accent)" fill-opacity=".18"/>` : ""}<circle cx="${point.x}" cy="${point.y}" r="${latest ? 4 : 3}" fill="${latest ? "var(--accent)" : "var(--accent-dark)"}" stroke="var(--card)" stroke-width="2"><title>${formatDate(point.date)}: ${isVolume ? formatVolume(point.sessionVolume) : formatMass(point.estimatedOneRepMax, 1)}</title></circle>${show ? `<text x="${point.x}" y="${height - 16}" text-anchor="middle" fill="var(--muted)" font-size="10">${formatShortDate(point.date)}</text>` : ""}`; }).join("")}</svg>`;
}

function displayVolume(value) { return displayMass(value, 0, UNIT_KINDS.LIFTING_WEIGHT); }
function formatVolume(value) { return `${Number(displayVolume(value)).toLocaleString()} ${massUnit(UNIT_KINDS.LIFTING_WEIGHT)}`; }
function formatMass(value, digits = 0) { const shown = displayMass(value, digits, UNIT_KINDS.LIFTING_WEIGHT); return `${Number(shown).toLocaleString(undefined, { maximumFractionDigits: digits })} ${massUnit(UNIT_KINDS.LIFTING_WEIGHT)}`; }
function signedVolume(value) { return `${value > 0 ? "+" : ""}${Number(displayVolume(value)).toLocaleString()} ${massUnit(UNIT_KINDS.LIFTING_WEIGHT)}`; }
function signedMass(value, digits = 0) { return `${value > 0 ? "+" : ""}${formatMass(value, digits)}`; }
function signedNumber(value) { return `${value > 0 ? "+" : ""}${value}`; }
function signedPercent(value) { return Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : "—"; }
function changeToneClass(value) { return value > 0 ? "is-positive" : value < 0 ? "is-negative" : ""; }
function formatSet(set) { return `${formatMass(Number(set.weight))} × ${Number(set.reps)}`; }
function formatAxis(value) { return Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : Math.round(value); }
function niceStep(value) { const power = 10 ** Math.floor(Math.log10(Math.max(1, value))); const normalized = value / power; return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power; }
function parseDate(value) { if (!value) return null; const date = new Date(`${String(value).slice(0, 10)}T12:00:00`); return Number.isFinite(date.getTime()) ? date : null; }
function formatDate(value) { const date = parseDate(value); return date ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date) : "Unknown"; }
function formatShortDate(value) { const date = parseDate(value); return date ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date) : ""; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
