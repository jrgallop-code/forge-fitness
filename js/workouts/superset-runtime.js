import { ACTIVE_WORKOUT_STORAGE_KEY } from "./workout-session.js?v=swap-history-metadata-1";
import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";

const TIMER_SETTINGS_KEY = "level_up_exercise_rest_settings";
const SESSION_STORAGE_KEY = "forge_workout_sessions";
let observer = null;

function getActive() {
    try {
        const value = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
        return value && value.status === "in_progress" ? value : null;
    } catch {
        return null;
    }
}

function saveActive(active) {
    if (!active) return;
    active.updatedAt = new Date().toISOString();
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
}

function getDay(active) {
    return active?.planSnapshot?.days?.[Number(active.trainingDayIndex) || 0] || null;
}

function hasSupersets(active) {
    return Boolean(getDay(active)?.exercises?.some(exercise => exercise?.supersetGroup));
}

function getGroupMembers(active, group) {
    const day = getDay(active);
    if (!day || !group) return [];
    return (day.exercises || [])
        .map((exercise, index) => ({ exercise, index }))
        .filter(item => item.exercise?.supersetGroup === group);
}

function getGroupLetter(active, group) {
    const groups = [];
    (getDay(active)?.exercises || []).forEach(exercise => {
        const value = exercise?.supersetGroup;
        if (value && !groups.includes(value)) groups.push(value);
    });
    const index = Math.max(0, groups.indexOf(group));
    return index < 26 ? String.fromCharCode(65 + index) : `S${index + 1}`;
}

function getExerciseName(id) {
    return getExerciseById(id)?.name || "Exercise";
}

