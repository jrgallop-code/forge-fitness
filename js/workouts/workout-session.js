import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import "./machine-profile-ui.js?v=machine-profile-sheet-ios-1";

import {
    getExerciseById
}
from "./exercise-library.js?v=exercise-library-catalogue-2";
import { classifyWorkoutSource } from "./workout-source.js?v=workout-source-stats-1";
import { openWorkoutMode } from "./workout-mode.js?v=native-navigation-stability-1";
import {
    UNIT_KINDS,
    canonicalInputValue,
    formatMass as formatUnitMass,
    massUnit
} from "../core/unit-system.js?v=granular-units-1";

import {
    repairWorkoutSessionList,
    resolveSessionExerciseIdentity
}
from "./session-exercise-identity.js?v=repair-generic-exercise-1";

import {
    getLastEquipmentProfile,
    supportsEquipmentProfiles
}
from "./equipment-profiles.js?v=equipment-profiles-1";


const SESSION_STORAGE_KEY =
    "forge_workout_sessions";

export const ACTIVE_WORKOUT_STORAGE_KEY =
    "level_up_active_workout";

const PLAN_STORAGE_KEY =
    "forge_workout_plans";


let workoutClockInterval = null;
let restClockInterval = null;
let runtimeInitialized = false;


export function initializeWorkoutRuntime() {

    if (runtimeInitialized) {
        resumeRuntimeTimers();
        return;
    }


    runtimeInitialized = true;

    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                checkRestTimerExpiry();
                updateTimerDisplays();
            }
        }
    );

    window.addEventListener(
        "focus",
        () => {
            checkRestTimerExpiry();
            updateTimerDisplays();
        }
    );

    window.addEventListener(
        "levelup:units-changed",
        () => {
            if (document.getElementById("workout-session-logger") && getActiveWorkout()) {
                openActiveWorkout();
            }
        }
    );

    resumeRuntimeTimers();

}


export function initializeActiveWorkoutUI() {

    renderActiveWorkoutBanner();

    if (getActiveWorkout()) {
        openActiveWorkout();
    }

    resumeRuntimeTimers();

}


export function getLastWorkoutForPlan(planId) {

    return getSavedSessions()
        .filter(session =>
            session.planId === planId
        )
        .sort(compareSessionsNewest)[0] ||
        null;

}


export function getActiveWorkout() {

    try {
        const parsed =
            JSON.parse(
                localStorage.getItem(
                    ACTIVE_WORKOUT_STORAGE_KEY
                ) ||
                "null"
            );

        return parsed &&
            typeof parsed === "object" &&
            parsed.status === "in_progress"
                ? parsed
                : null;
    }
    catch {
        return null;
    }

}


export function getWorkoutSessions() {
    return getSavedSessions();
}


export function openWorkoutLogger(plan) {

    const active =
        getActiveWorkout();


    if (active) {
        const replace =
            window.confirm(
                `You already have "${active.planName || "a workout"}" in progress. Discard it and start another workout?`
            );

        if (!replace) {
            openActiveWorkout();
            return;
        }

        clearActiveWorkout();
    }


    renderWorkoutLogger({
        plan,
        session: null,
        editingSessionId: null
    });

}


export function openActiveWorkout() {

    const active =
        getActiveWorkout();

    if (!active) {
        return false;
    }


    renderWorkoutLogger({
        plan:
            active.planSnapshot,
        session:
            active,
        editingSessionId:
            null
    });

    return true;

}


export function openCompletedWorkoutForEdit(sessionId) {

    const session =
        getSavedSessions()
            .find(item =>
                item.id === sessionId
            );

    if (!session) {
        return false;
    }


    const plan =
        getPlanForSession(session);


    renderWorkoutLogger({
        plan,
        session:
            createEditableSession(
                session,
                plan
            ),
        editingSessionId:
            session.id
    });

    return true;

}


export function deleteCompletedWorkout(sessionId) {

    const session =
        getSavedSessions()
            .find(item =>
                item.id === sessionId
            );

    if (!session) {
        return false;
    }


    const confirmed =
        window.confirm(
            `Delete "${session.planName || "this workout"}" from ${formatWorkoutDate(session.date)}? This cannot be undone.`
        );

    if (!confirmed) {
        return false;
    }


    localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(
            getSavedSessions()
                .filter(item =>
                    item.id !== sessionId
                )
        )
    );

    return true;

}


export function discardActiveWorkout() {

    const active =
        getActiveWorkout();

    if (!active) {
        return true;
    }


    const confirmed =
        window.confirm(
            `Discard the unfinished "${active.planName || "workout"}"? The recorded sets will be removed.`
        );

    if (!confirmed) {
        return false;
    }


    clearActiveWorkout();
    return true;

}


