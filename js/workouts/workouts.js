import {
    getExerciseById
}
from "./exercise-library.js";


import {
    getPresetPlan
}
from "./workout-plans.js";


import {
    getExerciseOptions
}
from "./workout-ui.js";


const PLAN_STORAGE_KEY =
    "forge_workout_plans";


let workingPlan = {

    name: "",
    days: []

};


export function initializeWorkoutBuilder() {

    document
        .getElementById(
            "new-plan-btn"
        )
        ?.addEventListener(
            "click",
            createNewPlan
        );


    document
        .querySelectorAll(
            ".preset-plan-card"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        loadPreset(
                            button.dataset.planId
                        );

                    }
                );

            }
        );


    document
        .getElementById(
            "add-day-btn"
        )
        ?.addEventListener(
            "click",
            addWorkoutDay
        );


    document
        .getElementById(
            "save-plan-btn"
        )
        ?.addEventListener(
            "click",
            savePlan
        );


    renderSavedPlans();

}


function createNewPlan() {

    workingPlan = {

        name: "",
        days: []

    };


    showBuilder();


    addWorkoutDay();

}


function loadPreset(planId) {

    const preset =
        getPresetPlan(
            planId
        );


    if (!preset) {
        return;
    }


    workingPlan =
        JSON.parse(
            JSON.stringify(
                preset
            )
        );


    delete workingPlan.id;


    showBuilder();


    const nameInput =
        document.getElementById(
            "plan-name"
        );


    if (nameInput) {

        nameInput.value =
            workingPlan.name;

    }


    renderWorkoutDays();

}


function showBuilder() {

    const builder =
        document.getElementById(
            "plan-builder"
        );


    if (builder) {

        builder.hidden =
            false;

    }

}


function addWorkoutDay() {

    workingPlan.days.push({

        name:
            `Day ${workingPlan.days.length + 1}`,

        exercises: []

    });


    renderWorkoutDays();

}


function addExercise(dayIndex) {

    workingPlan
        .days[dayIndex]
        .exercises
        .push({

            id: "",

            sets: 3,

            reps: ""

        });


    renderWorkoutDays();

}


function removeExercise(
    dayIndex,
    exerciseIndex
) {

    workingPlan
        .days[dayIndex]
        .exercises
        .splice(
            exerciseIndex,
            1
        );


    renderWorkoutDays();

}


