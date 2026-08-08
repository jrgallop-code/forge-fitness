import {
    getExerciseById
}
from "./exercise-library.js";

import {
    getExerciseOptions
}
from "./workout-ui.js";


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

    resumeRuntimeTimers();

}


export function initializeActiveWorkoutUI() {

    renderActiveWorkoutBanner();
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
                <strong id="workout-duration-display">00:00:00</strong>
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


    document
        .querySelector(".workout-page")
        ?.appendChild(logger);


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

    logger.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

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
                    trackingType: "notes",
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
                trackingType: "reps",
                sets:
                    Array.from(
                        { length: setCount },
                        () => ({
                            weight: null,
                            reps: null,
                            completed: false
                        })
                    )
            };
        });

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


    container.innerHTML = `
        ${editingSessionId ? "" : renderRestTimerPanel(session)}

        ${editingSessionId ? renderEditWorkoutExerciseControls() : ""}

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
                    editingSessionId
                );

            if (state.trackingType === "notes") {
                return `
                    <article class="session-exercise-card cardio-session-card" data-exercise-index="${exerciseIndex}" data-exercise-id="${escapeHtml(plannedExercise.id || "")}" data-tracking-type="notes">
                        <h4>${escapeHtml(exercise?.name || "Cardio")}</h4>
                        <p class="session-target">Record time, distance, pace or useful details.</p>
                        <div class="previous-performance"><strong>Previous workout</strong><span>${escapeHtml(previous?.notes || "Hasn't started")}</span></div>
                        <label class="cardio-notes-label">Today's notes
                            <textarea class="session-cardio-notes" maxlength="500">${escapeHtml(state.notes || "")}</textarea>
                        </label>
                        ${editingSessionId ? '<button class="remove-session-exercise secondary-btn" type="button">Remove Exercise</button>' : ""}
                    </article>
                `;
            }

            return `
                <article class="session-exercise-card" data-exercise-index="${exerciseIndex}" data-exercise-id="${escapeHtml(plannedExercise.id || "")}" data-tracking-type="reps">
                    <h4>${escapeHtml(exercise?.name || "Exercise")}</h4>
                    <p class="session-target">Target: ${state.sets.length} sets × ${escapeHtml(plannedExercise.reps || "—")} reps</p>
                    ${editingSessionId ? `
                        <div class="routine-set-editor">
                            <strong>${state.sets.length} ${state.sets.length === 1 ? "set" : "sets"}</strong>
                            <button class="remove-session-set secondary-btn" type="button" ${state.sets.length <= 1 ? "disabled" : ""} aria-label="Remove one set">− Set</button>
                            <button class="add-session-set primary-btn" type="button" aria-label="Add one set">+ Set</button>
                        </div>
                    ` : ""}
                    <div class="previous-performance"><strong>Previous workout</strong><span>${formatPrevious(previous)}</span></div>
                    <div class="session-set-header"><span>Set</span><span>Last Workout</span><span>Weight</span><span>Reps</span></div>
                    ${state.sets.map((set, setIndex) => {
                        const previousSet =
                            previous?.sets?.[setIndex];
                        return `
                            <div class="session-set-row ${set.completed ? "completed" : ""}" data-set-index="${setIndex}">
                                <strong>${setIndex + 1}</strong>
                                <span class="previous-set-value">${previousSet ? `${previousSet.weight ?? "—"} × ${previousSet.reps ?? "—"}` : "Hasn't started"}</span>
                                <input class="session-weight" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weight ?? ""}" placeholder="${previousSet?.weight ?? "Weight"}" aria-label="Set ${setIndex + 1} weight">
                                <input class="session-reps" type="number" inputmode="numeric" min="0" step="1" value="${set.reps ?? ""}" placeholder="${previousSet?.reps ?? "Reps"}" aria-label="Set ${setIndex + 1} reps">
                                <button class="complete-set-btn secondary-btn" type="button">${set.completed ? "✓ Completed" : "Complete Set"}</button>
                            </div>
                        `;
                    }).join("")}
                    ${editingSessionId ? `
                        <div class="edit-session-exercise-actions">
                            <button class="remove-session-exercise secondary-btn" type="button">Remove Exercise</button>
                        </div>
                    ` : ""}
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

    logger
        .querySelector("#save-session-btn")
        ?.addEventListener(
            "click",
            () =>
                saveCompletedSession({
                    plan,
                    logger,
                    session,
                    editingSessionId
                })
        );

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