function renderWorkoutLogger({
    plan,
    session,
    editingSessionId
}) {

    const days =
        Array.isArray(plan?.days)
            ? plan.days
            : [];

    if (!days.length) {
        window.alert(
            "This workout has no training days to log."
        );
        return;
    }


    document
        .getElementById("workout-session-logger")
        ?.remove();


    const logger =
        document.createElement("section");

    logger.id =
        "workout-session-logger";
    logger.className =
        "plan-builder workout-session-logger";
    logger.dataset.editingSessionId =
        editingSessionId || "";


    const initialDayIndex =
        Number(session?.trainingDayIndex) || 0;


    logger.innerHTML = `
        <div class="builder-heading">
            <div>
                <span class="eyebrow">
                    ${editingSessionId ? "EDIT WORKOUT" : session ? "ACTIVE WORKOUT" : "START WORKOUT"}
                </span>
                <h3>${escapeHtml(plan.name || "My Workout Plan")}</h3>
                <p>${editingSessionId ? "Update the saved workout without creating a duplicate." : "Your progress saves automatically on this device."}</p>
            </div>
        </div>

        <div class="workout-session-status">
            <div>
                <span>Workout duration</span>
                <strong id="workout-duration-display">${editingSessionId ? formatDuration(Number(session?.durationMs) || Number(session?.durationMinutes) * 60000 || 0) : "00:00:00"}</strong>
            </div>
            <div class="workout-timer-actions">
                <button id="pause-workout-timer" class="secondary-btn" type="button">Pause</button>
                <button id="resume-workout-timer" class="secondary-btn" type="button" hidden>Resume</button>
            </div>
        </div>

        <div class="workout-start-fields">
            <label>
                Training Day
                <select id="session-day-select" ${session ? "disabled" : ""}>
                    ${days.map((day, index) => `
                        <option value="${index}" ${index === initialDayIndex ? "selected" : ""}>
                            ${escapeHtml(day.name || `Day ${index + 1}`)}
                        </option>
                    `).join("")}
                </select>
            </label>

            <label>
                Workout Date
                <input id="session-date" type="date" value="${escapeHtml(session?.date || getLocalDateValue())}">
            </label>
        </div>

        ${session
            ? ""
            : '<button id="begin-session-btn" class="primary-btn" type="button">Begin Workout</button>'}

        <div id="session-exercises"></div>
        <div id="session-message" class="workout-message" aria-live="polite"></div>
    `;


    if (editingSessionId) {
        document
            .querySelector(".workout-page")
            ?.appendChild(logger);
    }
    else {
        // Mount directly into the fixed workout surface. Moving the logger here
        // on a later animation frame caused the underlying Workout page to flash.
        openWorkoutMode(logger);
    }


    bindWorkoutTimerButtons(logger);

    logger
        .querySelector("#session-date")
        ?.addEventListener(
            "change",
            event => {
                const active = getActiveWorkout();
                if (active && !editingSessionId) {
                    active.date = event.target.value;
                    saveActiveWorkout(active);
                }
            }
        );


    if (session) {
        renderSessionExercises({
            plan,
            logger,
            session,
            editingSessionId
        });
    }
    else {
        logger
            .querySelector("#begin-session-btn")
            ?.addEventListener(
                "click",
                () => {
                    const created =
                        createActiveSession(
                            plan,
                            logger
                        );
                    renderSessionExercises({
                        plan,
                        logger,
                        session: created,
                        editingSessionId: null
                    });
                }
            );
    }


    updateTimerDisplays();

    if (editingSessionId) {
        const display =
            logger.querySelector("#workout-duration-display");
        if (display) {
            display.textContent =
                formatDuration(
                    Number(session.durationMs) ||
                    Number(session.durationMinutes) * 60000 ||
                    0
                );
        }
    }

    const workoutMode = logger.closest("#levelup-workout-mode");
    if (workoutMode) {
        workoutMode.scrollTop = 0;
    }
    else {
        logger.scrollIntoView({
            behavior: "auto",
            block: "start"
        });
    }

}


function createActiveSession(plan, logger) {

    const dayIndex =
        Number(
            logger.querySelector("#session-day-select")?.value ||
            0
        );

    const day =
        plan.days[dayIndex];

    const session = {
        id:
            `active-${Date.now()}`,
        status:
            "in_progress",
        date:
            logger.querySelector("#session-date")?.value ||
            getLocalDateValue(),
        planId:
            plan.id,
        planName:
            plan.name,
        planSnapshot:
            clone(plan),
        trainingDayIndex:
            dayIndex,
        trainingDayName:
            day?.name ||
            `Day ${dayIndex + 1}`,
        startedAt:
            new Date().toISOString(),
        accumulatedMs:
            0,
        pausedAt:
            null,
        exercises:
            createExerciseState(day),
        currentExerciseIndex:
            0,
        currentSetIndex:
            0,
        restTimer:
            null
    };


    saveActiveWorkout(session);
    resumeRuntimeTimers();
    return session;

}


function createExerciseState(day) {

    return (day?.exercises || [])
        .map(plannedExercise => {
            const exercise =
                getExerciseById(
                    plannedExercise.id
                );

            if (exercise?.trackingType === "notes") {
                return {
                    exerciseId: plannedExercise.id,
                    ...exerciseStateMetadata(exercise, plannedExercise),
                    trackingType: "notes",
                    durationMinutes: null,
                    distance: "",
                    rpe: null,
                    notes: "",
                    sets: []
                };
            }

            const setCount =
                Math.max(
                    1,
                    Number(plannedExercise.sets) || 1
                );

            return {
                exerciseId: plannedExercise.id,
                ...exerciseStateMetadata(exercise, plannedExercise),
                trackingType: "reps",
                notes: "",
                ...getInitialEquipmentProfile(exercise),
                sets:
                    Array.from(
                        { length: setCount },
                        () => ({
                            weight: null,
                            reps: null,
                            rir: null,
                            completed: false
                        })
                    )
            };
        });

}

function exerciseStateMetadata(definition, plannedExercise = {}) {
    const name = definition?.name || plannedExercise?.name || plannedExercise?.exerciseName || "";
    return {
        name,
        exerciseName: name,
        muscleGroup: definition?.muscleGroup || plannedExercise?.muscleGroup || "",
        type: definition?.type || plannedExercise?.type || "",
        equipment: definition?.equipment || plannedExercise?.equipment || ""
    };
}

function enrichCompletedExercise(exercise, plannedExercise = {}) {
    const identity = resolveSessionExerciseIdentity(exercise, plannedExercise);
    return {
        ...exercise,
        ...identity,
        sets: (exercise?.sets || []).map(normalizeSavedSet)
    };
}

