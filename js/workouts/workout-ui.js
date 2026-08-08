import {
    getAllExercises
}
from "./exercise-library.js";


import {
    presetPlans
}
from "./workout-plans.js";


export function renderWorkoutBuilder() {

    return `

        <section class="section-card workout-page">

            <div class="workout-page-title">

                <div>

                    <span class="eyebrow">
                        TRAINING
                    </span>

                    <h2>
                        💪 Workout
                    </h2>

                    <p class="section-description">
                        Build your program, choose a training day,
                        and record every set.
                    </p>

                </div>

            </div>


            <!-- CUSTOM PLANS -->

            <section class="workout-home-section">

                <div class="workout-section-heading">

                    <div>

                        <h3>
                            Custom Workout Plans
                        </h3>

                        <p>
                            Build and save your own weekly training programs.
                        </p>

                    </div>


                    <button
                        id="new-plan-btn"
                        class="primary-btn"
                        type="button"
                    >
                        + Create New Plan
                    </button>

                </div>


                <div
                    id="saved-plan-list"
                    class="workout-plan-grid"
                >

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

                </div>

            </section>


            <!-- LEVEL UP TEMPLATES -->

            <section class="workout-home-section">

                <div class="workout-section-heading">

                    <div>

                        <h3>
                            Level Up Templates
                        </h3>

                        <p>
                            Ready-made training structures that can
                            be customized to suit your program.
                        </p>

                    </div>

                </div>


                <div class="preset-grid">

                    ${presetPlans.map(
                        plan => `

                            <button
                                class="preset-plan-card"
                                data-plan-id="${plan.id}"
                                type="button"
                            >

                                <div class="template-card-top">

                                    <span class="plan-type-label">
                                        LEVEL UP TEMPLATE
                                    </span>

                                    <span class="template-frequency">
                                        ${plan.daysPerWeek}
                                        days/week
                                    </span>

                                </div>


                                <h4>
                                    ${plan.name}
                                </h4>


                                <p>
                                    ${plan.description}
                                </p>


                                <div class="template-details">

                                    <span>
                                        ⏱
                                        ${plan.estimatedMinutes}
                                        min
                                    </span>

                                    <span>
                                        ${plan.level}
                                    </span>

                                </div>


                                <div class="template-action">
                                    View & Customize →
                                </div>

                            </button>

                        `
                    ).join("")}

                </div>

            </section>


            <!-- BUILDER -->

            <section
                id="plan-builder"
                class="plan-builder"
                hidden
            >

                <div class="builder-heading">

                    <div>

                        <span class="eyebrow">
                            PLAN BUILDER
                        </span>

                        <h3>
                            Build Your Workout Plan
                        </h3>

                        <p>
                            Add your training days, exercises,
                            sets and target rep ranges.
                        </p>

                    </div>

                </div>


                <div class="builder-field">

                    <label for="plan-name">
                        Plan Name
                    </label>

                    <input
                        id="plan-name"
                        type="text"
                        placeholder="Example: My 4-Day Hypertrophy Plan"
                    >

                </div>


                <section
                    id="custom-exercise-form"
                    class="custom-exercise-form"
                    hidden
                >

                    <h4>Add Custom Exercise</h4>

                    <div class="custom-exercise-grid">

                        <label>
                            Exercise Name
                            <input
                                id="custom-exercise-name"
                                type="text"
                                placeholder="Example: Landmine Row"
                            >
                        </label>

                        <label>
                            Primary Muscle
                            <select id="custom-exercise-muscle">
                                <option>Chest</option>
                                <option>Back</option>
                                <option>Shoulders</option>
                                <option>Rear Delts</option>
                                <option>Biceps</option>
                                <option>Triceps</option>
                                <option>Quads</option>
                                <option>Hamstrings</option>
                                <option>Glutes</option>
                                <option>Calves</option>
                                <option>Core</option>
                                <option>Other</option>
                            </select>
                        </label>

                        <label>
                            Equipment
                            <select id="custom-exercise-equipment">
                                <option>Barbell</option>
                                <option>Dumbbells</option>
                                <option>Cable</option>
                                <option>Machine</option>
                                <option>Bodyweight</option>
                                <option>Other</option>
                            </select>
                        </label>

                        <label>
                            Exercise Type
                            <select id="custom-exercise-type">
                                <option value="compound">Compound</option>
                                <option value="isolation">Isolation</option>
                            </select>
                        </label>

                        <label>
                            Rep Range
                            <input
                                id="custom-exercise-reps"
                                type="text"
                                value="8-12"
                            >
                        </label>

                        <label>
                            Default Sets
                            <input
                                id="custom-exercise-sets"
                                type="number"
                                min="1"
                                max="10"
                                value="3"
                            >
                        </label>

                    </div>

                    <div class="builder-footer">

                        <button
                            id="save-custom-exercise-btn"
                            class="primary-btn"
                            type="button"
                        >
                            Add Exercise
                        </button>

                        <button
                            id="cancel-custom-exercise-btn"
                            class="secondary-btn"
                            type="button"
                        >
                            Cancel
                        </button>

                    </div>

                    <p
                        id="custom-exercise-message"
                        class="workout-message"
                        aria-live="polite"
                    ></p>

                </section>


                <div id="workout-days"></div>


                <div class="builder-footer">

                    <button
                        id="add-day-btn"
                        class="secondary-btn"
                        type="button"
                    >
                        + Add Training Day
                    </button>


                    <button
                        id="save-plan-btn"
                        class="primary-btn"
                        type="button"
                    >
                        Save Workout Plan
                    </button>

                </div>

            </section>


            <!-- RECENT WORKOUTS -->

            <section class="workout-home-section">

                <div class="workout-section-heading">

                    <div>

                        <h3>
                            Recent Workouts
                        </h3>

                        <p>
                            Completed training sessions will
                            appear here once workout logging is enabled.
                        </p>

                    </div>

                </div>


                <div class="workout-empty-state compact">

                    <p>
                        No completed workouts yet.
                    </p>

                </div>

            </section>


            <div
                id="workout-builder-message"
                class="workout-message"
                aria-live="polite"
            ></div>

        </section>

    `;

}



export function getExerciseOptions() {

    const allExercises =
        getAllExercises()
            .sort(
                (a, b) =>
                    a.muscleGroup.localeCompare(
                        b.muscleGroup
                    ) ||
                    a.name.localeCompare(
                        b.name
                    )
            );


    const groups =
        new Map();


    allExercises.forEach(exercise => {

        if (
            !groups.has(
                exercise.muscleGroup
            )
        ) {

            groups.set(
                exercise.muscleGroup,
                []
            );

        }


        groups.get(
            exercise.muscleGroup
        )
        .push(
            exercise
        );

    });


    return `
        <option value="">
            Choose Exercise
        </option>

        ${[
            ...groups.entries()
        ]
        .map(
            ([group, groupExercises]) => `
                <optgroup label="${escapeHtml(group)}">

                    ${groupExercises.map(exercise => `
                        <option value="${escapeHtml(exercise.id)}">
                            ${escapeHtml(exercise.name)}
                            ${exercise.isCustom ? " — Custom" : ""}
                        </option>
                    `).join("")}

                </optgroup>
            `
        )
        .join("")}

        <option
            value="__add_custom__"
        >
            + Add Custom Exercise
        </option>
    `;

}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
