import { ACTIVITY_LEVELS, GOAL_PRESETS, calculateTdee } from "../nutrition/tdee-calculator.js?v=onboarding-flow-3";
import { getNutritionProfile, saveNutritionProfile, saveNutritionGoal, syncCalculatedCalories } from "../nutrition/nutrition-storage.js?v=onboarding-flow-3";
import { getActiveNutritionPhase, saveNutritionPhase } from "../nutrition/nutrition-phase.js?v=onboarding-flow-3";
import { getTrainingPreferences, saveTrainingPreferences } from "../core/training-preferences.js?v=onboarding-flow-3";
import { getMaintenanceUpdateMode, setMaintenanceUpdateMode } from "../nutrition/maintenance-check-in.js?v=onboarding-flow-3";

const FAST = "level_up_onboarding_fast_build";
const AFTER = "level_up_onboarding_nutrition_after_build";
const MANUAL_TARGET_KEY = "level_up_manual_calorie_target_v1";
const NUTRITION_STEPS = 3;
let firstRun = false;
let overlay = null;
let step = 0;
let answers = null;

setTimeout(() => { firstRun = Boolean(document.querySelector(".levelup-onboarding")); }, 0);

document.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    if (!button) return;
    if (button.matches('[data-onboarding-finish="smart"]')) {
        sessionStorage.setItem(FAST, "1");
        if (firstRun) sessionStorage.setItem(AFTER, "1");
        setTimeout(() => fastForward(0), 100);
        return;
    }
    if (button.matches("[data-smart-save]") && sessionStorage.getItem(AFTER) === "1") {
        sessionStorage.removeItem(AFTER);
        setTimeout(openNutrition, 220);
    }
}, true);