function normalizeRirValue(value) {
    if (value === null || value === "" || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? Math.min(4, Math.max(0, Math.round(numeric)))
        : null;
}

function normalizeSavedSet(set = {}) {
    return {
        ...set,
        rir: normalizeRirValue(set.rir)
    };
}


function renderSessionExercises({
    plan,
    logger,
    session,
    editingSessionId
}) {

    logger
        .querySelector("#begin-session-btn")
        ?.remove();

    const dayIndex =
        Number(session.trainingDayIndex) || 0;
    const day =
        plan.days[dayIndex] ||
        { exercises: [] };
    const container =
        logger.querySelector("#session-exercises");

    if (!container) {
        return;
    }

    // Runtime controls use this in-memory session for both an active workout and
    // a completed workout being edited. Completed edits are only written back
    // when the user presses Update Saved Workout.
    logger.__levelUpSession = session;
    logger.__levelUpPlan = plan;
    logger.__levelUpEquipmentContext = {
        plan,
        session,
        editingSessionId
    };
    bindEquipmentProfileEvents(logger);

    container.innerHTML = `
        ${editingSessionId ? "" : renderRestTimerPanel(session)}

        ${(day.exercises || []).map((plannedExercise, exerciseIndex) => {
            const exercise =
                getExerciseById(plannedExercise.id);
            const state =
                session.exercises?.[exerciseIndex] ||
                createExerciseState({ exercises: [plannedExercise] })[0];
            const previous =
                getPreviousPerformance(
                    plan.id,
                    dayIndex,
                    plannedExercise.id,
                    state.equipmentProfileId,
                    editingSessionId
                );

            if (state.trackingType === "notes") {
                return `
                    <article class="session-exercise-card cardio-session-card" data-exercise-index="${exerciseIndex}" data-exercise-id="${escapeHtml(plannedExercise.id || "")}" data-tracking-type="notes">
                        <h4>${escapeHtml(exercise?.name || "Cardio")}</h4>
                        <p class="session-target">Record your cardio time, with optional distance, effort and notes.</p>
                        <div class="previous-performance"><strong>Previous workout</strong><span>${escapeHtml(formatCardioPrevious(previous))}</span></div>
                        <div class="cardio-metrics-grid cardio-metrics-grid-with-rpe">
                            <label>Time (minutes)
                                <input class="session-cardio-duration" type="number" inputmode="decimal" min="0" step="0.1" value="${state.durationMinutes ?? ""}" placeholder="20">
                            </label>
                            <label>Distance (optional)
                                <input class="session-cardio-distance" type="text" maxlength="40" value="${escapeHtml(state.distance || "")}" placeholder="5 km, 3 mi or 1500 m">
                            </label>
                            <label>Effort (RPE)
                                <input class="session-cardio-rpe" type="number" inputmode="decimal" min="1" max="10" step="0.5" value="${state.rpe ?? ""}" placeholder="1–10">
                            </label>
                        </div>
                        <label class="cardio-notes-label">Notes (optional)
                            <textarea class="session-cardio-notes" maxlength="500" placeholder="Pace, resistance, intervals…">${escapeHtml(state.notes || "")}</textarea>
                        </label>
                    </article>
                `;
            }

            return `
                <article class="session-exercise-card" data-exercise-index="${exerciseIndex}" data-exercise-id="${escapeHtml(plannedExercise.id || "")}" data-equipment-profile-id="${escapeHtml(state.equipmentProfileId || "default")}" data-tracking-type="reps">
                    <h4>${escapeHtml(exercise?.name || "Exercise")}</h4>
                    <p class="session-target">Target: ${state.sets.length} sets × ${escapeHtml(plannedExercise.reps || "—")} reps</p>
                    <div class="session-lifting-note ${String(state.notes || "").trim() ? "has-note" : ""}">
                        <button class="session-note-preview" type="button" aria-expanded="false">
                            <span class="session-note-empty-icon" aria-hidden="true">+</span>
                            <svg class="session-note-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h8l3 3v14H6.5z"></path><path d="M14.5 3.5v4h4M9 12h6M9 15.5h6"></path></svg>
                            <span class="session-note-copy">${String(state.notes || "").trim() ? escapeHtml(String(state.notes).trim()) : "Add exercise note"}</span>
                            <span class="session-note-empty-hint">Optional</span>
                            <svg class="session-note-edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16.5-1 3.5 3.5-1L18 8.5 14.5 5zM13.5 6l3.5 3.5"></path></svg>
                        </button>
                        <div class="session-note-editor" hidden>
                            <textarea class="session-rep-notes" maxlength="500" placeholder="Technique, setup, machine setting, pain, cues…">${escapeHtml(state.notes || "")}</textarea>
                            <div class="session-note-editor-actions"><small>Saved automatically</small><button class="session-note-done" type="button">Done</button></div>
                        </div>
                    </div>
                    <div class="previous-performance"><strong>Previous workout</strong><span>${formatPrevious(previous)}</span></div>
                    <div class="session-set-header"><span>Set</span><span>Last Workout</span><span>Weight (${massUnit(UNIT_KINDS.LIFTING_WEIGHT)})</span><span>Reps</span></div>
                    ${state.sets.map((set, setIndex) => {
                        const previousSet =
                            previous?.sets?.[setIndex];
                        return `
                            <div class="session-set-row ${set.completed ? "completed" : ""}" data-set-index="${setIndex}">
                                <strong>${setIndex + 1}</strong>
                                <span class="previous-set-value">${previousSet ? formatPreviousSet(previousSet) : "Hasn't started"}</span>
                                <input class="session-weight" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weight ?? ""}" placeholder="${previousSet?.weight ?? "Weight"}" aria-label="Set ${setIndex + 1} weight">
                                <input class="session-reps" type="number" inputmode="numeric" min="0" step="1" value="${set.reps ?? ""}" placeholder="${previousSet?.reps ?? "Reps"}" aria-label="Set ${setIndex + 1} reps">
                                <button class="complete-set-btn secondary-btn" type="button">${set.completed ? "✓ Completed" : "Complete Set"}</button>
                            </div>
                        `;
                    }).join("")}
                </article>
            `;
        }).join("")}

        <div class="session-completion-actions">
            <button id="save-session-btn" class="primary-btn" type="button">
                ${editingSessionId ? "Update Saved Workout" : "Complete Workout"}
            </button>
            ${editingSessionId ? "" : '<button id="discard-session-btn" class="secondary-btn" type="button">Discard Workout</button>'}
        </div>
    `;


    bindSessionInputs({
        logger,
        session,
        editingSessionId
    });

    if (editingSessionId) {
        bindEditWorkoutExerciseControls({
            plan,
            logger,
            session,
            editingSessionId
        });
    }

    if (!editingSessionId) {
        bindRestTimerControls(logger);
    }

    let completionRequested = false;
    const completeWorkout = () => {
        if (completionRequested) return;
        completionRequested = true;
        saveCompletedSession({
            plan,
            logger,
            session,
            editingSessionId
        });
    };

    logger
        .querySelector("#save-session-btn")
        ?.addEventListener("click", completeWorkout);

    logger.addEventListener("levelup:complete-workout-requested", completeWorkout);

    logger
        .querySelector("#discard-session-btn")
        ?.addEventListener(
            "click",
            () => {
                if (discardActiveWorkout()) {
                    logger.remove();
                    renderActiveWorkoutBanner();
                }
            }
        );

    updateTimerDisplays();

}


function bindEquipmentProfileEvents(logger) {
    if (logger.dataset.equipmentProfileEventsBound === "true") return;
    logger.dataset.equipmentProfileEventsBound = "true";
    logger.addEventListener("levelup:equipment-profile-selected", event => {
        const context = logger.__levelUpEquipmentContext;
        const exerciseIndex = Number(event.detail?.exerciseIndex);
        const profile = event.detail?.profile;
        const state = context?.session?.exercises?.[exerciseIndex];
        if (!context || !state || !profile?.id) return;

        state.equipmentProfileId = profile.id;
        state.equipmentProfileName = profile.name || "Default machine";
        context.session.currentExerciseIndex = exerciseIndex;
        if (!context.editingSessionId) saveActiveWorkout(context.session);

        renderSessionExercises({
            plan: context.plan,
            logger,
            session: context.session,
            editingSessionId: context.editingSessionId
        });
    });
}


function bindEditWorkoutExerciseControls({
    plan,
    logger,
    session,
    editingSessionId
}) {

    const dayIndex =
        Number(session.trainingDayIndex) || 0;
    const day =
        plan.days[dayIndex];

    if (!day) {
        return;
    }

    const rerender = () => {
        session.planSnapshot = clone(plan);
        renderSessionExercises({ plan, logger, session, editingSessionId });
    };

    logger.__levelUpEditApi = {
        rerender,
        addExercise(exerciseId) {
            const exercise = getExerciseById(exerciseId);
            if (!exercise) return false;
            const plannedExercise = {
                id: exercise.id,
                name: exercise.name,
                exerciseName: exercise.name,
                muscleGroup: exercise.muscleGroup || "",
                type: exercise.type || "",
                equipment: exercise.equipment || "",
                trackingType: exercise.trackingType || "reps",
                sets: exercise.trackingType === "notes" ? 1 : 3,
                reps: exercise.recommendedReps || "8-12"
            };
            day.exercises.push(plannedExercise);
            session.exercises.push(createExerciseState({ exercises: [plannedExercise] })[0]);
            session.currentExerciseIndex = session.exercises.length - 1;
            session.currentSetIndex = 0;
            rerender();
            return true;
        },
        addSet(exerciseIndex) {
            const state = session.exercises?.[exerciseIndex];
            const plannedExercise = day.exercises?.[exerciseIndex];
            if (!state?.sets || !plannedExercise) return false;
            state.sets.push({ weight: null, reps: null, rir: null, completed: false });
            plannedExercise.sets = state.sets.length;
            session.currentExerciseIndex = exerciseIndex;
            session.currentSetIndex = state.sets.length - 1;
            rerender();
            return true;
        },
        removeSet(exerciseIndex, setIndex) {
            const state = session.exercises?.[exerciseIndex];
            const set = state?.sets?.[setIndex];
            if (!state?.sets || state.sets.length <= 1 || !set) return false;
            const hasRir = set.rir !== null && set.rir !== "" && set.rir !== undefined;
            const hasData = set.weight !== null || set.reps !== null || hasRir || set.completed || (set.dropSets || []).length;
            if (hasData && !window.confirm(`Remove set ${setIndex + 1} and its recorded data?`)) return false;
            state.sets.splice(setIndex, 1);
            day.exercises[exerciseIndex].sets = state.sets.length;
            session.currentExerciseIndex = exerciseIndex;
            session.currentSetIndex = Math.max(0, Math.min(setIndex, state.sets.length - 1));
            rerender();
            return true;
        },
        removeExercise(exerciseIndex) {
            const plannedExercise = day.exercises?.[exerciseIndex];
            if (!plannedExercise || day.exercises.length <= 1) return false;
            const exerciseName = getExerciseById(plannedExercise.id)?.name || "this exercise";
            if (!window.confirm(`Remove ${exerciseName} and its recorded data from this workout?`)) return false;
            day.exercises.splice(exerciseIndex, 1);
            session.exercises.splice(exerciseIndex, 1);
            session.currentExerciseIndex = Math.max(0, Math.min(exerciseIndex, session.exercises.length - 1));
            session.currentSetIndex = 0;
            rerender();
            return true;
        }
    };

}


function renderRestTimerPanel(session) {

    return `
        <section class="rest-timer-panel">
            <div>
                <span class="eyebrow">REST TIMER</span>
                <strong id="rest-timer-display">Ready</strong>
            </div>
            <label>Rest length
                <select id="rest-duration-select">
                    <option value="60">60 seconds</option>
                    <option value="90" selected>90 seconds</option>
                    <option value="120">2 minutes</option>
                    <option value="180">3 minutes</option>
                    <option value="custom">Custom</option>
                </select>
            </label>
            <input id="custom-rest-seconds" type="number" min="5" max="1800" step="5" placeholder="Seconds" hidden>
            <button id="start-rest-timer" class="primary-btn" type="button">Start Rest</button>
            <button id="pause-rest-timer" class="secondary-btn" type="button">Pause</button>
            <button id="resume-rest-timer" class="secondary-btn" type="button">Resume</button>
            <button id="dismiss-rest-timer" class="secondary-btn" type="button">Dismiss</button>
            <button id="enable-rest-notifications" class="secondary-btn" type="button">Enable Notifications</button>
            <p id="notification-support-note">
                Alerts work while the web app is running. Fully closed-app alerts are not guaranteed without a push service.
            </p>
        </section>
    `;

}


function bindSessionInputs({
    logger,
    session,
    editingSessionId
}) {

    const persist = () => {
        if (!editingSessionId) {
            saveActiveWorkout(session);
        }
    };

    logger.addEventListener("levelup:drop-sets-changed", event => {
        const exerciseIndex = Number(event.detail?.exerciseIndex);
        const setIndex = Number(event.detail?.setIndex);
        const set = session.exercises?.[exerciseIndex]?.sets?.[setIndex];
        if (!set || !Array.isArray(event.detail?.dropSets)) return;
        set.dropSets = event.detail.dropSets.map(drop => ({ ...drop }));
        session.currentExerciseIndex = exerciseIndex;
        session.currentSetIndex = setIndex;
        persist();
    });

    logger.addEventListener("levelup:set-rir-changed", event => {
        const detail = event.detail || {};
        const exerciseIndex = Number(detail.exerciseIndex);
        const setIndex = Number(detail.setIndex);
        const set = session.exercises?.[exerciseIndex]?.sets?.[setIndex];
        if (!set) return;
        const hasValue = detail.value !== null && detail.value !== "" && detail.value !== undefined;
        const value = hasValue ? Number(detail.value) : null;
        set.rir = Number.isFinite(value) ? Math.min(4, Math.max(0, value)) : null;
        session.currentExerciseIndex = exerciseIndex;
        session.currentSetIndex = setIndex;
        persist();
    });


    logger
        .querySelectorAll(".session-exercise-card")
        .forEach(card => {
            const exerciseIndex =
                Number(card.dataset.exerciseIndex);

            const noteShell = card.querySelector(".session-lifting-note");
            const noteToggle = noteShell?.querySelector(".session-note-preview");
            const noteEditor = noteShell?.querySelector(".session-note-editor");
            const noteTextarea = noteShell?.querySelector(".session-rep-notes");
            const noteCopy = noteShell?.querySelector(".session-note-copy");
            const noteDone = noteShell?.querySelector(".session-note-done");

            const syncNotePreview = () => {
                const note = String(noteTextarea?.value || "").trim();
                noteShell?.classList.toggle("has-note", Boolean(note));
                if (noteCopy) noteCopy.textContent = note || "Add exercise note";
                if (noteToggle) noteToggle.setAttribute("aria-label", note ? "Edit exercise note" : "Add exercise note");
                const menuNoteLabel = card.querySelector('[data-session-overflow-action="note"] span');
                if (menuNoteLabel) menuNoteLabel.textContent = note ? "Edit Note" : "Add Note";
            };

            const closeNoteEditor = () => {
                if (!noteShell || !noteEditor || !noteToggle) return;
                noteShell.classList.remove("is-editing");
                noteEditor.hidden = true;
                noteToggle.setAttribute("aria-expanded", "false");
                noteTextarea?.blur();
                syncNotePreview();
            };

            noteToggle?.addEventListener("click", () => {
                if (!noteShell || !noteEditor) return;
                noteShell.classList.add("is-editing");
                noteEditor.hidden = false;
                noteToggle.setAttribute("aria-expanded", "true");
                window.requestAnimationFrame(() => noteTextarea?.focus());
            });
            noteDone?.addEventListener("click", closeNoteEditor);
            noteTextarea?.addEventListener("keydown", event => {
                if (event.key === "Escape") closeNoteEditor();
            });
            syncNotePreview();

            card
                .querySelector(".session-rep-notes")
                ?.addEventListener(
                    "input",
                    event => {
                        session.exercises[exerciseIndex].notes = event.target.value;
                        session.currentExerciseIndex = exerciseIndex;
                        syncNotePreview();
                        persist();
                    }
                );

            card
                .querySelector(".session-cardio-duration")
                ?.addEventListener(
                    "input",
                    event => {
                        session.exercises[exerciseIndex].durationMinutes =
                            event.target.value === ""
                                ? null
                                : Number(event.target.value);
                        session.currentExerciseIndex =
                            exerciseIndex;
                        persist();
                    }
                );

            card
                .querySelector(".session-cardio-distance")
                ?.addEventListener(
                    "input",
                    event => {
                        session.exercises[exerciseIndex].distance =
                            event.target.value;
                        session.currentExerciseIndex =
                            exerciseIndex;
                        persist();
                    }
                );

            card
                .querySelector(".session-cardio-notes")
                ?.addEventListener(
                    "input",
                    event => {
                        session.exercises[exerciseIndex].notes =
                            event.target.value;
                        session.currentExerciseIndex =
                            exerciseIndex;
                        persist();
                    }
                );

            card
                .querySelector(".session-cardio-rpe")
                ?.addEventListener(
                    "input",
                    event => {
                        const value = Number(event.target.value);
                        session.exercises[exerciseIndex].rpe =
                            event.target.value === "" || value < 1 || value > 10
                                ? null
                                : value;
                        session.currentExerciseIndex = exerciseIndex;
                        persist();
                    }
                );

            card
                .querySelectorAll(".session-set-row")
                .forEach(row => {
                    const setIndex =
                        Number(row.dataset.setIndex);
                    const set =
                        session.exercises[exerciseIndex].sets[setIndex];

                    row
                        .querySelector(".session-weight")
                        ?.addEventListener(
                            "input",
                            event => {
                                set.weight = canonicalInputValue(event.target);
                                session.currentExerciseIndex = exerciseIndex;
                                session.currentSetIndex = setIndex;
                                persist();
                            }
                        );

                    row
                        .querySelector(".session-reps")
                        ?.addEventListener(
                            "input",
                            event => {
                                set.reps =
                                    event.target.value === ""
                                        ? null
                                        : Number(event.target.value);
                                session.currentExerciseIndex = exerciseIndex;
                                session.currentSetIndex = setIndex;
                                persist();
                            }
                        );

                    row
                        .querySelector(".complete-set-btn")
                        ?.addEventListener(
                            "click",
                            () => {
                                set.completed =
                                    !set.completed;
                                row.classList.toggle(
                                    "completed",
                                    set.completed
                                );
                                row.querySelector(".complete-set-btn").textContent =
                                    set.completed
                                        ? "✓ Completed"
                                        : "Complete Set";
                                session.currentExerciseIndex = exerciseIndex;
                                session.currentSetIndex = setIndex;
                                persist();

                                if (set.completed && !editingSessionId) {
                                    startRestTimer(
                                        getSelectedRestSeconds(logger)
                                    );
                                }
                            }
                        );

                });
        });

}


function bindWorkoutTimerButtons(logger) {

    logger
        .querySelector("#pause-workout-timer")
        ?.addEventListener(
            "click",
            pauseWorkoutTimer
        );

    logger
        .querySelector("#resume-workout-timer")
        ?.addEventListener(
            "click",
            resumeWorkoutTimer
        );

}


function bindRestTimerControls(logger) {

    const select =
        logger.querySelector("#rest-duration-select");
    const custom =
        logger.querySelector("#custom-rest-seconds");

    select?.addEventListener(
        "change",
        () => {
            if (custom) {
                custom.hidden =
                    select.value !== "custom";
            }
        }
    );

    logger
        .querySelector("#start-rest-timer")
        ?.addEventListener(
            "click",
            () =>
                startRestTimer(
                    getSelectedRestSeconds(logger)
                )
        );

    logger
        .querySelector("#pause-rest-timer")
        ?.addEventListener("click", pauseRestTimer);
    logger
        .querySelector("#resume-rest-timer")
        ?.addEventListener("click", resumeRestTimer);
    logger
        .querySelector("#dismiss-rest-timer")
        ?.addEventListener("click", dismissRestTimer);
    logger
        .querySelector("#enable-rest-notifications")
        ?.addEventListener("click", requestNotificationPermission);

}


function getSelectedRestSeconds(logger) {

    const select =
        logger.querySelector("#rest-duration-select");

    if (select?.value === "custom") {
        return Math.max(
            5,
            Number(
                logger.querySelector("#custom-rest-seconds")?.value
            ) || 90
        );
    }

    if (!select) {
        return 90;
    }

    const seconds = Number(select.value);
    return Number.isFinite(seconds)
        ? Math.max(0, seconds)
        : 90;

}


function saveCompletedSession({
    plan,
    logger,
    session,
    editingSessionId
}) {

    const date =
        logger.querySelector("#session-date")?.value ||
        session.date ||
        getLocalDateValue();

    const durationMs =
        editingSessionId
            ? Number(session.durationMs) || 0
            : getWorkoutElapsedMs(session);

    const completedDay = plan.days?.[Number(session.trainingDayIndex) || 0];
    const completed = {
        id:
            editingSessionId ||
            session.id.replace(/^active-/, "session-"),
        date,
        planId:
            session.planId || plan.id,
        planName:
            session.planName || plan.name,
        planSnapshot:
            clone(plan),
        workoutSource:
            classifyWorkoutSource(plan),
        trainingDayIndex:
            Number(session.trainingDayIndex) || 0,
        trainingDayName:
            session.trainingDayName ||
            plan.days?.[session.trainingDayIndex]?.name ||
            "Workout",
        startedAt:
            session.startedAt || null,
        completedAt:
            editingSessionId
                ? session.completedAt || new Date().toISOString()
                : new Date().toISOString(),
        durationMs,
        durationMinutes:
            Math.round(durationMs / 60000),
        exercises:
            clone((session.exercises || []).map((exercise, index) =>
                enrichCompletedExercise(exercise, completedDay?.exercises?.[index])
            ))
    };

    const sessions =
        getSavedSessions();
    const index =
        sessions.findIndex(item =>
            item.id === completed.id
        );

    if (index >= 0) {
        sessions[index] = completed;
    }
    else {
        sessions.push(completed);
    }

    localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(sessions)
    );

    if (!editingSessionId) {
        clearActiveWorkout();
        const workingSets = completed.exercises.reduce((total, exercise) => total + (exercise.sets || []).filter(set => Number(set.reps) > 0).length, 0);
        window.dispatchEvent(new CustomEvent("levelup:workout-completed", { detail: { sessionId: completed.id, planId: completed.planId, workoutSource: completed.workoutSource, workingSets, durationMinutes: completed.durationMinutes } }));
    }

    const message =
        logger.querySelector("#session-message");
    if (message) {
        message.textContent =
            editingSessionId
                ? "Saved workout updated."
                : "Workout completed and saved.";
    }

    renderActiveWorkoutBanner();

}


