import { openActiveWorkout } from "./workout-session.js?v=workout-source-stats-1";

const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";
const CARDIO_TIMER_STORAGE_KEY = "level_up_cardio_timer_state";
const CUSTOM_EXERCISE_STORAGE_KEY = "forge_custom_exercises";
const CARDIO_ALARM_BANNER_ID = "level-up-cardio-alarm-banner";
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
let cardioAudioContext = null;

const ALARM_CLOCK_SVG = `
    <svg class="exercise-alarm-clock-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7"/>
        <path d="M12 9v4l2.6 1.6M7 3.8 4.6 6.2M17 3.8l2.4 2.4M8.5 20l-1.2 1.5M15.5 20l1.2 1.5M9 3h6"/>
    </svg>
`;

const CARDIO_ALARM_SVG = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7"/>
        <path d="M12 9v4l2.5 1.5M7 4 4.7 6.3M17 4l2.3 2.3M8.4 20l-1.2 1.4M15.6 20l1.2 1.4M9 3h6"/>
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

    if (changed) localStorage.setItem(CUSTOM_EXERCISE_STORAGE_KEY, JSON.stringify(normalized));

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

function normalizeTimerState(state = {}) {
    const alarmMinutes = Number(state?.alarmMinutes);
    return {
        accumulatedMs: Math.max(0, Number(state?.accumulatedMs) || 0),
        running: state?.running === true,
        startedAt: state?.startedAt || null,
        alarmMinutes: Number.isFinite(alarmMinutes) && alarmMinutes > 0 ? Math.min(240, alarmMinutes) : null,
        alarmFired: state?.alarmFired === true
    };
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

function getCardFromTimerKey(key) {
    const active = getActiveWorkout();
    if (!active?.id || !key?.startsWith(`${active.id}:`)) return null;
    const exerciseIndex = Number(key.slice(`${active.id}:`.length));
    if (!Number.isInteger(exerciseIndex)) return null;
    return document.querySelector(`.cardio-session-card[data-exercise-index="${exerciseIndex}"]`);
}

function getElapsedMs(state) {
    const normalized = normalizeTimerState(state);
    if (!normalized.running || !normalized.startedAt) return normalized.accumulatedMs;
    const started = new Date(normalized.startedAt).getTime();
    return normalized.accumulatedMs + (Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0);
}

function formatTimer(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

function getCardioName(card) {
    return card?.querySelector("h4")?.textContent?.trim() || "Cardio";
}

function primeAlarmAudio() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!cardioAudioContext) cardioAudioContext = new AudioContextClass();
        void cardioAudioContext.resume?.();
        const oscillator = cardioAudioContext.createOscillator();
        const gain = cardioAudioContext.createGain();
        gain.gain.value = 0.00001;
        oscillator.connect(gain);
        gain.connect(cardioAudioContext.destination);
        oscillator.start();
        oscillator.stop(cardioAudioContext.currentTime + 0.015);
    }
    catch {}
}

function playCardioAlarmSound() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!cardioAudioContext) cardioAudioContext = new AudioContextClass();
        void cardioAudioContext.resume?.();
        const now = cardioAudioContext.currentTime;
        [0, 0.28, 0.56].forEach(offset => {
            const oscillator = cardioAudioContext.createOscillator();
            const gain = cardioAudioContext.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = 880;
            gain.gain.setValueAtTime(0.0001, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
            oscillator.connect(gain);
            gain.connect(cardioAudioContext.destination);
            oscillator.start(now + offset);
            oscillator.stop(now + offset + 0.22);
        });
    }
    catch {}

    try { navigator.vibrate?.([180, 90, 180, 90, 260]); } catch {}
}

async function requestCardioAlerts(button) {
    primeAlarmAudio();
    if (!("Notification" in window)) {
        if (button) button.textContent = "In-app sound on";
        return;
    }
    if (Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch {}
    }
    syncCardioAlertButtons();
}

function notificationButtonText() {
    if (!("Notification" in window)) return "In-app sound on";
    if (Notification.permission === "granted") return "Alerts enabled";
    if (Notification.permission === "denied") return "In-app sound on";
    return "Enable alerts";
}

function syncCardioAlertButtons() {
    document.querySelectorAll(".cardio-alarm-alerts").forEach(button => {
        button.textContent = notificationButtonText();
        button.disabled = "Notification" in window && Notification.permission === "granted";
    });
}

async function showCardioNotification(card, alarmMinutes) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const title = "Cardio time complete";
    const body = `${getCardioName(card)} · ${Number(alarmMinutes).toLocaleString()} minute${Number(alarmMinutes) === 1 ? "" : "s"} reached.`;
    try {
        const registration = await navigator.serviceWorker?.ready;
        if (registration?.showNotification) {
            await registration.showNotification(title, {
                body,
                tag: "level-up-cardio-alarm",
                renotify: true,
                icon: "assets/icons/icon-192.png"
            });
            return;
        }
    }
    catch {}
    try { new Notification(title, { body, tag: "level-up-cardio-alarm" }); } catch {}
}

