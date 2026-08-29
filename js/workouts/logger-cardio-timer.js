import { openActiveWorkout } from "./workout-session.js?v=cardio-rpe-1";

const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";
const CARDIO_TIMER_STORAGE_KEY = "level_up_cardio_timer_state";
const CUSTOM_EXERCISE_STORAGE_KEY = "forge_custom_exercises";
const BUILT_IN_CARDIO_IDS = new Set([
    "indoor-rower",
    "ski-erg",
    "stationary-bike",
    "running",
    "assault-bike",
    "air-bike",
    "fan-bike"
]);
const CARDIO_NAME_PATTERN = /\b(?:assault|air|fan|stationary|exercise)\s*bike\b|\bindoor\s*rower\b|\bski\s*erg\b|\btreadmill\b|\brunning\b/i;
let intervalId = null;
let trackingRepairInFlight = false;

const ALARM_CLOCK_SVG = `
    <svg class="exercise-alarm-clock-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7"/>
        <path d="M12 9v4l2.6 1.6M7 3.8 4.6 6.2M17 3.8l2.4 2.4M8.5 20l-1.2 1.5M15.5 20l1.2 1.5M9 3h6"/>
    </svg>
`;

function getActiveWorkout() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
        return parsed && parsed.status === "in_progress" ? parsed : null;
    }
    catch {
        return null;
    }
}

function readCustomExercises() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CUSTOM_EXERCISE_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

function isCardioExercise(exercise) {
    if (!exercise || typeof exercise !== "object") return false;
    const type = String(exercise.type || "").trim().toLowerCase();
    const muscleGroup = String(exercise.muscleGroup || "").trim().toLowerCase();
    const name = String(exercise.name || "").trim();
    return exercise.trackingType === "notes" ||
        type === "cardio" ||
        muscleGroup === "cardio" ||
        CARDIO_NAME_PATTERN.test(name);
}

function looksLikeCardioId(value) {
    const id = String(value || "").trim().toLowerCase();
    if (BUILT_IN_CARDIO_IDS.has(id)) return true;
    return /^(?:custom-)?(?:assault|air|fan|stationary|exercise)-bike(?:-|$)/.test(id) ||
        /^(?:custom-)?indoor-rower(?:-|$)/.test(id) ||
        /^(?:custom-)?ski-erg(?:-|$)/.test(id);
}

function normalizeCustomCardioExercises() {
    const customExercises = readCustomExercises();
    if (!customExercises.length) return new Set(BUILT_IN_CARDIO_IDS);

    let changed = false;
    const normalized = customExercises.map(exercise => {
        if (!isCardioExercise(exercise)) return exercise;

        const needsUpdate = exercise.trackingType !== "notes" ||
            String(exercise.type || "").toLowerCase() !== "cardio" ||
            String(exercise.muscleGroup || "").toLowerCase() !== "cardio" ||
            Number(exercise.defaultSets) !== 1 ||
            String(exercise.recommendedReps || "") !== "";

        if (!needsUpdate) return exercise;
        changed = true;
        return {
            ...exercise,
            muscleGroup: "Cardio",
            type: "cardio",
            recommendedReps: "",
            defaultSets: 1,
            trackingType: "notes"
        };
    });

    if (changed) {
        localStorage.setItem(CUSTOM_EXERCISE_STORAGE_KEY, JSON.stringify(normalized));
    }

    const cardioIds = new Set(BUILT_IN_CARDIO_IDS);
    normalized.forEach(exercise => {
        if (isCardioExercise(exercise) && exercise.id) cardioIds.add(String(exercise.id));
    });
    return cardioIds;
}