function renderWorkoutDays() {

    const container =
        document.getElementById(
            "workout-days"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        workingPlan.days.map(
            (day, dayIndex) => `

                <div class="workout-day-card">

                    <input
                        class="day-name-input"
                        data-day-index="${dayIndex}"
                        type="text"
                        value="${day.name}"
                    >


                    <div class="exercise-builder-list">

                        ${day.exercises.map(
                            (
                                plannedExercise,
                                exerciseIndex
                            ) => {

                                const exercise =
                                    getExerciseById(
                                        plannedExercise.id
                                    );


                                return `

                                    <div class="exercise-builder-row">

                                        <select
                                            class="exercise-select"
                                            data-day-index="${dayIndex}"
                                            data-exercise-index="${exerciseIndex}"
                                        >

                                            ${getExerciseOptions()}

                                        </select>


                                        <div class="exercise-prescription">

                                            <label>
                                                Sets

                                                <input
                                                    class="exercise-sets"
                                                    data-day-index="${dayIndex}"
                                                    data-exercise-index="${exerciseIndex}"
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value="${plannedExercise.sets}"
                                                >
                                            </label>


                                            <label>
                                                Reps

                                                <input
                                                    class="exercise-reps"
                                                    data-day-index="${dayIndex}"
                                                    data-exercise-index="${exerciseIndex}"
                                                    type="text"
                                                    value="${plannedExercise.reps}"
                                                    placeholder="8-12"
                                                >
                                            </label>

                                        </div>


                                        <div class="exercise-recommendation">

                                            ${
                                                exercise
                                                    ? `
                                                        <span>
                                                            ${exercise.type}
                                                        </span>

                                                        <strong>
                                                            Suggested:
                                                            ${exercise.recommendedReps}
                                                            reps
                                                        </strong>
                                                    `
                                                    : `
                                                        Choose an exercise
                                                        to see recommendations.
                                                    `
                                            }

                                        </div>


                                        <button
                                            class="remove-exercise-btn"
                                            data-day-index="${dayIndex}"
                                            data-exercise-index="${exerciseIndex}"
                                            type="button"
                                        >
                                            Remove
                                        </button>

                                    </div>

                                `;

                            }
                        ).join("")}

                    </div>


                    <button
                        class="add-exercise-btn secondary-btn"
                        data-day-index="${dayIndex}"
                        type="button"
                    >
                        + Add Exercise
                    </button>

                </div>

            `
        ).join("");


    attachBuilderListeners();

}



function attachBuilderListeners() {

    document
        .querySelectorAll(
            ".add-exercise-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        addExercise(
                            Number(
                                button.dataset.dayIndex
                            )
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".remove-exercise-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        removeExercise(

                            Number(
                                button.dataset.dayIndex
                            ),

                            Number(
                                button.dataset.exerciseIndex
                            )

                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".exercise-select"
        )
        .forEach(
            select => {

                const dayIndex =
                    Number(
                        select.dataset.dayIndex
                    );


                const exerciseIndex =
                    Number(
                        select.dataset.exerciseIndex
                    );


                const current =
                    workingPlan
                        .days[dayIndex]
                        .exercises[
                            exerciseIndex
                        ];


                select.value =
                    current.id;


                select.addEventListener(
                    "change",
                    () => {

                        const exercise =
                            getExerciseById(
                                select.value
                            );


                        current.id =
                            select.value;


                        if (exercise) {

                            current.sets =
                                exercise.defaultSets;


                            current.reps =
                                exercise.recommendedReps;

                        }


                        renderWorkoutDays();

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".exercise-sets"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "change",
                    () => {

                        const dayIndex =
                            Number(
                                input.dataset.dayIndex
                            );


                        const exerciseIndex =
                            Number(
                                input.dataset.exerciseIndex
                            );


                        workingPlan
                            .days[dayIndex]
                            .exercises[
                                exerciseIndex
                            ]
                            .sets =
                            Number(
                                input.value
                            );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".exercise-reps"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "change",
                    () => {

                        const dayIndex =
                            Number(
                                input.dataset.dayIndex
                            );


                        const exerciseIndex =
                            Number(
                                input.dataset.exerciseIndex
                            );


                        workingPlan
                            .days[dayIndex]
                            .exercises[
                                exerciseIndex
                            ]
                            .reps =
                            input.value;

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".day-name-input"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "change",
                    () => {

                        workingPlan
                            .days[
                                Number(
                                    input.dataset.dayIndex
                                )
                            ]
                            .name =
                            input.value;

                    }
                );

            }
        );

}



function savePlan() {

    const nameInput =
        document.getElementById(
            "plan-name"
        );


    workingPlan.name =
        nameInput?.value.trim() ||
        "My Workout Plan";


    const plans =
        getSavedPlans();


    workingPlan.id =
        workingPlan.id ||
        `plan-${Date.now()}`;


    const existingIndex =
        plans.findIndex(
            plan =>
                plan.id ===
                workingPlan.id
        );


    if (existingIndex >= 0) {

        plans[existingIndex] =
            workingPlan;

    }

    else {

        plans.push(
            workingPlan
        );

    }


    localStorage.setItem(
        PLAN_STORAGE_KEY,
        JSON.stringify(plans)
    );


    showMessage(
        "Workout plan saved."
    );


    renderSavedPlans();

}



function getSavedPlans() {

    const stored =
        localStorage.getItem(
            PLAN_STORAGE_KEY
        );


    if (!stored) {
        return [];
    }


    try {

        const plans =
            JSON.parse(stored);


        return Array.isArray(plans)
            ? plans
            : [];

    }

    catch {

        return [];

    }

}



function renderSavedPlans() {

    const container =
        document.getElementById(
            "saved-plans-list"
        );


    if (!container) {
        return;
    }


    const plans =
        getSavedPlans();


    if (!plans.length) {

        container.innerHTML = `
            <p class="empty-state">
                No custom plans yet. Create a plan or use a Forge template.
            </p>
        `;

        return;

    }


    container.innerHTML =
        plans.map(plan => {

            const days =
                Array.isArray(plan.days)
                    ? plan.days
                    : [];


            const totalSets =
                days.reduce(
                    (planTotal, day) =>
                        planTotal +
                        (
                            Array.isArray(day.exercises)
                                ? day.exercises.reduce(
                                    (dayTotal, exercise) =>
                                        dayTotal +
                                        (
                                            Number(exercise.sets) ||
                                            0
                                        ),
                                    0
                                )
                                : 0
                        ),
                    0
                );


            const dayNames =
                days
                    .map(day =>
                        escapeHtml(
                            day.name ||
                            "Unnamed Day"
                        )
                    )
                    .join(" • ");


            return `
                <article class="preset-plan-card">

                    <strong>
                        ${escapeHtml(
                            plan.name ||
                            "My Workout Plan"
                        )}
                    </strong>

                    <span>
                        ${days.length}
                        ${days.length === 1
                            ? "session"
                            : "sessions"}/week
                    </span>

                    <span>
                        ${totalSets} planned working sets
                    </span>

                    <small>
                        ${dayNames || "No training days added"}
                    </small>

                    <button
                        class="edit-saved-plan-btn secondary-btn"
                        data-plan-id="${escapeHtml(plan.id || "")}"
                        type="button"
                    >
                        Edit Plan
                    </button>

                </article>
            `;

        }).join("");


    document
        .querySelectorAll(
            ".edit-saved-plan-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const plan =
                        plans.find(
                            savedPlan =>
                                savedPlan.id ===
                                button.dataset.planId
                        );


                    if (!plan) {
                        return;
                    }


                    workingPlan =
                        JSON.parse(
                            JSON.stringify(
                                plan
                            )
                        );


                    showBuilder();


                    const nameInput =
                        document.getElementById(
                            "plan-name"
                        );


                    if (nameInput) {

                        nameInput.value =
                            workingPlan.name ||
                            "";

                    }


                    renderWorkoutDays();

                }
            );

        });

}



function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



function showMessage(message) {

    const element =
        document.getElementById(
            "workout-builder-message"
        );


    if (element) {

        element.textContent =
            message;

    }

}