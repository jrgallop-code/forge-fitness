const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const DAY_MS = 86400000;

function readPhases() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writePhases(phases) {
    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
}

function activePhaseIndex(phases) {
    for (let index = phases.length - 1; index >= 0; index -= 1) {
        if (phases[index] && !phases[index].endDate && phases[index].goalId) return index;
    }
    return -1;
}

function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        && Number.isFinite(dateMs(value))
        && value <= today();
}

function previousDay(value) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value || "--";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function readWeights() {
    try {
        const rows = JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]");
        if (!Array.isArray(rows)) return [];
        return rows
            .map(row => ({ date: String(row?.date || ""), weight: Number(row?.weight) }))
            .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.weight) && row.weight > 0)
            .sort((a, b) => a.date.localeCompare(b.date));
    } catch {
        return [];
    }
}

function trendAsOf(date) {
    const eligible = readWeights().filter(entry => entry.date <= date);
    if (!eligible.length) return null;
    const latest = eligible.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
    const sample = recent.length ? recent : [latest];
    const value = sample.reduce((sum, entry) => sum + entry.weight, 0) / sample.length;
    return Math.round(value * 100) / 100;
}

function setStatus(message) {
    const status = document.getElementById("phase-inline-status");
    if (status) status.textContent = message;
}

function completedPhaseRefs(phases, activeIndex) {
    return phases
        .map((phase, index) => ({ phase, index }))
        .filter(({ phase, index }) => index !== activeIndex && phase?.startDate && phase?.endDate && phase?.goalId);
}

function latestCompletedBefore(phases, activeIndex, startDate) {
    return completedPhaseRefs(phases, activeIndex)
        .filter(({ phase }) => phase.startDate < startDate)
        .sort((a, b) => String(b.phase.startDate).localeCompare(String(a.phase.startDate)))[0] || null;
}

function completedConflicts(phases, activeIndex, startDate) {
    return completedPhaseRefs(phases, activeIndex)
        .filter(({ phase }) => phase.startDate >= startDate)
        .sort((a, b) => String(a.phase.startDate).localeCompare(String(b.phase.startDate)));
}

function showSavedMessage(startDate) {
    window.setTimeout(() => {
        const button = document.getElementById("edit-current-phase-details");
        if (!button || button.parentElement?.querySelector(".phase-date-correction-saved")) return;
        const message = document.createElement("p");
        message.className = "phase-inline-saved phase-date-correction-saved";
        message.textContent = `Saved · phase now starts ${formatDate(startDate)}`;
        button.insertAdjacentElement("afterend", message);
        window.setTimeout(() => message.remove(), 2400);
    }, 40);
}

function saveCorrectedPhaseDate(event, saveButton) {
    const startDate = String(document.getElementById("phase-inline-start-date")?.value || "");
    const rawGoal = String(document.getElementById("phase-inline-goal-weight")?.value || "").trim();
    const parsedGoal = rawGoal === "" ? null : Number(rawGoal);
    const goalWeight = Number.isFinite(parsedGoal) && parsedGoal > 0 ? Math.round(parsedGoal * 10) / 10 : null;

    if (!validDate(startDate)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setStatus("Choose a valid start date that is not in the future.");
        return;
    }
    if (rawGoal !== "" && !Number.isFinite(goalWeight)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setStatus("Enter a valid goal weight or leave it blank.");
        return;
    }

    const phases = readPhases();
    const activeIndex = activePhaseIndex(phases);
    if (activeIndex < 0) return;

    const active = phases[activeIndex];
    const conflicts = completedConflicts(phases, activeIndex, startDate);
    if (conflicts.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const conflict = conflicts[0].phase;
        setStatus(`A saved earlier phase still starts ${formatDate(conflict.startDate)}. Delete that old phase from Phase History before moving this phase earlier.`);
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    saveButton.disabled = true;
    setStatus("Saving…");

    const now = new Date().toISOString();
    const previous = latestCompletedBefore(phases, activeIndex, startDate);
    if (previous) {
        const endDate = previousDay(startDate);
        phases[previous.index] = {
            ...previous.phase,
            endDate,
            endTrendWeight: trendAsOf(endDate),
            status: "completed",
            updatedAt: now
        };
    }

    phases[activeIndex] = {
        ...active,
        startDate,
        startingTrendWeight: trendAsOf(startDate),
        ...(Number.isFinite(goalWeight) ? { goalWeight } : {}),
        updatedAt: now
    };

    writePhases(phases);
    if (Number.isFinite(goalWeight)) localStorage.setItem(GOAL_WEIGHT_KEY, String(goalWeight));

    const verified = readPhases();
    const verifiedIndex = activePhaseIndex(verified);
    if (verifiedIndex < 0 || verified[verifiedIndex]?.startDate !== startDate) {
        saveButton.disabled = false;
        setStatus("The phase date did not save. Please try again.");
        return;
    }

    const setupDate = document.getElementById("nutrition-phase-start-date");
    if (setupDate) setupDate.value = startDate;

    window.setTimeout(() => {
        document.getElementById("cancel-phase-details-edit")?.click();
        window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated", { detail: { source: "phase-date-correction-save" } }));
        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "phase-date-correction-save" } }));
        showSavedMessage(startDate);
    }, 0);
}

document.addEventListener("click", event => {
    const saveButton = event.target?.closest?.("#save-phase-details-edit");
    if (!saveButton) return;
    saveCorrectedPhaseDate(event, saveButton);
}, true);