function renderEditWorkoutExerciseControls() {

    return `
        <section class="edit-workout-exercises">
            <div>
                <span class="eyebrow">WORKOUT ROUTINE</span>
                <h4>Add exercises and sets</h4>
                <p>Build out this workout just like a new routine. Use the set controls on each exercise below.</p>
            </div>
            <label>
                Exercise
                <select id="history-add-exercise-select">
                    ${getExerciseOptions()}
                </select>
            </label>
            <label>
                Sets
                <input id="history-add-exercise-sets" type="number" inputmode="numeric" min="1" max="20" step="1" value="3">
            </label>
            <label>
                Target reps
                <input id="history-add-exercise-reps" type="text" maxlength="20" value="8-12" placeholder="8-12">
            </label>
            <button id="history-add-exercise-btn" class="primary-btn" type="button">+ Add Exercise</button>
        </section>
    `;

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

    logger
        .querySelector("#history-add-exercise-btn")
        ?.addEventListener(
            "click",
            () => {
                const exerciseId =
                    logger.querySelector("#history-add-exercise-select")?.value;
                const exercise =
                    getExerciseById(exerciseId);

                if (!exercise) {
                    return;
                }

                const setCount =
                    Math.min(
                        20,
                        Math.max(
                            1,
                            Number(logger.querySelector("#history-add-exercise-sets")?.value) || 3
                        )
                    );
                const targetReps =
                    logger.querySelector("#history-add-exercise-reps")?.value.trim() ||
                    exercise.recommendedReps ||
                    "8-12";
                const plannedExercise = {
                    id: exercise.id,
                    sets: exercise.trackingType === "notes" ? 1 : setCount,
                    reps: targetReps
                };

                day.exercises.push(plannedExercise);
                session.exercises.push(
                    createExerciseState({
                        exercises: [plannedExercise]
                    })[0]
                );
                session.planSnapshot =
                    clone(plan);

                renderSessionExercises({
                    plan,
                    logger,
                    session,
                    editingSessionId
                });
            }
        );

    logger
        .querySelectorAll(".session-exercise-card")
        .forEach(card => {
            const exerciseIndex =
                Number(card.dataset.exerciseIndex);

            card
                .querySelector(".add-session-set")
                ?.addEventListener(
                    "click",
                    () => {
                        const state =
                            session.exercises[exerciseIndex];
                        const plannedExercise =
                            day.exercises[exerciseIndex];

                        state.sets.push({
                            weight: null,
                            reps: null,
                            completed: false
                        });
                        plannedExercise.sets =
                            state.sets.length;
                        session.planSnapshot =
                            clone(plan);

                        renderSessionExercises({
                            plan,
                            logger,
                            session,
                            editingSessionId
                        });
                    }
                );

            card
                .querySelector(".remove-session-set")
                ?.addEventListener(
                    "click",
                    () => {
                        const state =
                            session.exercises[exerciseIndex];

                        if (state.sets.length <= 1) {
                            return;
                        }

                        state.sets.pop();
                        day.exercises[exerciseIndex].sets =
                            state.sets.length;
                        session.planSnapshot =
                            clone(plan);

                        renderSessionExercises({
                            plan,
                            logger,
                            session,
                            editingSessionId
                        });
                    }
                );

            card
                .querySelector(".remove-session-exercise")
                ?.addEventListener(
                    "click",
                    () => {
                        const exerciseName =
                            getExerciseById(card.dataset.exerciseId)?.name ||
                            "this exercise";
                        const confirmed =
                            window.confirm(
                                `Remove ${exerciseName} and its recorded data from this workout?`
                            );

                        if (!confirmed) {
                            return;
                        }

                        day.exercises.splice(exerciseIndex, 1);
                        session.exercises.splice(exerciseIndex, 1);
                        session.planSnapshot =
                            clone(plan);

                        renderSessionExercises({
                            plan,
                            logger,
                            session,
                            editingSessionId
                        });
                    }
                );
        });

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


    logger
        .querySelectorAll(".session-exercise-card")
        .forEach(card => {
            const exerciseIndex =
                Number(card.dataset.exerciseIndex);

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
                                set.weight =
                                    event.target.value === ""
                                        ? null
                                        : Number(event.target.value);
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

    return Number(select?.value) || 90;

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
            clone(session.exercises || [])
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
    if (!active) {
        return;
    }
    active.restTimer = {
        status: "running",
        durationSeconds: seconds,
        endAt:
            new Date(Date.now() + seconds * 1000).toISOString(),
        remainingMs:
            seconds * 1000,
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
    excludedSessionId = null
) {

    const sessions =
        getSavedSessions()
            .filter(session =>
                session.id !== excludedSessionId &&
                session.planId === planId &&
                Number(session.trainingDayIndex) === Number(dayIndex)
            )
            .sort(compareSessionsNewest);

    for (const session of sessions) {
        const performance =
            session.exercises?.find(exercise =>
                exercise.exerciseId === exerciseId
            );
        if (performance) {
            return performance;
        }
    }
    return null;

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
        return Array.isArray(parsed)
            ? parsed
            : [];
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
                        ...set,
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


function formatPrevious(previous) {
    const sets =
        previous?.sets
            ?.filter(set =>
                set.weight !== null || set.reps !== null
            )
            .map(set =>
                `${set.weight ?? "—"} × ${set.reps ?? "—"}`
            ) || [];
    return sets.length
        ? sets.join(" • ")
        : "No previous performance recorded.";
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
