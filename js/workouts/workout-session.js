import {
    getExerciseById
}
from "./exercise-library.js";


const SESSION_STORAGE_KEY =
    "forge_workout_sessions";


export function openWorkoutLogger(plan) {

    const days =
        Array.isArray(plan?.days)
            ? plan.days
            : [];


    if (!days.length) {

        window.alert(
            "Add at least one training day before logging a workout."
        );

        return;

    }


    document
        .getElementById(
            "workout-session-logger"
        )
        ?.remove();


    const logger =
        document.createElement(
            "section"
        );


    logger.id =
        "workout-session-logger";


    logger.className =
        "plan-builder workout-session-logger";


    logger.innerHTML = `
        <div class="builder-heading">

            <span class="eyebrow">
                ACTIVE WORKOUT
            </span>

            <h3>
                Log a Workout — ${escapeHtml(
                    plan.name ||
                    "My Workout Plan"
                )}
            </h3>

            <p>
                Select a training day and date, then record each set.
            </p>

        </div>

        <div class="workout-start-fields">

            <label>
                Training Day

                <select id="session-day-select">

                    ${days.map(
                        (day, index) => `
                            <option value="${index}">
                                ${escapeHtml(
                                    day.name ||
                                    `Day ${index + 1}`
                                )}
                            </option>
                        `
                    ).join("")}

                </select>

            </label>

            <label>
                Workout Date

                <input
                    id="session-date"
                    type="date"
                    value="${getLocalDateValue()}"
                >
            </label>

        </div>

        <button
            id="begin-session-btn"
            class="primary-btn"
            type="button"
        >
            Begin Workout
        </button>

        <div id="session-exercises"></div>

        <div
            id="session-message"
            class="workout-message"
            aria-live="polite"
        ></div>
    `;


    const builder =
        document.getElementById(
            "plan-builder"
        );


    if (builder) {

        builder.insertAdjacentElement(
            "afterend",
            logger
        );

    }

    else {

        document
            .querySelector(
                ".workout-page"
            )
            ?.appendChild(
                logger
            );

    }


    document
        .getElementById(
            "begin-session-btn"
        )
        ?.addEventListener(
            "click",
            () =>
                renderSessionExercises(
                    plan,
                    logger
                )
        );


    logger.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}



function renderSessionExercises(
    plan,
    logger
) {

    const daySelect =
        logger.querySelector(
            "#session-day-select"
        );


    const dateInput =
        logger.querySelector(
            "#session-date"
        );


    const dayIndex =
        Number(
            daySelect?.value ||
            0
        );


    const day =
        plan.days[dayIndex];


    const date =
        dateInput?.value ||
        getLocalDateValue();


    const exercises =
        Array.isArray(day?.exercises)
            ? day.exercises
            : [];


    const container =
        logger.querySelector(
            "#session-exercises"
        );


    if (!container) {
        return;
    }


    if (!exercises.length) {

        container.innerHTML = `
            <p class="workout-message">
                This training day has no exercises yet.
            </p>
        `;

        return;

    }


    container.innerHTML =
        exercises.map(
            (
                plannedExercise,
                exerciseIndex
            ) => {

                const exercise =
                    getExerciseById(
                        plannedExercise.id
                    );


                const previous =
                    getPreviousPerformance(
                        plan.id,
                        dayIndex,
                        plannedExercise.id
                    );


                const plannedSets =
                    Math.max(
                        1,
                        Number(
                            plannedExercise.sets
                        ) ||
                        1
                    );


                return `
                    <article
                        class="session-exercise-card"
                        data-exercise-index="${exerciseIndex}"
                        data-exercise-id="${escapeHtml(
                            plannedExercise.id ||
                            ""
                        )}"
                    >

                        <h4>
                            ${escapeHtml(
                                exercise?.name ||
                                "Exercise"
                            )}
                        </h4>

                        <p class="session-target">
                            Target:
                            ${plannedSets} sets ×
                            ${escapeHtml(
                                plannedExercise.reps ||
                                "—"
                            )} reps
                        </p>

                        <div class="previous-performance">

                            <strong>
                                Previous workout
                            </strong>

                            <span>
                                ${formatPrevious(
                                    previous
                                )}
                            </span>

                        </div>

                        <div class="session-set-header">

                            <span>Set</span>
                            <span>Weight</span>
                            <span>Reps</span>

                        </div>

                        ${Array.from(
                            {
                                length:
                                    plannedSets
                            },
                            (_, setIndex) => {

                                const previousSet =
                                    previous?.sets?.[
                                        setIndex
                                    ];


                                return `
                                    <div
                                        class="session-set-row"
                                        data-set-index="${setIndex}"
                                    >

                                        <strong>
                                            ${setIndex + 1}
                                        </strong>

                                        <input
                                            class="session-weight"
                                            type="number"
                                            inputmode="decimal"
                                            min="0"
                                            step="0.5"
                                            placeholder="${previousSet?.weight ?? "Weight"}"
                                            aria-label="Set ${setIndex + 1} weight"
                                        >

                                        <input
                                            class="session-reps"
                                            type="number"
                                            inputmode="numeric"
                                            min="0"
                                            step="1"
                                            placeholder="${previousSet?.reps ?? "Reps"}"
                                            aria-label="Set ${setIndex + 1} reps"
                                        >

                                    </div>
                                `;

                            }
                        ).join("")}

                    </article>
                `;

            }
        ).join("") +
        `
            <button
                id="save-session-btn"
                class="primary-btn"
                type="button"
            >
                Save Completed Workout
            </button>
        `;


    logger
        .querySelector(
            "#save-session-btn"
        )
        ?.addEventListener(
            "click",
            () =>
                saveCompletedSession({
                    plan,
                    day,
                    dayIndex,
                    date,
                    logger
                })
        );

}



