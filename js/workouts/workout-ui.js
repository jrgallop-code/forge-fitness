import {
    getAllExercises
}
from "./exercise-library.js?v=exercise-library-catalogue-1";


import {
    presetPlans
}
from "./workout-plans.js?v=workout-plans-2";


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


            <div data-workout-home>
                <details class="workout-home-section form-coach-beta" data-form-coach>
                    <summary class="form-coach-summary">
                        <span class="catalogue-summary-copy">
                            <span class="eyebrow">VIDEO REVIEW <span class="form-coach-beta-badge">BETA</span></span>
                            <strong>Form Coach</strong>
                            <small>Review a lift video with exercise-specific technique prompts.</small>
                        </span>
                        <span class="secondary-btn catalogue-summary-action">Try Beta</span>
                    </summary>

                    <div class="form-coach-body">
                        <div class="form-coach-notice">
                            <strong>Private test version</strong>
                            <p>Your video stays on this device and disappears when you leave this screen. It is not uploaded, saved, exported, or included in analytics.</p>
                        </div>

                        <div class="form-coach-fields">
                            <label>
                                Exercise
                                <select data-form-coach-exercise>
                                    ${getAllExercises()
                        .filter(exercise => exercise.trackingType === "reps")
                        .map(exercise => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`)
                        .join("")}
                                </select>
                            </label>
                            <label>
                                Camera angle
                                <select data-form-coach-angle>
                                    <option value="side">Side</option>
                                    <option value="front">Front</option>
                                    <option value="rear">Rear</option>
                                </select>
                            </label>
                        </div>

                        <label class="form-coach-upload">
                            <span>Choose or record a short video</span>
                            <input type="file" accept="video/*" data-form-coach-video>
                            <small>Choose an existing clip from your photo library or files, or record a new one. For a useful review, show the full body and equipment for 3–5 repetitions.</small>
                        </label>

                        <div class="form-coach-preview" data-form-coach-preview hidden>
                            <video controls playsinline preload="metadata" data-form-coach-player></video>
                            <p data-form-coach-file></p>
                            <button class="primary-btn" type="button" data-form-coach-review>Show review checklist</button>
                        </div>

                        <div class="form-coach-feedback" data-form-coach-feedback hidden aria-live="polite"></div>

                        <p class="form-coach-limit"><b>Beta limitation:</b> this version helps you review the clip but does not yet automatically interpret body position. It cannot diagnose pain or injury and is not a substitute for an in-person qualified coach.</p>
                    </div>
                </details>


                <!-- MY WORKOUTS -->

                <section class="workout-home-section">

                    <div class="workout-section-heading compact-workout-heading">

                        <div>

                            <h3>My Workouts</h3>

                            <p>Your saved plans, ready when you are.</p>

                        </div>

                        <button id="new-plan-btn" class="secondary-btn" type="button">
                            + Create
                        </button>

                    </div>

                    <div id="saved-plan-list" class="workout-plan-grid is-collapsed">

                        <div class="workout-empty-state">

                            <div class="empty-state-icon">＋</div>

                            <h4>Your workouts will appear here</h4>

                            <p>Create a plan or start with a Level Up template.</p>

                        </div>

                    </div>

                    <button class="workout-text-action" type="button" data-workout-view-all hidden>
                        View All Workouts
                    </button>

                </section>

                <!-- NATIVE EXPANDABLE CATALOGUE -->

                <details class="workout-home-section workout-catalogue-details">

                    <summary class="catalogue-summary">

                        <span class="catalogue-summary-copy">

                            <span class="eyebrow">WORKOUT CATALOGUE</span>

                            <strong>Find Your Next Plan</strong>

                            <small>Browse by schedule, equipment and workout length.</small>

                        </span>

                        <span class="primary-btn catalogue-summary-action">Browse Templates</span>

                    </summary>

                    <div class="workout-catalogue-view" data-catalogue-view>

                        <div class="workout-catalogue-title">

                            <span class="eyebrow">LEVEL UP</span>

                            <h3>Workout Catalogue</h3>

                            <p>Choose a structure, preview it, then customize it.</p>

                        </div>

                <div class="catalogue-filter-row">

                    <select data-catalogue-type aria-label="Filter by workout type">
                        <option value="">Any type</option>
                        <option value="hypertrophy">Hypertrophy</option>
                        <option value="hybrid">Hybrid (Weights + Cardio)</option>
                        <option value="cardio">Cardio</option>
                    </select>


                    <select data-catalogue-days aria-label="Filter by days per week">
                        <option value="">Any days</option>
                        <option value="2">2 days</option>
                        <option value="3">3 days</option>
                        <option value="4">4 days</option>
                        <option value="5">5 days</option>
                        <option value="6">6 days</option>
                    </select>

                    <select data-catalogue-equipment aria-label="Filter by equipment">
                        <option value="">Any equipment</option>
                        <option value="barbell">Barbell</option>
                        <option value="dumbbell">Dumbbells</option>
                        <option value="machine">Machines</option>
                        <option value="cable">Cable</option>
                        <option value="bodyweight">Bodyweight</option>
                    </select>

                    <select data-catalogue-duration aria-label="Filter by duration">
                        <option value="">Any duration</option>
                        <option value="45">Up to 45 min</option>
                        <option value="60">46–60 min</option>
                        <option value="61">60+ min</option>
                    </select>

                </div>

                <button class="secondary-btn catalogue-more-btn" type="button" data-catalogue-more>More Filters</button>

                <div class="catalogue-more-filters" data-catalogue-more-panel hidden>

                    <select data-catalogue-level aria-label="Filter by experience level">
                        <option value="">Any experience</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>

                </div>

                <p class="catalogue-result-count" data-catalogue-count></p>

                <div class="preset-grid catalogue-grid">

                    ${presetPlans.map(plan => {
                        const equipment = getPlanEquipment(plan);
                        return `
                            <button
                                class="preset-plan-card catalogue-plan-card"
                                data-plan-id="${plan.id}"
                                data-name="${escapeHtml(plan.name.toLowerCase())}"
                                data-days="${plan.daysPerWeek}"
                                data-duration="${escapeHtml(plan.estimatedMinutes)}"
                                data-level="${escapeHtml(plan.level.toLowerCase())}"
                                data-type="${escapeHtml((plan.trainingType || "Hypertrophy").toLowerCase())}"
                                data-equipment="${escapeHtml(equipment.toLowerCase())}"
                                type="button"
                            >

                                <div class="template-card-top">

                                    <span class="plan-type-label">LEVEL UP TEMPLATE</span>

                                    <span class="template-frequency">${plan.daysPerWeek} days/week</span>

                                </div>

                                <h4>${plan.name}</h4>

                                <p>${plan.description}</p>

                                <div class="template-details">

                                    <span>⏱ ${plan.estimatedMinutes} min</span>

                                    <span>${plan.trainingType || "Hypertrophy"}</span>

                                    <span>${plan.level}</span>

                                </div>

                                <div class="catalogue-equipment">${escapeHtml(equipment)}</div>

                                <div class="template-action">View & Customize →</div>

                            </button>
                        `;
                    }).join("")}

                </div>

                <div class="catalogue-empty" data-catalogue-empty hidden>
                    No templates match those filters.
                </div>



                    </div>

                </details>


            </div>


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



function getPlanEquipment(plan) {
    const exerciseMap = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
    const equipment = new Set();
    (plan.days || []).forEach(day => (day.exercises || []).forEach(item => {
        const value = exerciseMap.get(item.id)?.equipment;
        if (value) equipment.add(value);
    }));
    if (!equipment.size) return "Standard gym";
    if (equipment.size > 3) return "Mixed equipment";
    return [...equipment].join(" · ");
}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