function formatSeconds(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(value / 60);
    const remainder = value % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getSupersetRestSeconds(groupMembers) {
    try {
        const settings = JSON.parse(localStorage.getItem(TIMER_SETTINGS_KEY) || "{}");
        for (const member of groupMembers) {
            const setting = settings?.[member.exercise?.id];
            if (setting?.enabled && Number(setting.seconds) > 0) {
                return Number(setting.seconds);
            }
        }
    } catch {
        // Fall through to the superset default.
    }
    return 90;
}

function startSupersetRest(active, seconds) {
    active.restTimer = {
        status: "running",
        durationSeconds: seconds,
        endAt: new Date(Date.now() + seconds * 1000).toISOString(),
        remainingMs: seconds * 1000,
        notified: false
    };
}

function setRowCompletion(row, set, completed) {
    set.completed = completed;
    row.classList.toggle("completed", completed);
    const button = row.querySelector(".complete-set-btn");
    if (button) button.textContent = completed ? "✓ Completed" : "Complete Set";
}

function goToExercise(logger, targetIndex) {
    if (!logger || !Number.isFinite(targetIndex)) return;

    const cards = [...logger.querySelectorAll(".session-exercise-card")];
    const targetCard = cards.find(card => Number(card.dataset.exerciseIndex) === targetIndex);
    if (!targetCard) return;

    let current = Number(logger.dataset.carouselExerciseIndex);
    if (!Number.isFinite(current)) current = cards.findIndex(card => !card.hidden);
    if (!Number.isFinite(current) || current < 0) current = 0;

    const targetPosition = cards.indexOf(targetCard);
    const next = logger.querySelector(".exercise-carousel-next");
    const previous = logger.querySelector(".exercise-carousel-prev");

    if (next && previous && targetPosition !== current) {
        const nav = targetPosition > current ? next : previous;
        const steps = Math.abs(targetPosition - current);
        for (let i = 0; i < steps; i += 1) nav.click();
        return;
    }

    logger.dataset.carouselExerciseIndex = String(targetPosition);
    cards.forEach((card, index) => {
        card.hidden = index !== targetPosition;
        card.classList.toggle("active-exercise-card", index === targetPosition);
    });
}

function showCue(logger, html, tone = "next") {
    if (!logger) return;
    let cue = logger.querySelector(".superset-live-cue");
    if (!cue) {
        cue = document.createElement("div");
        cue.className = "superset-live-cue";
        const controls = logger.querySelector(".exercise-carousel-controls");
        const container = logger.querySelector("#session-exercises");
        if (controls) controls.insertAdjacentElement("afterend", cue);
        else container?.prepend(cue);
    }
    cue.dataset.tone = tone;
    cue.innerHTML = html;
    cue.hidden = false;
}

function getNextRoundTarget(active, members, completedSetIndex) {
    const first = members[0];
    if (!first) return null;

    const firstSets = active.exercises?.[first.index]?.sets || [];
    for (let setIndex = completedSetIndex + 1; setIndex < firstSets.length; setIndex += 1) {
        if (!firstSets[setIndex]?.completed) return { exerciseIndex: first.index, setIndex };
    }

    for (const member of members) {
        const sets = active.exercises?.[member.index]?.sets || [];
        const pending = sets.findIndex(set => !set?.completed);
        if (pending >= 0) return { exerciseIndex: member.index, setIndex: pending };
    }

    return null;
}

function reconcileCompletionFromDom(logger = document.getElementById("workout-session-logger")) {
    if (!logger || logger.dataset.editingSessionId) return;
    const active = getActive();
    if (!active || !hasSupersets(active)) return;

    logger.querySelectorAll(".session-exercise-card[data-exercise-index]").forEach(card => {
        const exerciseIndex = Number(card.dataset.exerciseIndex);
        const state = active.exercises?.[exerciseIndex];
        if (!state?.sets?.length) return;
        card.querySelectorAll(".session-set-row[data-set-index]").forEach(row => {
            const setIndex = Number(row.dataset.setIndex);
            if (!state.sets[setIndex]) return;
            state.sets[setIndex].completed = row.classList.contains("completed");
        });
    });

    saveActive(active);
}

function scheduleReconcile(logger) {
    setTimeout(() => reconcileCompletionFromDom(logger), 0);
}

function getElapsedMs(active) {
    const accumulated = Number(active?.accumulatedMs) || 0;
    if (!active?.startedAt || active?.pausedAt) return accumulated;
    return accumulated + Math.max(0, Date.now() - new Date(active.startedAt).getTime());
}

function getSavedSessions() {
    try {
        const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(sessions) ? sessions : [];
    } catch {
        return [];
    }
}

function completeSupersetSession(logger) {
    reconcileCompletionFromDom(logger);
    const active = getActive();
    if (!active || !hasSupersets(active)) return false;

    const durationMs = getElapsedMs(active);
    const completed = {
        id: String(active.id || `active-${Date.now()}`).replace(/^active-/, "session-"),
        date: logger.querySelector("#session-date")?.value || active.date,
        planId: active.planId,
        planName: active.planName,
        planSnapshot: JSON.parse(JSON.stringify(active.planSnapshot || {})),
        trainingDayIndex: Number(active.trainingDayIndex) || 0,
        trainingDayName: active.trainingDayName || getDay(active)?.name || "Workout",
        startedAt: active.startedAt || null,
        completedAt: new Date().toISOString(),
        durationMs,
        durationMinutes: Math.round(durationMs / 60000),
        exercises: JSON.parse(JSON.stringify(active.exercises || []))
    };

    const sessions = getSavedSessions();
    const existingIndex = sessions.findIndex(item => item.id === completed.id);
    if (existingIndex >= 0) sessions[existingIndex] = completed;
    else sessions.push(completed);

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
    document.getElementById("active-workout-banner")?.remove();

    const message = logger.querySelector("#session-message");
    if (message) message.textContent = "Workout completed and saved.";
    const button = logger.querySelector("#save-session-btn");
    if (button) {
        button.textContent = "Workout Saved ✓";
        button.disabled = true;
    }

    setTimeout(() => document.querySelector('.nav-btn[data-page="workout"]')?.click(), 350);
    return true;
}

function annotateLogger(logger = document.getElementById("workout-session-logger")) {
    if (!logger || logger.dataset.editingSessionId) return;
    const active = getActive();
    const day = getDay(active);
    if (!active || !day) return;

    logger.querySelectorAll(".session-exercise-card").forEach(card => {
        const index = Number(card.dataset.exerciseIndex);
        const planned = day.exercises?.[index];
        const group = planned?.supersetGroup;
        if (!group) return;

        const members = getGroupMembers(active, group);
        if (members.length < 2) return;
        card.dataset.supersetGroup = group;

        const position = members.findIndex(member => member.index === index);
        const partner = members.find(member => member.index !== index);
        const groupLetter = getGroupLetter(active, group);
        const exerciseCode = `${groupLetter}${position + 1}`;
        const partnerPosition = members.findIndex(member => member.index === partner?.index);
        const partnerCode = `${groupLetter}${partnerPosition + 1}`;
        const tab = logger.querySelector(`.logger-exercise-strip [data-exercise-tab-index="${index}"]`);
        const tabMarker = tab?.querySelector("span");
        if (tab) tab.classList.add("is-superset");
        if (tabMarker && tabMarker.textContent !== exerciseCode) tabMarker.textContent = exerciseCode;

        if (card.querySelector(".superset-runtime-banner")) return;
        const banner = document.createElement("div");
        banner.className = "superset-runtime-banner";
        banner.innerHTML = `
            <span class="superset-runtime-label">${escapeHtml(exerciseCode)}</span>
            <strong>Superset</strong>
            <small>${position === 0 ? `Then ${escapeHtml(partnerCode)}` : `Paired with ${escapeHtml(partnerCode)}`} · ${escapeHtml(getExerciseName(partner?.exercise?.id))}${position === 0 ? " — no rest" : " — rest after this exercise"}</small>
            <button type="button" data-superset-go-index="${partner?.index}" aria-label="Go to ${escapeHtml(getExerciseName(partner?.exercise?.id))}">Go to ${escapeHtml(partnerCode)}</button>
        `;

        const anchor = card.querySelector(".compact-exercise-header") || card.querySelector("h4");
        anchor?.insertAdjacentElement("afterend", banner);
    });
}

function handleClick(event) {
    const quickSwitch = event.target.closest?.("[data-superset-go-index]");
    if (quickSwitch) {
        const logger = quickSwitch.closest("#workout-session-logger");
        const targetIndex = Number(quickSwitch.dataset.supersetGoIndex);
        if (logger && Number.isInteger(targetIndex)) {
            event.preventDefault();
            goToExercise(logger, targetIndex);
        }
        return;
    }

    const saveButton = event.target.closest?.("#save-session-btn");
    if (saveButton) {
        const logger = saveButton.closest("#workout-session-logger");
        const active = getActive();
        if (logger && !logger.dataset.editingSessionId && active && hasSupersets(active)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            completeSupersetSession(logger);
        }
        return;
    }

    const button = event.target.closest?.(".complete-set-btn");
    if (!button) return;

    const logger = button.closest("#workout-session-logger");
    if (!logger || logger.dataset.editingSessionId) return;

    const card = button.closest(".session-exercise-card");
    const row = button.closest(".session-set-row");
    if (!card || !row) return;

    const active = getActive();
    const day = getDay(active);
    const exerciseIndex = Number(card.dataset.exerciseIndex);
    const setIndex = Number(row.dataset.setIndex);
    const planned = day?.exercises?.[exerciseIndex];
    const group = planned?.supersetGroup;

    if (!active || !group) {
        if (active && hasSupersets(active)) scheduleReconcile(logger);
        return;
    }

    const members = getGroupMembers(active, group);
    if (members.length < 2) return;

    const set = active.exercises?.[exerciseIndex]?.sets?.[setIndex];
    if (!set) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const completing = !set.completed;
    setRowCompletion(row, set, completing);
    active.currentExerciseIndex = exerciseIndex;
    active.currentSetIndex = setIndex;

    if (!completing) {
        saveActive(active);
        showCue(logger, `<strong>Superset ${escapeHtml(getGroupLetter(active, group))}</strong><span>Set marked incomplete.</span>`, "neutral");
        return;
    }

    const partnerForRound = members.find(member => {
        if (member.index === exerciseIndex) return false;
        const partnerSet = active.exercises?.[member.index]?.sets?.[setIndex];
        return partnerSet && !partnerSet.completed;
    });

    if (partnerForRound) {
        const groupLetter = getGroupLetter(active, group);
        const partnerPosition = members.findIndex(member => member.index === partnerForRound.index);
        active.restTimer = null;
        active.currentExerciseIndex = partnerForRound.index;
        active.currentSetIndex = setIndex;
        saveActive(active);
        showCue(
            logger,
            `<span class="superset-cue-kicker">SUPERSET ${escapeHtml(groupLetter)}</span><strong>Go directly to ${escapeHtml(groupLetter)}${partnerPosition + 1} · ${escapeHtml(getExerciseName(partnerForRound.exercise.id))}</strong><span>Set ${setIndex + 1} • no rest yet</span>`,
            "next"
        );
        setTimeout(() => goToExercise(logger, partnerForRound.index), 0);
        return;
    }

    const restSeconds = getSupersetRestSeconds(members);
    const groupLetter = getGroupLetter(active, group);
    const next = getNextRoundTarget(active, members, setIndex);
    startSupersetRest(active, restSeconds);
    if (next) {
        active.currentExerciseIndex = next.exerciseIndex;
        active.currentSetIndex = next.setIndex;
    }
    saveActive(active);

    const nextName = next ? getExerciseName(day.exercises?.[next.exerciseIndex]?.id) : "finish the remaining workout";
    showCue(
        logger,
        `<span class="superset-cue-kicker">SUPERSET ${escapeHtml(groupLetter)} ROUND COMPLETE</span><strong>Rest ${formatSeconds(restSeconds)}</strong><span>${next ? `Next: ${escapeHtml(nextName)} • Set ${next.setIndex + 1}` : "Superset complete"}</span>`,
        "rest"
    );
    if (next) setTimeout(() => goToExercise(logger, next.exerciseIndex), 0);
}

function handleInput(event) {
    const logger = event.target.closest?.("#workout-session-logger");
    if (!logger || logger.dataset.editingSessionId) return;
    const active = getActive();
    if (active && hasSupersets(active)) scheduleReconcile(logger);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("click", handleClick, true);
document.addEventListener("input", handleInput, true);

observer = new MutationObserver(() => annotateLogger());
observer.observe(document.body, { childList: true, subtree: true });
annotateLogger();
