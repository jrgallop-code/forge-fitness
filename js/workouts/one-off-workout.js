import { getAllExercises, getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-1";
import { openWorkoutLogger } from "./workout-session.js?v=cardio-rpe-1";

let rows = [];

export function initializeOneOffWorkout() {
    const createButton = document.getElementById("new-plan-btn");
    if (!createButton || document.getElementById("one-off-workout-btn")) return;

    const button = document.createElement("button");
    button.id = "one-off-workout-btn";
    button.className = "secondary-btn";
    button.type = "button";
    button.textContent = "Log One-Off Workout";
    createButton.insertAdjacentElement("afterend", button);

    button.addEventListener("click", openOneOffBuilder);
}

function openOneOffBuilder() {
    document.getElementById("one-off-workout-builder")?.remove();
    rows = [createRow()];

    const section = document.createElement("section");
    section.id = "one-off-workout-builder";
    section.className = "plan-builder";
    section.innerHTML = `
        <div class="builder-heading">
            <div>
                <span class="eyebrow">ONE-OFF WORKOUT</span>
                <h3>Log Without Saving a Plan</h3>
                <p>Choose the exercises you want to do today. This workout will be saved to history, but the routine will not be added to My Workouts.</p>
            </div>
            <button id="close-one-off-workout" class="secondary-btn" type="button">Close</button>
        </div>
        <div id="one-off-exercise-list"></div>
        <div class="builder-footer">
            <button id="add-one-off-exercise" class="secondary-btn" type="button">+ Add Exercise</button>
            <button id="start-one-off-workout" class="primary-btn" type="button">Start One-Off Workout</button>
        </div>
        <p id="one-off-workout-message" class="workout-message" aria-live="polite"></p>
    `;

    document.querySelector(".workout-page")?.appendChild(section);
    renderRows();

    section.querySelector("#close-one-off-workout")?.addEventListener("click", () => section.remove());
    section.querySelector("#add-one-off-exercise")?.addEventListener("click", () => {
        rows.push(createRow());
        renderRows();
    });
    section.querySelector("#start-one-off-workout")?.addEventListener("click", startOneOffWorkout);

    section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createRow() {
    return {
        id: "",
        sets: 3,
        reps: "8-12"
    };
}

function renderRows() {
    const container = document.getElementById("one-off-exercise-list");
    if (!container) return;

    container.innerHTML = rows.map((row, index) => {
        const exercise = getExerciseById(row.id);
        const isCardio = exercise?.trackingType === "notes";
        return `
            <div class="workout-day-card one-off-exercise-row" data-one-off-index="${index}">
                <label>
                    Exercise
                    <select class="one-off-exercise-select" data-one-off-index="${index}">
                        ${renderExerciseOptions(row.id)}
                    </select>
                </label>
                ${isCardio ? `
                    <p class="exercise-recommendation"><strong>Cardio</strong><br>Time, optional distance and notes are recorded in the workout logger.</p>
                ` : `
                    <div class="exercise-prescription">
                        <label>Sets
                            <input class="one-off-sets" data-one-off-index="${index}" type="number" inputmode="numeric" min="1" max="20" step="1" value="${escapeHtml(row.sets)}">
                        </label>
                        <label>Target reps
                            <input class="one-off-reps" data-one-off-index="${index}" type="text" maxlength="20" value="${escapeHtml(row.reps)}" placeholder="8-12">
                        </label>
                    </div>
                `}
                <button class="remove-exercise-btn remove-one-off-exercise" data-one-off-index="${index}" type="button" ${rows.length === 1 ? "disabled" : ""}>Remove</button>
            </div>
        `;
    }).join("");

    bindRows();
}

function bindRows() {
    document.querySelectorAll(".one-off-exercise-select").forEach(select => {
        select.addEventListener("change", () => {
            const index = Number(select.dataset.oneOffIndex);
            const exercise = getExerciseById(select.value);
            rows[index].id = select.value;
            if (exercise) {
                rows[index].sets = Number(exercise.defaultSets) || 3;
                rows[index].reps = exercise.recommendedReps || "8-12";
            }
            renderRows();
        });
    });

    document.querySelectorAll(".one-off-sets").forEach(input => {
        input.addEventListener("input", () => {
            const index = Number(input.dataset.oneOffIndex);
            rows[index].sets = Math.max(1, Math.min(20, Number(input.value) || 1));
        });
    });

    document.querySelectorAll(".one-off-reps").forEach(input => {
        input.addEventListener("input", () => {
            rows[Number(input.dataset.oneOffIndex)].reps = input.value;
        });
    });

    document.querySelectorAll(".remove-one-off-exercise").forEach(button => {
        button.addEventListener("click", () => {
            if (rows.length <= 1) return;
            rows.splice(Number(button.dataset.oneOffIndex), 1);
            renderRows();
        });
    });
}

function startOneOffWorkout() {
    const message = document.getElementById("one-off-workout-message");
    const selected = rows.filter(row => getExerciseById(row.id));

    if (!selected.length) {
        if (message) message.textContent = "Choose at least one exercise before starting.";
        return;
    }

    const exercises = selected.map(row => {
        const exercise = getExerciseById(row.id);
        return {
            id: row.id,
            sets: exercise?.trackingType === "notes" ? 1 : Math.max(1, Number(row.sets) || 1),
            reps: exercise?.trackingType === "notes" ? "" : (String(row.reps || "").trim() || exercise?.recommendedReps || "8-12")
        };
    });

    const plan = {
        id: `one-off-${Date.now()}`,
        name: "One-Off Workout",
        isOneOff: true,
        days: [{
            name: "One-Off Workout",
            exercises
        }]
    };

    document.getElementById("one-off-workout-builder")?.remove();
    openWorkoutLogger(plan);
}

function renderExerciseOptions(selectedId) {
    const exercises = getAllExercises()
        .filter(exercise => exercise?.id)
        .sort((a, b) => String(a.muscleGroup || "").localeCompare(String(b.muscleGroup || "")) || String(a.name || "").localeCompare(String(b.name || "")));

    const groups = new Map();
    exercises.forEach(exercise => {
        const group = exercise.muscleGroup || "Other";
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(exercise);
    });

    return `<option value="">Choose Exercise</option>${[...groups.entries()].map(([group, items]) => `
        <optgroup label="${escapeHtml(group)}">
            ${items.map(exercise => `<option value="${escapeHtml(exercise.id)}" ${exercise.id === selectedId ? "selected" : ""}>${escapeHtml(exercise.name)}${exercise.isCustom ? " — Custom" : ""}</option>`).join("")}
        </optgroup>
    `).join("")}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