function ensureCardioAlarmBanner() {
    let banner = document.getElementById(CARDIO_ALARM_BANNER_ID);
    if (banner) return banner;
    banner = document.createElement("section");
    banner.id = CARDIO_ALARM_BANNER_ID;
    banner.hidden = true;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "assertive");
    banner.addEventListener("click", event => {
        const button = event.target.closest("button[data-cardio-alarm-action]");
        if (!button) return;
        const key = banner.dataset.timerKey;
        if (!key) return;
        const card = getCardFromTimerKey(key);
        if (button.dataset.cardioAlarmAction === "dismiss") {
            banner.hidden = true;
            return;
        }
        if (button.dataset.cardioAlarmAction === "plus5") {
            const store = getTimerStore();
            const state = normalizeTimerState(store[key]);
            state.alarmMinutes = Math.min(240, (Number(state.alarmMinutes) || Math.ceil(getElapsedMs(state) / 60000)) + 5);
            state.alarmFired = false;
            store[key] = state;
            saveTimerStore(store);
            banner.hidden = true;
            if (card) updateCardioTimerCard(card);
            return;
        }
        if (button.dataset.cardioAlarmAction === "pause") {
            pauseTimerForCard(card);
            banner.hidden = true;
        }
    });
    document.body.appendChild(banner);
    return banner;
}

function showCardioAlarmBanner(card, key, alarmMinutes) {
    const banner = ensureCardioAlarmBanner();
    banner.dataset.timerKey = key;
    banner.innerHTML = `
        <div class="cardio-alarm-banner-icon" aria-hidden="true">${CARDIO_ALARM_SVG}</div>
        <div class="cardio-alarm-banner-copy">
            <small>CARDIO ALARM</small>
            <strong>${escapeHtml(getCardioName(card))} · ${escapeHtml(String(alarmMinutes))} min complete</strong>
            <span>Your cardio timer is still recording.</span>
        </div>
        <div class="cardio-alarm-banner-actions">
            <button type="button" data-cardio-alarm-action="pause">Pause</button>
            <button type="button" data-cardio-alarm-action="plus5">+5 min</button>
            <button type="button" data-cardio-alarm-action="dismiss">Dismiss</button>
        </div>`;
    banner.hidden = false;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[character]));
}

function setAlarmForCard(card, minutes) {
    const key = getTimerKey(card);
    if (!key) return;
    const safeMinutes = Math.min(240, Math.max(1, Number(minutes) || 0));
    if (!Number.isFinite(safeMinutes)) return;
    primeAlarmAudio();
    const store = getTimerStore();
    const state = normalizeTimerState(store[key]);
    state.alarmMinutes = Math.round(safeMinutes * 10) / 10;
    state.alarmFired = false;
    store[key] = state;
    saveTimerStore(store);
    document.getElementById(CARDIO_ALARM_BANNER_ID)?.setAttribute("hidden", "");
    updateCardioTimerCard(card);
}

function clearAlarmForCard(card) {
    const key = getTimerKey(card);
    if (!key) return;
    const store = getTimerStore();
    const state = normalizeTimerState(store[key]);
    state.alarmMinutes = null;
    state.alarmFired = false;
    store[key] = state;
    saveTimerStore(store);
    document.getElementById(CARDIO_ALARM_BANNER_ID)?.setAttribute("hidden", "");
    updateCardioTimerCard(card);
}

function pauseTimerForCard(card) {
    if (!card) return;
    const key = getTimerKey(card);
    if (!key) return;
    const store = getTimerStore();
    const state = normalizeTimerState(store[key]);
    if (!state.running) return;
    state.accumulatedMs = getElapsedMs(state);
    state.running = false;
    state.startedAt = null;
    store[key] = state;
    saveTimerStore(store);
    syncDurationInput(card, state.accumulatedMs);
    updateCardioTimerCard(card);
}