function saveActiveWorkout(session) {

    session.updatedAt =
        new Date().toISOString();
    localStorage.setItem(
        ACTIVE_WORKOUT_STORAGE_KEY,
        JSON.stringify(session)
    );

}


function clearActiveWorkout() {

    localStorage.removeItem(
        ACTIVE_WORKOUT_STORAGE_KEY
    );
    clearInterval(workoutClockInterval);
    clearInterval(restClockInterval);
    workoutClockInterval = null;
    restClockInterval = null;

}


function renderActiveWorkoutBanner() {

    document
        .getElementById("active-workout-banner")
        ?.remove();

    const active =
        getActiveWorkout();

    if (!active) {
        return;
    }

    const banner =
        document.createElement("section");
    banner.id =
        "active-workout-banner";
    banner.className =
        "section-card active-workout-banner";
    banner.innerHTML = `
        <div>
            <span class="eyebrow">WORKOUT IN PROGRESS</span>
            <h3>${escapeHtml(active.planName || "Active Workout")}</h3>
            <p>${escapeHtml(active.trainingDayName || "Training day")} • <span data-active-duration>${formatDuration(getWorkoutElapsedMs(active))}</span></p>
        </div>
        <div class="builder-footer">
            <button id="resume-active-workout" class="primary-btn" type="button">Resume Workout</button>
            <button id="discard-active-workout" class="secondary-btn" type="button">Discard</button>
        </div>
    `;

    const page =
        document.querySelector(".workout-page");
    page?.prepend(banner);

    banner
        .querySelector("#resume-active-workout")
        ?.addEventListener("click", openActiveWorkout);
    banner
        .querySelector("#discard-active-workout")
        ?.addEventListener(
            "click",
            () => {
                if (discardActiveWorkout()) {
                    renderActiveWorkoutBanner();
                }
            }
        );

}