function normalizeActiveCardioState(cardioIds) {
    const active = getActiveWorkout();
    if (!active || !Array.isArray(active.exercises)) return false;

    const dayIndex = Number(active.trainingDayIndex) || 0;
    const planned = active.planSnapshot?.days?.[dayIndex]?.exercises || [];
    let changed = false;

    active.exercises = active.exercises.map((state, index) => {
        const exerciseId = String(state?.exerciseId || planned[index]?.id || "");
        const isCardio = cardioIds.has(exerciseId) || looksLikeCardioId(exerciseId);
        if (!isCardio || state?.trackingType === "notes") return state;

        changed = true;
        if (planned[index]) planned[index].sets = 1;

        return {
            ...state,
            exerciseId,
            trackingType: "notes",
            durationMinutes: state?.durationMinutes ?? null,
            distance: typeof state?.distance === "string" ? state.distance : "",
            rpe: Number(state?.rpe) >= 1 && Number(state?.rpe) <= 10 ? Number(state.rpe) : null,
            notes: typeof state?.notes === "string" ? state.notes : "",
            sets: []
        };
    });

    if (changed) {
        active.updatedAt = new Date().toISOString();
        localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
    }
    return changed;
}

function repairCardioTracking({ rerender = false } = {}) {
    const cardioIds = normalizeCustomCardioExercises();
    const changed = normalizeActiveCardioState(cardioIds);

    if (changed && rerender && !trackingRepairInFlight) {
        trackingRepairInFlight = true;
        requestAnimationFrame(() => {
            openActiveWorkout();
            trackingRepairInFlight = false;
        });
    }
    return changed;
}

function getTimerStore() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CARDIO_TIMER_STORAGE_KEY) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch {
        return {};
    }
}

function saveTimerStore(store) {
    localStorage.setItem(CARDIO_TIMER_STORAGE_KEY, JSON.stringify(store));
}

function getTimerKey(card) {
    const active = getActiveWorkout();
    const exerciseIndex = Number(card.dataset.exerciseIndex);
    if (!active || !Number.isInteger(exerciseIndex)) return null;
    return `${active.id || "active"}:${exerciseIndex}`;
}

function getElapsedMs(state) {
    const accumulated = Math.max(0, Number(state?.accumulatedMs) || 0);
    if (!state?.running || !state?.startedAt) return accumulated;
    const started = new Date(state.startedAt).getTime();
    return accumulated + (Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0);
}

function formatTimer(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

function syncDurationInput(card, elapsedMs) {
    const input = card.querySelector(".session-cardio-duration");
    if (!input) return;
    const minutes = Math.round((elapsedMs / 60000) * 10) / 10;
    const nextValue = minutes > 0 ? String(minutes) : "0";
    if (input.value === nextValue) return;
    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true }));
}

function decorateAlarmClockButtons(logger) {
    logger.querySelectorAll(".exercise-more-btn").forEach(button => {
        if (button.dataset.alarmClockIcon === "true") return;
        button.dataset.alarmClockIcon = "true";
        button.innerHTML = ALARM_CLOCK_SVG;
        button.setAttribute("aria-label", "Rest timer settings");
        button.setAttribute("title", "Rest timer settings");
    });
}

function createCardioTimer(card) {
    if (card.dataset.cardioTimerEnhanced === "true") return;
    card.dataset.cardioTimerEnhanced = "true";

    const logger = card.closest("#workout-session-logger");
    if (!logger || logger.dataset.editingSessionId) return;

    const metrics = card.querySelector(".cardio-metrics-grid");
    if (!metrics) return;

    const panel = document.createElement("div");
    panel.className = "cardio-stopwatch-panel";
    panel.innerHTML = `
        <div class="cardio-stopwatch-heading">
            <span>Cardio timer</span>
            <strong class="cardio-stopwatch-display">00:00:00</strong>
        </div>
        <div class="cardio-stopwatch-actions">
            <button class="cardio-timer-start primary-btn" type="button">Start</button>
            <button class="cardio-timer-pause secondary-btn" type="button" hidden>Pause</button>
            <button class="cardio-timer-reset secondary-btn" type="button">Reset timer</button>
        </div>
        <small>Use the timer or enter minutes manually below.</small>
    `;
    metrics.insertAdjacentElement("beforebegin", panel);

    panel.querySelector(".cardio-timer-start")?.addEventListener("click", () => {
        const key = getTimerKey(card);
        if (!key) return;
        const store = getTimerStore();
        const state = store[key] || { accumulatedMs: 0, running: false, startedAt: null };
        if (!state.running) {
            state.running = true;
            state.startedAt = new Date().toISOString();
            store[key] = state;
            saveTimerStore(store);
        }
        updateCardioTimerCard(card);
    });

    panel.querySelector(".cardio-timer-pause")?.addEventListener("click", () => {
        const key = getTimerKey(card);
        if (!key) return;
        const store = getTimerStore();
        const state = store[key];
        if (!state?.running) return;
        state.accumulatedMs = getElapsedMs(state);
        state.running = false;
        state.startedAt = null;
        store[key] = state;
        saveTimerStore(store);
        syncDurationInput(card, state.accumulatedMs);
        updateCardioTimerCard(card);
    });

    panel.querySelector(".cardio-timer-reset")?.addEventListener("click", () => {
        const key = getTimerKey(card);
        if (!key) return;
        const store = getTimerStore();
        delete store[key];
        saveTimerStore(store);
        updateCardioTimerCard(card);
    });

    updateCardioTimerCard(card);
}

