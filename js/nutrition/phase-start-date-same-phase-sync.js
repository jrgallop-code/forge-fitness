const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const DAY_MS = 86400000;
let pendingDateTimer = null;

function readPhases() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function activePhaseIndex(phases) {
    for (let index = phases.length - 1; index >= 0; index -= 1) {
        if (phases[index] && !phases[index].endDate && phases[index].goalId) return index;
    }
    return -1;
}

function previousPhaseIndex(phases, activeIndex) {
    for (let index = activeIndex - 1; index >= 0; index -= 1) {
        if (phases[index]?.startDate) return index;
    }
    return -1;
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

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function trendWeightAsOf(date) {
    const eligible = readWeights().filter(entry => entry.date <= date);
    if (!eligible.length) return null;

    const latest = eligible.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
    const value = recent.length
        ? recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length
        : latest.weight;

    return Math.round(value * 100) / 100;
}

function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function phaseDayNumber(startDate) {
    const start = dateMs(startDate);
    const end = dateMs(today());
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return Math.max(1, Math.floor((end - start) / DAY_MS) + 1);
}

function setMessage(text) {
    const node = document.getElementById("unified-calorie-message");
    if (node) node.textContent = text;
}

function syncVisibleStartedDate(startDate) {
    const grid = document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");
    if (!grid) return;
    const startedCell = [...grid.children].find(cell => cell.querySelector("span")?.textContent?.trim() === "Started");
    const strong = startedCell?.querySelector("strong");
    if (!strong) return;
    const day = phaseDayNumber(startDate);
    strong.textContent = `${formatDate(startDate)}${day ? ` · Day ${day}` : ""}`;
}

function updateCurrentPhaseStartDate(input) {
    const startDate = String(input?.value || "");
    const selectedGoalId = document.getElementById("unified-goal-select")?.value;
    if (!selectedGoalId || !validDate(startDate)) {
        if (startDate) setMessage("Choose a valid phase start date that is not in the future.");
        return;
    }

    const phases = readPhases();
    const index = activePhaseIndex(phases);
    if (index < 0) return;

    const active = phases[index];

    // If the user is preparing a different phase, leave this date as a draft.
    // The normal Save path will start the new phase with the chosen date.
    if (selectedGoalId !== active.goalId) return;

    if (startDate === active.startDate) {
        syncVisibleStartedDate(startDate);
        return;
    }

    const previousIndex = previousPhaseIndex(phases, index);
    const previous = previousIndex >= 0 ? phases[previousIndex] : null;
    if (previous?.startDate && startDate <= previous.startDate) {
        input.value = active.startDate || today();
        syncVisibleStartedDate(active.startDate || today());
        setMessage(`The current phase must start after the previous phase began (${formatDate(previous.startDate)}).`);
        return;
    }

    const now = new Date().toISOString();

    if (previousIndex >= 0) {
        const adjustedEndDate = previousDay(startDate);
        phases[previousIndex] = {
            ...previous,
            endDate: adjustedEndDate,
            endTrendWeight: trendWeightAsOf(adjustedEndDate),
            status: "completed",
            updatedAt: now
        };
    }

    phases[index] = {
        ...active,
        startDate,
        startingTrendWeight: trendWeightAsOf(startDate),
        updatedAt: now
    };

    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));

    // Keep the visible card synchronized immediately. The normal nutrition
    // refresh events below then rebuild the rest of the UI from the same record.
    input.value = startDate;
    syncVisibleStartedDate(startDate);

    window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));

    // Some iOS date-picker interactions finish before dependent views repaint.
    // Re-assert the stored date after those refreshes so draft UI cannot diverge.
    window.setTimeout(() => syncVisibleStartedDate(startDate), 40);
    window.setTimeout(() => syncVisibleStartedDate(startDate), 160);

    setMessage(`Phase Start Date updated to ${formatDate(startDate)}. This is still the same phase; its goal, calorie target, target rate, and phase ID are unchanged.`);
}

function scheduleDateCommit(input, delay = 120) {
    if (pendingDateTimer) window.clearTimeout(pendingDateTimer);
    pendingDateTimer = window.setTimeout(() => {
        pendingDateTimer = null;
        updateCurrentPhaseStartDate(input);
    }, delay);
}

document.addEventListener("input", event => {
    if (event.target?.id === "nutrition-phase-start-date") {
        scheduleDateCommit(event.target, 120);
    }
}, true);

document.addEventListener("change", event => {
    if (event.target?.id === "nutrition-phase-start-date") {
        if (pendingDateTimer) window.clearTimeout(pendingDateTimer);
        pendingDateTimer = null;
        updateCurrentPhaseStartDate(event.target);
    }
}, true);

document.addEventListener("focusout", event => {
    if (event.target?.id === "nutrition-phase-start-date") {
        if (pendingDateTimer) window.clearTimeout(pendingDateTimer);
        pendingDateTimer = null;
        updateCurrentPhaseStartDate(event.target);
    }
}, true);
