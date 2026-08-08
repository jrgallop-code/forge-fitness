import {
    addCustomExercise,
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


import {
    getLastWorkoutForPlan,
    openWorkoutLogger
}
from "./workout-session.js";


const PLAN_STORAGE_KEY =
    "forge_workout_plans";


let workingPlan = {

    name: "",
    days: []

};


let customExerciseTarget =
    null;


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


    document
        .getElementById(
            "save-custom-exercise-btn"
        )
        ?.addEventListener(
            "click",
            saveCustomExercise
        );


    document
        .getElementById(
            "cancel-custom-exercise-btn"
        )
        ?.addEventListener(
            "click",
            hideCustomExerciseForm
        );


    renderSavedPlans();

}


function showCustomExerciseForm() {

    const form =
        document.getElementById(
            "custom-exercise-form"
        );


    if (form) {

        form.hidden =
            false;


        form.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });

    }

}


function hideCustomExerciseForm() {

    const form =
        document.getElementById(
            "custom-exercise-form"
        );


    if (form) {

        form.hidden =
            true;

    }


    customExerciseTarget =
        null;

}


function saveCustomExercise() {

    if (!customExerciseTarget) {
        return;
    }


    const name =
        document
            .getElementById(
                "custom-exercise-name"
            )
            ?.value
            .trim();


    const message =
        document.getElementById(
            "custom-exercise-message"
        );


    if (!name) {

        if (message) {

            message.textContent =
                "Enter an exercise name.";

        }


        return;

    }


    const exercise =
        addCustomExercise({

            name,

            muscleGroup:
                document
                    .getElementById(
                        "custom-exercise-muscle"
                    )
                    ?.value,

            equipment:
                document
                    .getElementById(
                        "custom-exercise-equipment"
                    )
                    ?.value,

            type:
                document
                    .getElementById(
                        "custom-exercise-type"
                    )
                    ?.value,

            recommendedReps:
                document
                    .getElementById(
                        "custom-exercise-reps"
                    )
                    ?.value,

            defaultSets:
                document
                    .getElementById(
                        "custom-exercise-sets"
                    )
                    ?.value

        });


    if (!exercise) {
        return;
    }


    const target =
        workingPlan
            .days[
                customExerciseTarget
                    .dayIndex
            ]
            ?.exercises[
                customExerciseTarget
                    .exerciseIndex
            ];


    if (target) {

        target.id =
            exercise.id;


        target.sets =
            exercise.defaultSets;


        target.reps =
            exercise.recommendedReps;

    }


    const nameInput =
        document.getElementById(
            "custom-exercise-name"
        );


    if (nameInput) {

        nameInput.value =
            "";

    }


    hideCustomExerciseForm();


    renderWorkoutDays();

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


                                        ${exercise?.trackingType === "notes"
                                            ? `
                                                <div class="exercise-prescription cardio-prescription">

                                                    <label>
                                                        Cardio Notes

                                                        <textarea
                                                            class="exercise-notes"
                                                            data-day-index="${dayIndex}"
                                                            data-exercise-index="${exerciseIndex}"
                                                            placeholder="Example: 20 min, 4 km, moderate pace, resistance 6"
                                                        >${plannedExercise.notes || ""}</textarea>
                                                    </label>

                                                </div>
                                            `
                                            : `
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
                                            `
                                        }


                                        <div class="exercise-recommendation">

                                            ${
                                                exercise
                                                    ? `
                                                        <span>
                                                            ${exercise.type}
                                                        </span>

                                                        <strong>
                                                            ${exercise.trackingType === "notes"
                                                                ? "Record the session details in your notes."
                                                                : `Suggested: ${exercise.recommendedReps} reps`
                                                            }
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

                        if (
                            select.value ===
                            "__add_custom__"
                        ) {

                            customExerciseTarget = {
                                dayIndex,
                                exerciseIndex
                            };


                            showCustomExerciseForm();


                            select.value =
                                current.id;


                            return;

                        }


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


                            current.notes =
                                current.notes ||
                                "";

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
            ".exercise-notes"
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
                            .notes =
                            input.value;

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


    renderSavedPlans(plans);


    showMessage(
        "Workout plan saved."
    );

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



function renderSavedPlans(
    suppliedPlans = null
) {

    const container =
        document.getElementById(
            "saved-plan-list"
        );


    if (!container) {
        return;
    }


    const plans =
        (
            Array.isArray(suppliedPlans)
                ? suppliedPlans
                : getSavedPlans()
        )
        .filter(plan =>
            plan &&
            typeof plan === "object"
        );


    container.replaceChildren();


    if (!plans.length) {

        container.innerHTML = `
            <div class="workout-empty-state">

                <div class="empty-state-icon">
                    ＋
                </div>

                <h4>
                    Your custom plans will appear here
                </h4>

                <p>
                    Create a plan from scratch or use a Forge
                    template as your starting point.
                </p>

            </div>
        `;


        return;

    }


    plans.forEach(plan => {

        const days =
            Array.isArray(plan.days)
                ? plan.days
                : [];


        const totalSets =
            days.reduce(
                (planTotal, day) => {

                    const exercises =
                        Array.isArray(
                            day?.exercises
                        )
                            ? day.exercises
                            : [];


                    return planTotal +
                        exercises.reduce(
                            (dayTotal, exercise) =>
                                dayTotal +
                                (
                                    Number(
                                        exercise?.sets
                                    ) ||
                                    0
                                ),
                            0
                        );

                },
                0
            );


        const card =
            document.createElement(
                "article"
            );


        card.className =
            "preset-plan-card";


        card.dataset.customPlanId =
            plan.id ||
            "";


        const label =
            document.createElement(
                "span"
            );


        label.className =
            "plan-type-label";


        label.textContent =
            "CUSTOM PLAN";


        const title =
            document.createElement(
                "h4"
            );


        title.textContent =
            plan.name ||
            "My Workout Plan";


        const summary =
            document.createElement(
                "p"
            );


        summary.textContent =
            `${days.length} ${days.length === 1
                ? "session"
                : "sessions"}/week • ${totalSets} planned working sets`;


        const lastSession =
            getLastWorkoutForPlan(
                plan.id
            );


        const lastWorkout =
            document.createElement(
                "p"
            );


        lastWorkout.className =
            "plan-last-workout";


        lastWorkout.textContent =
            lastSession
                ? `Last workout: ${formatPlanWorkoutDate(
                    lastSession.date
                )}`
                : "Hasn't started yet";


        const dayNames =
            document.createElement(
                "div"
            );


        dayNames.className =
            "template-details";


        dayNames.textContent =
            days
                .map(day =>
                    day?.name ||
                    "Unnamed Day"
                )
                .join(" • ") ||
            "No training days added";


        const editButton =
            document.createElement(
                "button"
            );


        editButton.className =
            "secondary-btn";


        editButton.type =
            "button";


        editButton.textContent =
            "Edit Plan";


        editButton.addEventListener(
            "click",
            () => {

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


                document
                    .getElementById(
                        "plan-builder"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

            }
        );


        const logButton =
            document.createElement(
                "button"
            );


        logButton.className =
            "primary-btn";


        logButton.type =
            "button";


        logButton.textContent =
            "Log a Workout";


        logButton.addEventListener(
            "click",
            () =>
                openWorkoutLogger(
                    plan
                )
        );


        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.className =
            "secondary-btn remove-exercise-btn";


        deleteButton.type =
            "button";


        deleteButton.textContent =
            "Delete Plan";


        deleteButton.addEventListener(
            "click",
            () => {

                const confirmed =
                    window.confirm(
                        `Delete "${plan.name || "My Workout Plan"}"? This cannot be undone.`
                    );


                if (!confirmed) {
                    return;
                }


                const updatedPlans =
                    getSavedPlans()
                        .filter(savedPlan =>
                            savedPlan.id !==
                            plan.id
                        );


                localStorage.setItem(
                    PLAN_STORAGE_KEY,
                    JSON.stringify(
                        updatedPlans
                    )
                );


                if (
                    workingPlan.id ===
                    plan.id
                ) {

                    workingPlan = {
                        name: "",
                        days: []
                    };


                    const builder =
                        document.getElementById(
                            "plan-builder"
                        );


                    if (builder) {

                        builder.hidden =
                            true;

                    }

                }


                renderSavedPlans(
                    updatedPlans
                );


                showMessage(
                    "Workout plan deleted."
                );

            }
        );


        const cardActions =
            document.createElement(
                "div"
            );


        cardActions.className =
            "builder-footer";


        cardActions.append(
            logButton,
            editButton,
            deleteButton
        );


        card.append(
            label,
            title,
            summary,
            lastWorkout,
            dayNames,
            cardActions
        );


        container.appendChild(
            card
        );

    });

}



function formatPlanWorkoutDate(
    dateValue
) {

    if (!dateValue) {
        return "Unknown date";
    }


    return new Intl.DateTimeFormat(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    )
    .format(
        new Date(
            `${dateValue}T00:00:00`
        )
    );

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