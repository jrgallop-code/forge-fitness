import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves"];
const BASE_VOLUME = {
    beginner: { Chest: 8, Back: 8, Shoulders: 6, Biceps: 4, Triceps: 4, Quads: 8, Hamstrings: 6, Glutes: 4, Calves: 4 },
    intermediate: { Chest: 10, Back: 10, Shoulders: 8, Biceps: 6, Triceps: 6, Quads: 10, Hamstrings: 8, Glutes: 6, Calves: 6 },
    advanced: { Chest: 12, Back: 12, Shoulders: 10, Biceps: 8, Triceps: 8, Quads: 12, Hamstrings: 10, Glutes: 8, Calves: 8 }
};

const state = {
    step: 0,
    goal: "muscle",
    days: 4,
    duration: 60,
    priorities: [],
    experience: "intermediate",
    equipment: ["Full Gym"],
    preferredIds: [],
    excludedIds: [],
    style: "no-preference",
    generated: null
};

export function initializeSmartBuild(root = document) {
    const home = root.querySelector?.("[data-workout-home]");
    if (!home || home.querySelector("[data-smart-build-launcher]")) return;

    home.insertAdjacentHTML("afterbegin", renderLauncher());
    home.insertAdjacentHTML("afterend", renderWizardShell());

    root.querySelector("[data-manual-build]")?.addEventListener("click", () => {
        root.getElementById?.("new-plan-btn")?.click();
    });

    root.querySelector("[data-template-build]")?.addEventListener("click", () => {
        const details = root.querySelector(".workout-catalogue-details");
        if (details) {
            details.open = true;
            details.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    root.querySelector("[data-smart-build]")?.addEventListener("click", () => openWizard(root));
    root.querySelector("[data-smart-close]")?.addEventListener("click", () => closeWizard(root));

    renderStep(root);
}

function renderLauncher() {
    return `
        <section class="smart-build-launcher" data-smart-build-launcher>
            <div class="smart-build-launcher-head">
                <span class="eyebrow">BUILD A PROGRAM</span>
                <p>Choose how you want to create your training plan.</p>
            </div>
            <div class="smart-build-choice-grid">
                <button class="smart-build-choice" type="button" data-manual-build>
                    <span class="smart-build-choice-title">Manual Build</span>
                    <small>Build it yourself</small>
                </button>
                <button class="smart-build-choice" type="button" data-template-build>
                    <span class="smart-build-choice-title">Templates</span>
                    <small>Start from a proven split</small>
                </button>
                <button class="smart-build-choice smart-build-choice-primary" type="button" data-smart-build>
                    <span class="smart-build-badge">GUIDED</span>
                    <span class="smart-build-choice-title">Smart Build</span>
                    <small>Personalized hypertrophy programming</small>
                </button>
            </div>
        </section>`;
}

function renderWizardShell() {
    return `
        <section class="smart-build-wizard" data-smart-build-wizard hidden>
            <div class="smart-build-topbar">
                <div>
                    <span class="eyebrow">SMART BUILD</span>
                    <h3>Build Muscle Program</h3>
                </div>
                <button class="secondary-btn smart-build-close" type="button" data-smart-close>Close</button>
            </div>
            <div class="smart-build-progress"><span data-smart-progress></span></div>
            <div data-smart-step></div>
        </section>`;
}

function openWizard(root) {
    const home = root.querySelector("[data-workout-home]");
    const wizard = root.querySelector("[data-smart-build-wizard]");
    if (home) home.hidden = true;
    if (wizard) {
        wizard.hidden = false;
        state.step = 0;
        renderStep(root);
        wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function closeWizard(root) {
    const home = root.querySelector("[data-workout-home]");
    const wizard = root.querySelector("[data-smart-build-wizard]");
    if (wizard) wizard.hidden = true;
    if (home) {
        home.hidden = false;
        home.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function renderStep(root) {
    const host = root.querySelector("[data-smart-step]");
    const progress = root.querySelector("[data-smart-progress]");
    if (!host || !progress) return;

    const total = 8;
    progress.style.width = `${Math.min(100, ((state.step + 1) / total) * 100)}%`;

    const steps = [
        renderGoalStep,
        renderDaysStep,
        renderDurationStep,
        renderPriorityStep,
        renderExperienceStep,
        renderEquipmentStep,
        renderExercisePreferenceStep,
        renderStyleStep,
        renderReview
    ];

    host.innerHTML = steps[state.step]();
    bindStep(root);
}

function renderGoalStep() {
    return questionCard("1", "Primary goal", "What should this program optimize for?", `
        <button class="smart-option selected" type="button" data-value="muscle">
            <strong>Build Muscle</strong><small>Optimize weekly hypertrophy volume, frequency and exercise distribution.</small>
        </button>
        <div class="smart-build-coming">More goals can be added later without changing the plan format.</div>
    `, false);
}

function renderDaysStep() {
    return questionCard("2", "Training days", "How many days per week do you want to train?", chipRow([2,3,4,5,6], state.days, "days"));
}

function renderDurationStep() {
    return questionCard("3", "Session length", "How long should most workouts take?", chipRow([30,45,60,75,90], state.duration, "duration", value => value === 90 ? "90+ min" : `${value} min`));
}

function renderPriorityStep() {
    const chips = MUSCLES.map(muscle => `<button type="button" class="smart-chip ${state.priorities.includes(muscle) ? "selected" : ""}" data-priority="${muscle}">${muscle}</button>`).join("");
    return questionCard("4", "Muscle priorities", "Choose up to 3 muscles to emphasize. You can also skip this step.", `<div class="smart-chip-grid">${chips}</div><p class="smart-helper" data-priority-count>${state.priorities.length}/3 selected</p>`);
}

function renderExperienceStep() {
    const options = [
        ["beginner", "Beginner", "Lower starting volume and simpler exercise distribution"],
        ["intermediate", "Intermediate", "Moderate volume with balanced frequency"],
        ["advanced", "Advanced", "Higher starting volume and more total work"]
    ];
    return questionCard("5", "Training experience", "This sets the starting volume target. You can still edit the finished plan.", options.map(([value,label,copy]) => `<button class="smart-option ${state.experience === value ? "selected" : ""}" type="button" data-experience="${value}"><strong>${label}</strong><small>${copy}</small></button>`).join(""));
}

function renderEquipmentStep() {
    const options = ["Full Gym", "Barbell", "Dumbbells", "Machines", "Cables", "Bodyweight", "Home Gym"];
    return questionCard("6", "Available equipment", "Select what you can reliably use.", `<div class="smart-chip-grid">${options.map(item => `<button type="button" class="smart-chip ${state.equipment.includes(item) ? "selected" : ""}" data-equipment="${item}">${item}</button>`).join("")}</div>`);
}

function renderExercisePreferenceStep() {
    return questionCard("7", "Exercise preferences", "Search exercises you want included or want Smart Build to avoid.", `
        <label class="smart-search-label">Find an exercise<input type="search" data-smart-exercise-search placeholder="Search exercise, muscle or equipment"></label>
        <div class="smart-search-results" data-smart-search-results></div>
        <div class="smart-pref-columns">
            <div><strong>Preferred</strong><div class="smart-selected-list" data-preferred-list>${renderSelectedExercises(state.preferredIds)}</div></div>
            <div><strong>Avoid / discomfort</strong><div class="smart-selected-list" data-excluded-list>${renderSelectedExercises(state.excludedIds)}</div></div>
        </div>`);
}

function renderStyleStep() {
    const options = [["no-preference","No preference"],["machines","Prefer machines"],["free-weights","Prefer free weights"]];
    return questionCard("8", "Training preference", "One final preference for exercise selection.", options.map(([value,label]) => `<button class="smart-option ${state.style === value ? "selected" : ""}" type="button" data-style="${value}"><strong>${label}</strong></button>`).join(""), true, "Generate Program");
}

function questionCard(number, title, copy, body, showBack = true, nextLabel = "Continue") {
    return `<div class="smart-question-card">
        <div class="smart-question-number">${number}</div>
        <h4>${title}</h4><p>${copy}</p>
        <div class="smart-question-body">${body}</div>
        <div class="smart-question-actions">
            ${showBack ? `<button class="secondary-btn" type="button" data-smart-back>Back</button>` : `<span></span>`}
            <button class="primary-btn" type="button" data-smart-next>${nextLabel}</button>
        </div>
    </div>`;
}

function chipRow(values, selected, key, labeler = String) {
    return `<div class="smart-chip-grid">${values.map(value => `<button type="button" class="smart-chip ${selected === value ? "selected" : ""}" data-${key}="${value}">${labeler(value)}</button>`).join("")}</div>`;
}

function bindStep(root) {
    root.querySelector("[data-smart-back]")?.addEventListener("click", () => {
        state.step = Math.max(0, state.step - 1);
        renderStep(root);
    });

    root.querySelector("[data-smart-next]")?.addEventListener("click", () => {
        if (state.step === 7) {
            state.generated = generateProgram();
            state.step = 8;
        } else {
            state.step += 1;
        }
        renderStep(root);
    });

    root.querySelectorAll("[data-days]").forEach(btn => btn.addEventListener("click", () => { state.days = Number(btn.dataset.days); renderStep(root); }));
    root.querySelectorAll("[data-duration]").forEach(btn => btn.addEventListener("click", () => { state.duration = Number(btn.dataset.duration); renderStep(root); }));
    root.querySelectorAll("[data-experience]").forEach(btn => btn.addEventListener("click", () => { state.experience = btn.dataset.experience; renderStep(root); }));
    root.querySelectorAll("[data-style]").forEach(btn => btn.addEventListener("click", () => { state.style = btn.dataset.style; renderStep(root); }));

    root.querySelectorAll("[data-priority]").forEach(btn => btn.addEventListener("click", () => {
        const muscle = btn.dataset.priority;
        if (state.priorities.includes(muscle)) state.priorities = state.priorities.filter(item => item !== muscle);
        else if (state.priorities.length < 3) state.priorities.push(muscle);
        renderStep(root);
    }));

    root.querySelectorAll("[data-equipment]").forEach(btn => btn.addEventListener("click", () => {
        const item = btn.dataset.equipment;
        if (item === "Full Gym") state.equipment = ["Full Gym"];
        else {
            state.equipment = state.equipment.filter(value => value !== "Full Gym");
            state.equipment = state.equipment.includes(item) ? state.equipment.filter(value => value !== item) : [...state.equipment, item];
            if (!state.equipment.length) state.equipment = ["Full Gym"];
        }
        renderStep(root);
    }));

    const search = root.querySelector("[data-smart-exercise-search]");
    if (search) {
        search.addEventListener("input", () => renderExerciseResults(root, search.value));
        renderExerciseResults(root, "");
    }

    root.querySelector("[data-smart-regenerate]")?.addEventListener("click", () => {
        state.generated = generateProgram(true);
        renderStep(root);
    });
    root.querySelector("[data-smart-save]")?.addEventListener("click", () => saveGeneratedPlan(root));
    root.querySelector("[data-smart-restart]")?.addEventListener("click", () => { resetState(); state.step = 0; renderStep(root); });
}

function renderExerciseResults(root, query) {
    const host = root.querySelector("[data-smart-search-results]");
    if (!host) return;
    const term = String(query || "").trim().toLowerCase();
    if (term.length < 2) { host.innerHTML = `<p class="smart-helper">Type at least 2 characters.</p>`; return; }

    const results = getAllExercises().filter(exercise => exercise.trackingType !== "notes").filter(exercise =>
        [exercise.name, exercise.muscleGroup, exercise.equipment].some(value => String(value || "").toLowerCase().includes(term))
    ).slice(0, 8);

    host.innerHTML = results.length ? results.map(exercise => `
        <div class="smart-search-row">
            <div><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(exercise.muscleGroup)} · ${escapeHtml(exercise.equipment)}</small></div>
            <button type="button" data-prefer-id="${exercise.id}">Prefer</button>
            <button type="button" data-exclude-id="${exercise.id}">Avoid</button>
        </div>`).join("") : `<p class="smart-helper">No matching exercises.</p>`;

    host.querySelectorAll("[data-prefer-id]").forEach(btn => btn.addEventListener("click", () => {
        const id = btn.dataset.preferId;
        state.excludedIds = state.excludedIds.filter(item => item !== id);
        if (!state.preferredIds.includes(id)) state.preferredIds.push(id);
        renderStep(root);
    }));
    host.querySelectorAll("[data-exclude-id]").forEach(btn => btn.addEventListener("click", () => {
        const id = btn.dataset.excludeId;
        state.preferredIds = state.preferredIds.filter(item => item !== id);
        if (!state.excludedIds.includes(id)) state.excludedIds.push(id);
        renderStep(root);
    }));
}

function renderSelectedExercises(ids) {
    const all = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
    return ids.length ? ids.map(id => `<span>${escapeHtml(all.get(id)?.name || id)}</span>`).join("") : `<small>None selected</small>`;
}

function generateProgram(regenerate = false) {
    const all = getAllExercises().filter(exercise => exercise.trackingType !== "notes" && !state.excludedIds.includes(exercise.id));
    const volumes = { ...BASE_VOLUME[state.experience] };
    state.priorities.forEach(muscle => { if (volumes[muscle] != null) volumes[muscle] += state.experience === "beginner" ? 2 : 4; });

    const capacitySets = Math.max(12, Math.round(state.duration / 5.5));
    const maxWeeklySets = capacitySets * state.days;
    const requestedSets = Object.values(volumes).reduce((sum, value) => sum + value, 0);
    if (requestedSets > maxWeeklySets) {
        const scale = maxWeeklySets / requestedSets;
        Object.keys(volumes).forEach(muscle => { volumes[muscle] = Math.max(4, Math.round(volumes[muscle] * scale)); });
    }

    const dayNames = getSplitNames(state.days);
    const days = dayNames.map(name => ({ name, exercises: [] }));
    const muscleDayMap = assignMusclesToDays(state.days);
    const used = new Set();

    Object.entries(volumes).forEach(([muscle, weeklySets]) => {
        const targets = muscleDayMap[muscle] || [0];
        let remaining = weeklySets;
        targets.forEach((dayIndex, targetIndex) => {
            const sessionsLeft = targets.length - targetIndex;
            const sessionSets = Math.max(2, Math.round(remaining / sessionsLeft));
            remaining -= sessionSets;
            addMuscleWork(days[dayIndex], muscle, sessionSets, all, used, regenerate);
        });
    });

    days.forEach(day => day.exercises.sort((a,b) => Number(b.compound) - Number(a.compound)).forEach(item => delete item.compound));

    return {
        name: `${state.days}-Day Hypertrophy Program${state.priorities.length ? ` — ${state.priorities.join(" + ")} Priority` : ""}`,
        days,
        smartBuild: { goal: "Build Muscle", duration: state.duration, experience: state.experience, priorities: [...state.priorities], generatedAt: new Date().toISOString() },
        volumes
    };
}

function addMuscleWork(day, muscle, totalSets, exercises, used, regenerate) {
    let candidates = exercises.filter(exercise => normalizedMuscle(exercise.muscleGroup) === normalizedMuscle(muscle) && equipmentAllowed(exercise));
    candidates.sort((a,b) => scoreExercise(b, used, regenerate) - scoreExercise(a, used, regenerate));
    if (!candidates.length) return;

    const exerciseCount = totalSets >= 7 ? 3 : totalSets >= 4 ? 2 : 1;
    const picks = candidates.slice(0, Math.min(exerciseCount, candidates.length));
    let remaining = totalSets;
    picks.forEach((exercise, index) => {
        const left = picks.length - index;
        const sets = Math.max(2, Math.round(remaining / left));
        remaining -= sets;
        day.exercises.push({ id: exercise.id, sets, reps: exercise.recommendedReps || "8-12", compound: exercise.type === "compound" });
        used.add(exercise.id);
    });
}

function scoreExercise(exercise, used, regenerate) {
    let score = exercise.type === "compound" ? 12 : 8;
    if (state.preferredIds.includes(exercise.id)) score += 100;
    if (used.has(exercise.id)) score -= 18;
    if (state.style === "machines" && ["Machine", "Cable"].includes(exercise.equipment)) score += 10;
    if (state.style === "free-weights" && ["Barbell", "Dumbbells"].includes(exercise.equipment)) score += 10;
    if (regenerate) score += Math.random() * 12;
    return score;
}

function equipmentAllowed(exercise) {
    if (state.equipment.includes("Full Gym")) return true;
    const equipment = String(exercise.equipment || "").toLowerCase();
    const selected = state.equipment.map(item => item.toLowerCase());
    if (selected.includes("home gym")) return ["dumbbells", "bodyweight", "barbell"].some(item => equipment.includes(item));
    return selected.some(item => equipment.includes(item.replace(/s$/, "")) || item.includes(equipment.replace(/s$/, "")));
}

function normalizedMuscle(value) {
    const muscle = String(value || "").toLowerCase();
    if (muscle === "rear delts") return "shoulders";
    if (muscle === "lats") return "back";
    return muscle;
}

function getSplitNames(days) {
    const splits = {
        2: ["Full Body A", "Full Body B"],
        3: ["Upper", "Lower", "Full Body"],
        4: ["Upper A", "Lower A", "Upper B", "Lower B"],
        5: ["Upper", "Lower", "Push", "Pull", "Legs"],
        6: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]
    };
    return splits[days] || Array.from({ length: days }, (_, i) => `Day ${i + 1}`);
}

function assignMusclesToDays(days) {
    if (days === 2) return Object.fromEntries(MUSCLES.map(m => [m, [0,1]]));
    if (days === 3) return { Chest:[0,2], Back:[0,2], Shoulders:[0,2], Biceps:[0,2], Triceps:[0,2], Quads:[1,2], Hamstrings:[1,2], Glutes:[1,2], Calves:[1,2] };
    if (days === 4) return { Chest:[0,2], Back:[0,2], Shoulders:[0,2], Biceps:[0,2], Triceps:[0,2], Quads:[1,3], Hamstrings:[1,3], Glutes:[1,3], Calves:[1,3] };
    if (days === 5) return { Chest:[0,2], Back:[0,3], Shoulders:[0,2], Biceps:[0,3], Triceps:[0,2], Quads:[1,4], Hamstrings:[1,4], Glutes:[1,4], Calves:[1,4] };
    return { Chest:[0,3], Back:[1,4], Shoulders:[0,3], Biceps:[1,4], Triceps:[0,3], Quads:[2,5], Hamstrings:[2,5], Glutes:[2,5], Calves:[2,5] };
}

function renderReview() {
    const plan = state.generated;
    const exerciseMap = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
    const volumeRows = Object.entries(plan.volumes).map(([muscle, sets]) => `<div><span>${muscle}</span><strong>${sets} sets</strong></div>`).join("");
    const days = plan.days.map(day => `<details class="smart-review-day"><summary><strong>${escapeHtml(day.name)}</strong><span>${day.exercises.length} exercises</span></summary><div>${day.exercises.map(item => `<p><strong>${escapeHtml(exerciseMap.get(item.id)?.name || item.id)}</strong><span>${item.sets} × ${escapeHtml(item.reps)}</span></p>`).join("")}</div></details>`).join("");
    return `<div class="smart-review">
        <span class="eyebrow">YOUR PROGRAM</span>
        <h3>${escapeHtml(plan.name)}</h3>
        <div class="smart-review-meta"><span>${state.days} days/week</span><span>~${state.duration} min/session</span><span>${capitalize(state.experience)}</span></div>
        <h4>Weekly direct-set targets</h4><div class="smart-volume-grid">${volumeRows}</div>
        <h4>Workout days</h4><div class="smart-review-days">${days}</div>
        <p class="smart-review-note">Smart Build uses these targets as a starting prescription. You can edit the saved plan later like any other Level Up plan.</p>
        <div class="smart-review-actions"><button class="secondary-btn" type="button" data-smart-restart>Edit Answers</button><button class="secondary-btn" type="button" data-smart-regenerate>Regenerate</button><button class="primary-btn" type="button" data-smart-save>Save Plan</button></div>
    </div>`;
}

function saveGeneratedPlan(root) {
    if (!state.generated) return;
    const saved = getSavedPlans();
    const plan = JSON.parse(JSON.stringify(state.generated));
    delete plan.volumes;
    plan.id = `plan-${Date.now()}`;
    saved.push(plan);
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(saved));

    const button = root.querySelector("[data-smart-save]");
    if (button) { button.textContent = "Saved ✓"; button.disabled = true; }
    setTimeout(() => document.querySelector('.nav-btn[data-page="workout"]')?.click(), 250);
}

function getSavedPlans() {
    try {
        const stored = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
        return Array.isArray(stored) ? stored : [];
    } catch { return []; }
}

function resetState() {
    Object.assign(state, { step:0, goal:"muscle", days:4, duration:60, priorities:[], experience:"intermediate", equipment:["Full Gym"], preferredIds:[], excludedIds:[], style:"no-preference", generated:null });
}

function capitalize(value) { return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1); }
function escapeHtml(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