function maybeFireCardioAlarm(card, key, state, elapsed) {
    if (!state.running || state.alarmFired || !state.alarmMinutes) return false;
    if (elapsed < state.alarmMinutes * 60000) return false;
    state.alarmFired = true;
    const store = getTimerStore();
    store[key] = state;
    saveTimerStore(store);
    playCardioAlarmSound();
    showCardioAlarmBanner(card, key, state.alarmMinutes);
    void showCardioNotification(card, state.alarmMinutes);
    return true;
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
        <div class="cardio-alarm-control">
            <div class="cardio-alarm-heading">
                <span class="cardio-alarm-icon" aria-hidden="true">${CARDIO_ALARM_SVG}</span>
                <span><strong>Cardio alarm</strong><small>Optional time goal</small></span>
                <b class="cardio-alarm-countdown">Off</b>
            </div>
            <div class="cardio-alarm-presets" role="group" aria-label="Cardio alarm time">
                ${[5, 10, 15, 20].map(minutes => `<button type="button" data-cardio-alarm-minutes="${minutes}">${minutes} min</button>`).join("")}
                <button type="button" class="cardio-alarm-off" data-cardio-alarm-off>Off</button>
            </div>
            <div class="cardio-alarm-custom">
                <label><span>Custom</span><input class="cardio-alarm-custom-input" type="number" min="1" max="240" step="1" inputmode="numeric" placeholder="25"><b>min</b></label>
                <button type="button" class="cardio-alarm-custom-set">Set</button>
            </div>
            <div class="cardio-alarm-note">
                <span>Alarm sounds at the selected elapsed time. The cardio timer keeps recording until you pause it.</span>
                <button type="button" class="cardio-alarm-alerts">${notificationButtonText()}</button>
            </div>
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
        primeAlarmAudio();
        const key = getTimerKey(card);
        if (!key) return;
        const store = getTimerStore();
        const state = normalizeTimerState(store[key]);
        if (!state.running) {
            state.running = true;
            state.startedAt = new Date().toISOString();
            store[key] = state;
            saveTimerStore(store);
        }
        updateCardioTimerCard(card);
    });

    panel.querySelector(".cardio-timer-pause")?.addEventListener("click", () => pauseTimerForCard(card));

    panel.querySelector(".cardio-timer-reset")?.addEventListener("click", () => {
        const key = getTimerKey(card);
        if (!key) return;
        const store = getTimerStore();
        const previous = normalizeTimerState(store[key]);
        store[key] = {
            accumulatedMs: 0,
            running: false,
            startedAt: null,
            alarmMinutes: previous.alarmMinutes,
            alarmFired: false
        };
        saveTimerStore(store);
        syncDurationInput(card, 0);
        document.getElementById(CARDIO_ALARM_BANNER_ID)?.setAttribute("hidden", "");
        updateCardioTimerCard(card);
    });

    panel.querySelectorAll("[data-cardio-alarm-minutes]").forEach(button => {
        button.addEventListener("click", () => setAlarmForCard(card, Number(button.dataset.cardioAlarmMinutes)));
    });
    panel.querySelector("[data-cardio-alarm-off]")?.addEventListener("click", () => clearAlarmForCard(card));
    panel.querySelector(".cardio-alarm-custom-set")?.addEventListener("click", () => {
        const input = panel.querySelector(".cardio-alarm-custom-input");
        const minutes = Number(input?.value);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
            input?.focus();
            input?.setCustomValidity?.("Choose an alarm from 1 to 240 minutes.");
            input?.reportValidity?.();
            return;
        }
        input?.setCustomValidity?.("");
        setAlarmForCard(card, minutes);
    });
    panel.querySelector(".cardio-alarm-custom-input")?.addEventListener("input", event => event.currentTarget.setCustomValidity?.(""));
    panel.querySelector(".cardio-alarm-alerts")?.addEventListener("click", event => void requestCardioAlerts(event.currentTarget));

    updateCardioTimerCard(card);
}

function updateCardioTimerCard(card) {
    const key = getTimerKey(card);
    const panel = card.querySelector(".cardio-stopwatch-panel");
    if (!key || !panel) return;

    const store = getTimerStore();
    const state = normalizeTimerState(store[key]);
    const elapsed = getElapsedMs(state);
    const display = panel.querySelector(".cardio-stopwatch-display");
    const start = panel.querySelector(".cardio-timer-start");
    const pause = panel.querySelector(".cardio-timer-pause");
    const durationInput = card.querySelector(".session-cardio-duration");
    const countdown = panel.querySelector(".cardio-alarm-countdown");

    if (display) display.textContent = formatTimer(elapsed);
    if (start) {
        start.hidden = Boolean(state.running);
        start.textContent = elapsed > 0 ? "Resume" : "Start";
    }
    if (pause) pause.hidden = !state.running;
    if (durationInput) durationInput.disabled = Boolean(state.running);
    if (state.running) syncDurationInput(card, elapsed);

    if (state.alarmMinutes) {
        const alarmMs = state.alarmMinutes * 60000;
        const remaining = Math.max(0, alarmMs - elapsed);
        if (countdown) countdown.textContent = state.alarmFired ? "Complete" : (state.running ? `${formatCountdown(remaining)} left` : `At ${formatCountdown(alarmMs)}`);
    } else if (countdown) {
        countdown.textContent = "Off";
    }

    panel.querySelectorAll("[data-cardio-alarm-minutes]").forEach(button => {
        const selected = Number(button.dataset.cardioAlarmMinutes) === Number(state.alarmMinutes);
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
    panel.querySelector("[data-cardio-alarm-off]")?.classList.toggle("is-selected", !state.alarmMinutes);
    panel.querySelector(".cardio-alarm-control")?.classList.toggle("is-complete", Boolean(state.alarmFired));

    maybeFireCardioAlarm(card, key, state, elapsed);
    syncCardioAlertButtons();
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
    if (event.target.closest?.("#begin-session-btn, #history-add-exercise-btn")) normalizeCustomCardioExercises();
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