function pauseWorkoutTimer() {

    const active = getActiveWorkout();
    if (!active || active.pausedAt) {
        return;
    }
    active.accumulatedMs =
        getWorkoutElapsedMs(active);
    active.pausedAt =
        new Date().toISOString();
    active.startedAt = null;
    saveActiveWorkout(active);
    updateTimerDisplays();

}


function resumeWorkoutTimer() {

    const active = getActiveWorkout();
    if (!active || !active.pausedAt) {
        return;
    }
    active.startedAt =
        new Date().toISOString();
    active.pausedAt = null;
    saveActiveWorkout(active);
    resumeRuntimeTimers();

}


function getWorkoutElapsedMs(session) {

    const accumulated =
        Number(session?.accumulatedMs) || 0;
    if (!session?.startedAt || session?.pausedAt) {
        return accumulated;
    }
    return accumulated +
        Math.max(
            0,
            Date.now() - new Date(session.startedAt).getTime()
        );

}


function startRestTimer(seconds) {

    const active = getActiveWorkout();
    const durationSeconds = Number(seconds);
    if (!active || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return;
    }
    active.restTimer = {
        status: "running",
        durationSeconds,
        endAt:
            new Date(Date.now() + durationSeconds * 1000).toISOString(),
        remainingMs:
            durationSeconds * 1000,
        notified: false
    };
    saveActiveWorkout(active);
    resumeRuntimeTimers();
    updateTimerDisplays();

}