function updateCardioTimerCard(card) {
    const key = getTimerKey(card);
    const panel = card.querySelector(".cardio-stopwatch-panel");
    if (!key || !panel) return;

    const state = getTimerStore()[key] || { accumulatedMs: 0, running: false, startedAt: null };
    const elapsed = getElapsedMs(state);
    const display = panel.querySelector(".cardio-stopwatch-display");
    const start = panel.querySelector(".cardio-timer-start");
    const pause = panel.querySelector(".cardio-timer-pause");
    const durationInput = card.querySelector(".session-cardio-duration");

    if (display) display.textContent = formatTimer(elapsed);
    if (start) {
        start.hidden = Boolean(state.running);
        start.textContent = elapsed > 0 ? "Resume" : "Start";
    }
    if (pause) pause.hidden = !state.running;
    if (durationInput) durationInput.disabled = Boolean(state.running);

    if (state.running) syncDurationInput(card, elapsed);
}

function scanLogger() {
    if (repairCardioTracking({ rerender: true })) return;
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return;
    decorateAlarmClockButtons(logger);
    logger.querySelectorAll('.cardio-session-card[data-tracking-type="notes"]').forEach(createCardioTimer);
    logger.querySelectorAll('.cardio-session-card[data-tracking-type="notes"]').forEach(updateCardioTimerCard);
}

function cleanupStaleTimerState() {
    const active = getActiveWorkout();
    const store = getTimerStore();
    if (!Object.keys(store).length) return;
    if (!active?.id) {
        localStorage.removeItem(CARDIO_TIMER_STORAGE_KEY);
        return;
    }
    const prefix = `${active.id}:`;
    const cleaned = Object.fromEntries(Object.entries(store).filter(([key]) => key.startsWith(prefix)));
    if (Object.keys(cleaned).length !== Object.keys(store).length) saveTimerStore(cleaned);
}

document.addEventListener("click", event => {
    if (event.target.closest?.("#begin-session-btn, #history-add-exercise-btn")) {
        normalizeCustomCardioExercises();
    }
}, true);

const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation =>
        [...mutation.addedNodes].some(node =>
            node.nodeType === 1 && (
                node.id === "workout-session-logger" ||
                node.matches?.(".session-exercise-card, .exercise-more-btn") ||
                node.querySelector?.("#workout-session-logger, .session-exercise-card, .exercise-more-btn")
            )
        )
    );
    if (relevant) requestAnimationFrame(scanLogger);
});

observer.observe(document.body, { childList: true, subtree: true });
intervalId = window.setInterval(() => {
    document.querySelectorAll('.cardio-session-card[data-cardio-timer-enhanced="true"]').forEach(updateCardioTimerCard);
}, 500);

window.addEventListener("focus", scanLogger);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scanLogger();
});

cleanupStaleTimerState();
scanLogger();