function fastForward(attempt) {
    if (sessionStorage.getItem(FAST) !== "1") return;
    const wizard = document.querySelector("[data-smart-build-wizard]");
    if (!wizard || wizard.hidden) {
        if (attempt < 24) setTimeout(() => fastForward(attempt + 1), 50);
        return;
    }
    const oldVisibility = wizard.style.visibility;
    wizard.style.visibility = "hidden";
    try {
        for (let index = 0; index < 7; index += 1) {
            if (wizard.querySelector("[data-smart-save]")) break;
            const next = wizard.querySelector("[data-smart-next]");
            if (!next || next.disabled) break;
            next.click();
        }
    } finally {
        wizard.style.visibility = oldVisibility;
    }
    if (wizard.querySelector("[data-smart-save]")) {
        sessionStorage.removeItem(FAST);
        wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (attempt < 24) {
        setTimeout(() => fastForward(attempt + 1), 50);
    }
}

function openNutrition() {
    const preferences = getTrainingPreferences();
    if (preferences.nutritionSetupComplete === true || preferences.nutritionSetupSkipped === true || getActiveNutritionPhase()) return;
    close();
    const profile = getNutritionProfile() || {};
    const savedMode = getMaintenanceUpdateMode();
    answers = {
        activity: ACTIVITY_LEVELS[profile.activity] ? profile.activity : "",
        goalId: suggest(preferences.primaryGoal),
        nutritionMode: savedMode === "track" ? "manual" : "coach",
        coachUpdateMode: savedMode === "automatic" ? "automatic" : "review"
    };
    step = 0;
    overlay = document.createElement("div");
    overlay.className = "levelup-onboarding levelup-nutrition-setup";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Optional nutrition setup");
    overlay.addEventListener("click", handle);
    document.body.appendChild(overlay);
    document.body.classList.add("levelup-onboarding-open");
    render();
}

function close() {
    overlay?.remove();
    overlay = null;
    document.body.classList.remove("levelup-onboarding-open");
}

function render() {
    if (!overlay || !answers) return;
    const done = step === NUTRITION_STEPS;
    const screen = step === 0 ? activity() : step === 1 ? goal() : nutritionMode();
    const nextLabel = step === NUTRITION_STEPS - 1 ? "Save Nutrition" : "Continue";
    overlay.innerHTML = `<div class="levelup-onboarding-shell">
        <header class="levelup-onboarding-topbar">
            <div><span class="eyebrow">OPTIONAL NUTRITION SETUP</span>${done ? "" : `<strong>${step + 1} of ${NUTRITION_STEPS}</strong>`}</div>
            ${done ? '<button class="levelup-onboarding-skip" type="button" data-nutrition-close>Close</button>' : '<button class="levelup-onboarding-skip" type="button" data-nutrition-skip>Skip Nutrition</button>'}
        </header>
        ${done ? "" : `<div class="levelup-onboarding-progress"><span style="width:${((step + 1) / NUTRITION_STEPS) * 100}%"></span></div>`}
        <main class="levelup-onboarding-body">${done ? complete() : screen}</main>
        ${done ? "" : `<footer class="levelup-onboarding-footer"><button class="secondary-btn" type="button" data-nutrition-back ${step === 0 ? "disabled" : ""}>Back</button><button class="primary-btn" type="button" data-nutrition-next ${canContinue() ? "" : "disabled"}>${nextLabel}</button></footer>`}
    </div>`;
}

function activity() {
    return `<section class="onboarding-screen">
        <span class="eyebrow">ENERGY NEEDS</span>
        <h2>How active is your typical week?</h2>
        <p class="onboarding-helper">This uses Level Up's existing Body Profile activity setting to estimate maintenance calories.</p>
        <div class="onboarding-option-stack">${Object.entries(ACTIVITY_LEVELS).map(([id, item]) => `<button class="onboarding-option ${answers.activity === id ? "selected" : ""}" type="button" data-nutrition-activity="${esc(id)}"><strong>${esc(item.label)}</strong><small>${esc(item.description)}</small></button>`).join("")}</div>
    </section>`;
}

function goal() {
    const plan = preview();
    return `<section class="onboarding-screen">
        <span class="eyebrow">NUTRITION PHASE</span>
        <h2>What should your calories support right now?</h2>
        <p class="onboarding-helper">Choose the direction you want your weight to move. Level Up uses your estimated maintenance plus this goal adjustment to create the starting calorie target.</p>
        <div class="onboarding-option-stack">${Object.entries(GOAL_PRESETS).map(([id, item]) => `<button class="onboarding-option ${answers.goalId === id ? "selected" : ""}" type="button" data-nutrition-goal="${esc(id)}"><strong>${esc(item.label)}</strong><small>${esc(item.description)}</small></button>`).join("")}</div>
        ${plan ? nutritionPreview(plan) : ""}
    </section>`;
}

function nutritionPreview(plan) {
    const sign = plan.adjustment > 0 ? "+" : plan.adjustment < 0 ? "−" : "";
    const absolute = Math.abs(plan.adjustment);
    const equation = plan.adjustment === 0
        ? `${plan.maintenance.toLocaleString()} maintenance = ${plan.target.toLocaleString()} target`
        : `${plan.maintenance.toLocaleString()} ${sign} ${absolute.toLocaleString()} = ${plan.target.toLocaleString()} target`;
    return `<div class="onboarding-nutrition-preview">
        <div><span>Estimated maintenance</span><strong>${plan.maintenance.toLocaleString()} kcal/day</strong></div>
        <div><span>Goal adjustment</span><strong>${sign}${absolute.toLocaleString()} kcal/day</strong></div>
        <div><span>Starting calorie target</span><strong>${plan.target.toLocaleString()} kcal/day</strong></div>
        <p class="onboarding-nutrition-equation"><strong>${equation}</strong><span>Maintenance is not your calorie goal; it is the starting point used to calculate the target.</span></p>
    </div>`;
}

function nutritionMode() {
    const isCoach = answers.nutritionMode === "coach";
    const plan = preview();
    return `<section class="onboarding-screen onboarding-nutrition-mode-screen">
        <span class="eyebrow">NUTRITION MODE</span>
        <h2>How should Level Up handle your calories?</h2>
        <p class="onboarding-helper">This controls what happens after your starting target is set. You can change it later in Nutrition → Goals & Plan.</p>
        <div class="onboarding-nutrition-mode-cards" role="radiogroup" aria-label="Nutrition mode">
            <button type="button" class="onboarding-nutrition-mode-card ${isCoach ? "selected" : ""}" data-nutrition-program="coach" role="radio" aria-checked="${isCoach}">
                <em>RECOMMENDED</em><strong>Level Up Coach</strong><small>Use your goal, completed food logs and Trend Weight to review your calorie target each week.</small>
            </button>
            <button type="button" class="onboarding-nutrition-mode-card ${!isCoach ? "selected" : ""}" data-nutrition-program="manual" role="radio" aria-checked="${!isCoach}">
                <strong>Track Manually</strong><small>You control the calorie target. Food logging and analytics stay on, but weekly calorie check-ins stay off.</small>
            </button>
        </div>
        ${isCoach ? `<div class="onboarding-coach-update-choice"><span>WHEN A WEEKLY UPDATE IS READY</span><div role="radiogroup" aria-label="Coach update preference"><button type="button" class="${answers.coachUpdateMode === "review" ? "selected" : ""}" data-nutrition-coach-update="review" aria-pressed="${answers.coachUpdateMode === "review"}">Review before applying</button><button type="button" class="${answers.coachUpdateMode === "automatic" ? "selected" : ""}" data-nutrition-coach-update="automatic" aria-pressed="${answers.coachUpdateMode === "automatic"}">Apply automatically</button></div><small>First review: Day 14. After that, Level Up checks weekly when enough nutrition and weight data are available.</small></div>` : `<div class="onboarding-manual-mode-note"><strong>${plan ? `${plan.target.toLocaleString()} kcal/day starting target` : "Manual tracking"}</strong><span>Level Up will not show calorie check-in reminders or change this target automatically. You can edit it anytime in Goals & Plan.</span></div>`}
    </section>`;
}

function complete() {
    const plan = preview();
    const goal = GOAL_PRESETS[answers.goalId];
    const manual = answers.nutritionMode === "manual";
    const modeCopy = manual
        ? "Manual tracking is on. Weekly calorie check-ins and automatic target changes are off."
        : answers.coachUpdateMode === "automatic"
            ? "Level Up Coach is on and will apply qualifying weekly updates automatically."
            : "Level Up Coach is on and will ask you before applying weekly calorie updates.";
    return `<section class="onboarding-screen onboarding-completion"><span class="eyebrow">NUTRITION SET</span><h2>${esc(goal?.label || "Nutrition phase")} is ready.</h2><p>Your starting calorie target is ${plan ? `<strong>${plan.target.toLocaleString()} kcal/day</strong>` : "saved"}. ${modeCopy}</p><div class="onboarding-completion-actions"><button class="primary-btn" type="button" data-nutrition-open-calories>View Nutrition</button><button class="secondary-btn" type="button" data-nutrition-close>Back to Workout</button></div></section>`;
}

function handle(event) {
    const button = event.target.closest("button");
    if (!button || !overlay?.contains(button)) return;
    if (button.matches("[data-nutrition-skip]")) {
        saveTrainingPreferences({ nutritionSetupSkipped: true, nutritionSetupComplete: false, nutritionSetupHandledAt: new Date().toISOString() });
        close();
        return;
    }
    if (button.matches("[data-nutrition-close]")) { close(); return; }
    if (button.dataset.nutritionActivity) { answers.activity = button.dataset.nutritionActivity; render(); return; }
    if (button.dataset.nutritionGoal) { answers.goalId = button.dataset.nutritionGoal; render(); return; }
    if (button.dataset.nutritionProgram) { answers.nutritionMode = button.dataset.nutritionProgram; render(); return; }
    if (button.dataset.nutritionCoachUpdate) { answers.coachUpdateMode = button.dataset.nutritionCoachUpdate; render(); return; }
    if (button.matches("[data-nutrition-back]")) { step = Math.max(0, step - 1); render(); return; }
    if (button.matches("[data-nutrition-next]")) {
        if (!canContinue()) return;
        if (step < NUTRITION_STEPS - 1) { step += 1; render(); }
        else save();
        return;
    }
    if (button.matches("[data-nutrition-open-calories]")) {
        close();
        document.querySelector('.nav-btn[data-page="energy"]')?.click();
    }
}

function canContinue() {
    if (step === 0) return Boolean(ACTIVITY_LEVELS[answers?.activity]);
    if (step === 1) return Boolean(GOAL_PRESETS[answers?.goalId] && preview());
    return answers?.nutritionMode === "manual" || answers?.nutritionMode === "coach";
}

function preview() {
    const profile = getNutritionProfile();
    const goal = GOAL_PRESETS[answers?.goalId];
    if (!profile || !ACTIVITY_LEVELS[answers?.activity] || !goal) return null;
    try {
        const maintenance = Math.round(Number(calculateTdee({ ...profile, activity: answers.activity }).tdee));
        if (!Number.isFinite(maintenance) || maintenance <= 0) return null;
        return {
            maintenance,
            adjustment: Number(goal.dailyCalorieAdjustment || 0),
            target: Math.round(maintenance + Number(goal.dailyCalorieAdjustment || 0))
        };
    } catch {
        return null;
    }
}

function save() {
    const profile = getNutritionProfile();
    const plan = preview();
    const goalId = answers.goalId;
    if (!profile || !plan || !GOAL_PRESETS[goalId]) return;

    saveNutritionProfile({ ...profile, activity: answers.activity });
    localStorage.removeItem("level_up_manual_maintenance_calories");
    saveNutritionPhase({ goalId, maintenanceCalories: plan.maintenance, targetCalories: plan.target });
    saveNutritionGoal({ goalId, updatedAt: new Date().toISOString(), source: "onboarding-nutrition" });
    syncCalculatedCalories(plan.target);

    if (answers.nutritionMode === "manual") {
        localStorage.setItem(MANUAL_TARGET_KEY, String(plan.target));
        setMaintenanceUpdateMode("track");
    } else {
        setMaintenanceUpdateMode(answers.coachUpdateMode === "automatic" ? "automatic" : "review");
    }

    saveTrainingPreferences({ nutritionSetupComplete: true, nutritionSetupSkipped: false, nutritionSetupHandledAt: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent("levelup:nutrition-mode-updated", { detail: { mode: answers.nutritionMode, updateMode: getMaintenanceUpdateMode() } }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));
    step = NUTRITION_STEPS;
    render();
}

function suggest(goal) {
    if (goal === "build_muscle") return "bulk_conservative";
    if (goal === "lose_fat_maintain_muscle") return "cut_gentle";
    if (goal === "maintain_muscle") return "maintain";
    return "";
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}