function pauseRestTimer() {

    const active = getActiveWorkout();
    const timer = active?.restTimer;
    if (!timer || timer.status !== "running") {
        return;
    }
    timer.remainingMs =
        Math.max(
            0,
            new Date(timer.endAt).getTime() - Date.now()
        );
    timer.status = "paused";
    timer.endAt = null;
    saveActiveWorkout(active);
    updateTimerDisplays();

}


function resumeRestTimer() {

    const active = getActiveWorkout();
    const timer = active?.restTimer;
    if (!timer || timer.status !== "paused") {
        return;
    }
    timer.status = "running";
    timer.endAt =
        new Date(
            Date.now() + (Number(timer.remainingMs) || 0)
        ).toISOString();
    saveActiveWorkout(active);
    resumeRuntimeTimers();

}


function dismissRestTimer() {

    const active = getActiveWorkout();
    if (!active) {
        return;
    }
    active.restTimer = null;
    saveActiveWorkout(active);
    updateTimerDisplays();

}


function resumeRuntimeTimers() {

    clearInterval(workoutClockInterval);
    clearInterval(restClockInterval);

    if (!getActiveWorkout()) {
        return;
    }

    workoutClockInterval =
        setInterval(updateTimerDisplays, 1000);
    restClockInterval =
        setInterval(checkRestTimerExpiry, 500);
    updateTimerDisplays();
    checkRestTimerExpiry();

}