function saveCompletedSession({
    plan,
    day,
    dayIndex,
    date,
    logger
}) {

    const exerciseCards =
        [
            ...logger.querySelectorAll(
                ".session-exercise-card"
            )
        ];


    const completedExercises =
        exerciseCards.map(card => ({

            exerciseId:
                card.dataset.exerciseId,

            sets:
                [
                    ...card.querySelectorAll(
                        ".session-set-row"
                    )
                ]
                .map(row => {

                    const weightValue =
                        row.querySelector(
                            ".session-weight"
                        )?.value;


                    const repsValue =
                        row.querySelector(
                            ".session-reps"
                        )?.value;


                    return {

                        weight:
                            weightValue === ""
                                ? null
                                : Number(
                                    weightValue
                                ),

                        reps:
                            repsValue === ""
                                ? null
                                : Number(
                                    repsValue
                                )

                    };

                })

        }));


    const sessions =
        getSavedSessions();


    sessions.push({

        id:
            `session-${Date.now()}`,

        date,

        planId:
            plan.id,

        planName:
            plan.name,

        trainingDayIndex:
            dayIndex,

        trainingDayName:
            day?.name ||
            `Day ${dayIndex + 1}`,

        completedAt:
            new Date().toISOString(),

        exercises:
            completedExercises

    });


    localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(
            sessions
        )
    );


    const message =
        logger.querySelector(
            "#session-message"
        );


    if (message) {

        message.textContent =
            "Workout saved. Previous performance will appear the next time you log this training day.";

    }

}



function getPreviousPerformance(
    planId,
    dayIndex,
    exerciseId
) {

    const matchingSessions =
        getSavedSessions()
            .filter(session =>
                session.planId ===
                    planId &&
                Number(
                    session.trainingDayIndex
                ) ===
                    Number(dayIndex)
            )
            .sort(
                (a, b) =>
                    String(
                        b.completedAt ||
                        b.date
                    )
                    .localeCompare(
                        String(
                            a.completedAt ||
                            a.date
                        )
                    )
            );


    for (
        const session
        of matchingSessions
    ) {

        const performance =
            session.exercises
                ?.find(
                    exercise =>
                        exercise.exerciseId ===
                        exerciseId
                );


        if (performance) {
            return performance;
        }

    }


    return null;

}



function getSavedSessions() {

    const stored =
        localStorage.getItem(
            SESSION_STORAGE_KEY
        );


    if (!stored) {
        return [];
    }


    try {

        const sessions =
            JSON.parse(
                stored
            );


        return Array.isArray(
            sessions
        )
            ? sessions
            : [];

    }

    catch {

        return [];

    }

}



function formatPrevious(previous) {

    if (
        !previous ||
        !Array.isArray(
            previous.sets
        )
    ) {

        return "No previous performance recorded.";

    }


    const completedSets =
        previous.sets
            .filter(set =>
                set.weight !== null ||
                set.reps !== null
            )
            .map(set =>
                `${set.weight ?? "—"} × ${set.reps ?? "—"}`
            );


    return completedSets.length
        ? completedSets.join(" • ")
        : "No previous performance recorded.";

}



function getLocalDateValue() {

    const now =
        new Date();


    const offset =
        now.getTimezoneOffset() *
        60000;


    return new Date(
        now.getTime() -
        offset
    )
    .toISOString()
    .slice(0, 10);

}



function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
