import { exercises }
from "./exercise-library.js";

import { presetPlans }
from "./workout-plans.js";


export function renderWorkoutBuilder() {

    return `
        <section class="section-card">

            <h2>💪 Workout Plans</h2>

            <p class="section-description">
                Build your own weekly plan or start from a Forge template.
            </p>

            <div class="workout-builder-actions">

                <button
                    id="new-plan-btn"
                    class="primary-btn"
                    type="button"
                >
                    + Create My Plan
                </button>

            </div>

            <div class="preset-section">

                <h3>Forge Templates</h3>

                <div class="preset-grid">

                    ${presetPlans.map(plan => `
                        <button
                            class="preset-plan-card"
                            data-plan-id="${plan.id}"
                            type="button"
                        >
                            <strong>
                                ${plan.name}
                            </strong>

                            <span>
                                ${plan.daysPerWeek} days/week
                            </span>

                            <span>
                                ${plan.estimatedMinutes} min
                            </span>

                            <small>
                                ${plan.description}
                            </small>
                        </button>
                    `).join("")}

                </div>

            </div>

            <div
                id="plan-builder"
                class="plan-builder"
                hidden
            >

                <h3>My Workout Plan</h3>

                <label for="plan-name">
                    Plan Name
                </label>

                <input
                    id="plan-name"
                    type="text"
                    placeholder="Example: My 4 Day Plan"
                >

                <div id="workout-days"></div>

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
                    Save Plan
                </button>

            </div>

            <div
                id="workout-builder-message"
                aria-live="polite"
            ></div>

        </section>
    `;

}


export function getExerciseOptions() {

    return `
        <option value="">
            Choose Exercise
        </option>

        ${exercises.map(exercise => `
            <option value="${exercise.id}">
                ${exercise.name} — ${exercise.muscleGroup}
            </option>
        `).join("")}
    `;

}