function updateTimerDisplays() {

    const active = getActiveWorkout();
    if (!active) {
        return;
    }

    const duration =
        formatDuration(
            getWorkoutElapsedMs(active)
        );

    document
        .querySelectorAll("[data-active-duration]")
        .forEach(element => {
            element.textContent = duration;
        });

    const durationDisplay =
        document.getElementById("workout-duration-display");
    if (durationDisplay) {
        durationDisplay.textContent = duration;
    }

    const pause =
        document.getElementById("pause-workout-timer");
    const resume =
        document.getElementById("resume-workout-timer");
    if (pause) {
        pause.hidden = Boolean(active.pausedAt);
    }
    if (resume) {
        resume.hidden = !active.pausedAt;
    }

    const restDisplay =
        document.getElementById("rest-timer-display");
    if (restDisplay) {
        const timer = active.restTimer;
        if (!timer) {
            restDisplay.textContent = "Ready";
        }
        else {
            const remaining =
                timer.status === "running"
                    ? Math.max(0, new Date(timer.endAt).getTime() - Date.now())
                    : Math.max(0, Number(timer.remainingMs) || 0);
            restDisplay.textContent =
                timer.status === "finished"
                    ? "Rest complete"
                    : `${timer.status === "paused" ? "Paused • " : ""}${formatCountdown(remaining)}`;
        }
    }

}


function checkRestTimerExpiry() {

    const active = getActiveWorkout();
    const timer = active?.restTimer;
    if (!timer || timer.status !== "running" || !timer.endAt) {
        updateTimerDisplays();
        return;
    }

    if (Date.now() < new Date(timer.endAt).getTime()) {
        updateTimerDisplays();
        return;
    }

    timer.status = "finished";
    timer.remainingMs = 0;
    timer.endAt = null;
    saveActiveWorkout(active);
    updateTimerDisplays();

    if (!timer.notified) {
        timer.notified = true;
        saveActiveWorkout(active);
        notifyRestComplete();
    }

}


async function requestNotificationPermission() {

    if (!("Notification" in window)) {
        window.alert(
            "Notifications are not supported in this browser. The in-app timer will still work."
        );
        return;
    }

    const permission =
        await Notification.requestPermission();
    window.alert(
        permission === "granted"
            ? "Rest-timer notifications enabled while supported by your browser."
            : "Notifications were not enabled. The in-app timer will still work."
    );

}


async function notifyRestComplete() {

    if (navigator.vibrate) {
        navigator.vibrate([180, 100, 180]);
    }

    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {
        try {
            const registration =
                await navigator.serviceWorker?.ready;
            if (registration) {
                await registration.showNotification(
                    "Rest complete",
                    {
                        body: "Your rest timer has finished.",
                        tag: "level-up-rest-timer",
                        renotify: true
                    }
                );
                return;
            }
            new Notification(
                "Rest complete",
                {
                    body: "Your rest timer has finished."
                }
            );
        }
        catch {
            // The in-app message below remains the fallback.
        }
    }

    const message =
        document.getElementById("session-message");
    if (message) {
        message.textContent =
            "Rest complete — ready for the next set.";
    }

}


function getPreviousPerformance(
    planId,
    dayIndex,
    exerciseId,
    equipmentProfileId = "default",
    excludedSessionId = null
) {

    const sessions =
        getSavedSessions()
            .filter(session =>
                session.id !== excludedSessionId &&
                session.planId === planId &&
                session.adaptiveGuidance?.isDeload !== true &&
                Number(session.trainingDayIndex) === Number(dayIndex)
            )
            .sort(compareSessionsNewest);

    for (const session of sessions) {
        const performance =
            session.exercises?.find(exercise =>
                exercise.exerciseId === exerciseId &&
                (exercise.equipmentProfileId || "default") === equipmentProfileId
            );
        if (performance) {
            return performance;
        }
    }
    return null;

}


function getInitialEquipmentProfile(exercise) {
    if (!supportsEquipmentProfiles(exercise)) return {};
    const profile = getLastEquipmentProfile(exercise.id);
    return {
        equipmentProfileId: profile.id,
        equipmentProfileName: profile.name
    };
}


function getSavedSessions() {

    try {
        const parsed =
            JSON.parse(
                localStorage.getItem(
                    SESSION_STORAGE_KEY
                ) ||
                "[]"
            );
        if (!Array.isArray(parsed)) return [];
        const repaired = repairWorkoutSessionList(parsed);
        if (repaired.changed) {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(repaired.sessions));
        }
        return repaired.sessions;
    }
    catch {
        return [];
    }

}


function getPlanForSession(session) {

    if (session.planSnapshot?.days?.length) {
        return clone(session.planSnapshot);
    }

    const plans =
        getStoredPlans();
    const plan =
        plans.find(item =>
            item.id === session.planId
        );
    if (plan) {
        return clone(plan);
    }

    const trainingDayIndex =
        Math.max(
            0,
            Number(session.trainingDayIndex) || 0
        );

    const fallbackDay = {
        name: session.trainingDayName || "Workout",
        exercises:
            (session.exercises || []).map(exercise => ({
                id: exercise.exerciseId,
                sets:
                    Math.max(1, exercise.sets?.length || 1),
                reps: "—"
            }))
    };

    return {
        id: session.planId || `history-plan-${session.id}`,
        name: session.planName || "Saved Workout",
        days:
            Array.from(
                { length: trainingDayIndex + 1 },
                (_, index) =>
                    index === trainingDayIndex
                        ? fallbackDay
                        : {
                            name: `Day ${index + 1}`,
                            exercises: []
                        }
            )
    };

}


function getStoredPlans() {
    try {
        const parsed =
            JSON.parse(
                localStorage.getItem(PLAN_STORAGE_KEY) || "[]"
            );
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}


function createEditableSession(session, plan) {

    return {
        ...clone(session),
        status: "completed",
        planSnapshot: clone(plan),
        accumulatedMs:
            Number(session.durationMs) ||
            Number(session.durationMinutes) * 60000 ||
            0,
        pausedAt: null,
        restTimer: null,
        exercises:
            (session.exercises || []).map(exercise => ({
                ...exercise,
                sets:
                    (exercise.sets || []).map(set => ({
                        ...normalizeSavedSet(set),
                        completed:
                            set.completed ??
                            (set.weight !== null || set.reps !== null)
                    }))
            }))
    };

}


function compareSessionsNewest(a, b) {
    return String(
        b.completedAt || b.updatedAt || b.date || ""
    ).localeCompare(
        String(a.completedAt || a.updatedAt || a.date || "")
    );
}


function formatCardioPrevious(previous) {
    if (!previous) {
        return "Hasn't started";
    }

    const details = [];

    if (Number(previous.durationMinutes) > 0) {
        details.push(`${previous.durationMinutes} min`);
    }

    if (String(previous.distance || "").trim()) {
        details.push(String(previous.distance).trim());
    }

    if (Number(previous.rpe) >= 1 && Number(previous.rpe) <= 10) {
        details.push(`RPE ${previous.rpe}`);
    }

    if (String(previous.notes || "").trim()) {
        details.push(String(previous.notes).trim());
    }

    return details.length
        ? details.join(" • ")
        : "No previous details recorded.";
}


function formatPrevious(previous) {
    const sets =
        previous?.sets
            ?.filter(set =>
                set.weight !== null || set.reps !== null
            )
            .map(set => {
                const rir = normalizeRirValue(set.rir);
                return `${formatPreviousWeight(set.weight)} × ${set.reps ?? "—"}${rir === null ? "" : ` · RIR ${rir >= 4 ? "4+" : rir}`}`;
            }) || [];
    return sets.length
        ? sets.join(" • ")
        : "No previous performance recorded.";
}

function formatPreviousSet(set) {
    const rir = normalizeRirValue(set.rir);
    const main = `${formatPreviousWeight(set.weight)} × ${set.reps ?? "—"}${rir === null ? "" : ` · RIR ${rir >= 4 ? "4+" : rir}`}`;
    const drops = (Array.isArray(set.dropSets) ? set.dropSets : [])
        .filter(drop => drop.weight !== null || drop.reps !== null)
        .map((drop, index) => `Drop ${index + 1}: ${formatPreviousWeight(drop.weight)} × ${drop.reps ?? "—"}`);
    return drops.length ? `${main}<small class="previous-drop-values">↳ ${drops.join(" · ")}</small>` : main;
}

function formatPreviousWeight(value) {
    return value === null || value === undefined || value === ""
        ? "—"
        : formatUnitMass(value, 1, UNIT_KINDS.LIFTING_WEIGHT);
}


function formatDuration(milliseconds) {
    const totalSeconds =
        Math.max(0, Math.floor(milliseconds / 1000));
    const hours =
        String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes =
        String(Math.floor(totalSeconds % 3600 / 60)).padStart(2, "0");
    const seconds =
        String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}


function formatCountdown(milliseconds) {
    const totalSeconds =
        Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes =
        String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds =
        String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}


function formatWorkoutDate(value) {
    if (!value) {
        return "Unknown date";
    }
    return new Date(`${value}T12:00:00`)
        .toLocaleDateString(
            undefined,
            { year: "numeric", month: "short", day: "numeric" }
        );
}


function getLocalDateValue() {
    const now = new Date();
    return new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    )
    .toISOString()
    .slice(0, 10);
}


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
