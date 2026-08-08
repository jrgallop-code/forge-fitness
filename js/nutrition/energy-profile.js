import {
    ACTIVITY_LEVELS,
    GOAL_PRESETS,
    calculateTdee,
    calculateGoalCalories,
    poundsToKg,
    feetAndInchesToCm
}
from "./tdee-calculator.js?v=nutrition-goals-2";

import {
    getNutritionProfile,
    saveNutritionProfile,
    getNutritionGoal,
    saveNutritionGoal
}
from "./nutrition-storage.js?v=nutrition-goals-2";


export function renderEnergyProfile() {
    return `
        <section class="section-card">
            <span class="eyebrow">NUTRITION PROFILE</span>
            <h2>Body Profile & Energy Needs</h2>
            <p class="section-description">
                Save your profile once and use it as the starting point for
                nutrition planning. Estimated energy needs are a starting
                estimate, not a guarantee of true maintenance calories.
            </p>

            <div class="weight-entry-card">
                <label for="nutrition-age">Age</label>
                <input id="nutrition-age" type="number" min="18" step="1" placeholder="Age">

                <label for="nutrition-sex">Sex used for equation</label>
                <select id="nutrition-sex">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>

                <label>Height</label>
                <div class="nutrition-height-grid">
                    <input id="nutrition-height-feet" type="number" min="3" max="8" step="1" placeholder="Feet">
                    <input id="nutrition-height-inches" type="number" min="0" max="11" step="1" placeholder="Inches">
                </div>

                <label for="nutrition-weight">Current Weight (lb)</label>
                <input id="nutrition-weight" type="number" min="1" step="0.1" placeholder="Weight">

                <label for="nutrition-activity">Activity Level</label>
                <select id="nutrition-activity">
                    ${Object.entries(ACTIVITY_LEVELS).map(([value, level]) => `
                        <option value="${value}">
                            ${level.label} — ${level.description}
                        </option>
                    `).join("")}
                </select>

                <button id="save-nutrition-profile-btn" class="primary-btn" type="button">
                    Save Profile & Calculate
                </button>
            </div>

            <div class="weight-summary nutrition-energy-summary">
                <div class="metric-card">
                    <div>
                        <h3>Estimated BMR</h3>
                        <p id="nutrition-bmr">--</p>
                    </div>
                </div>

                <div class="metric-card">
                    <div>
                        <h3>Estimated TDEE</h3>
                        <p id="nutrition-tdee">--</p>
                    </div>
                </div>
            </div>

            <p class="nutrition-message" id="nutrition-profile-message" aria-live="polite"></p>

            <div class="goal-box nutrition-goal-card">
                <h3>Nutrition Goal</h3>
                <p class="section-description">
                    Choose an adult nutrition phase. Level Up uses a conservative
                    percentage of your estimated maintenance calories as a starting point.
                </p>

                <label for="nutrition-goal-select">Goal</label>
                <select id="nutrition-goal-select">
                    <option value="">Choose a goal</option>
                    ${Object.entries(GOAL_PRESETS).map(([value, goal]) => `
                        <option value="${value}">${goal.label}</option>
                    `).join("")}
                </select>

                <div id="nutrition-goal-description" class="nutrition-message"></div>

                <button id="save-nutrition-goal-btn" class="primary-btn" type="button">
                    Save Nutrition Goal
                </button>

                <div class="weight-summary nutrition-energy-summary">
                    <div class="metric-card">
                        <div>
                            <h3>Estimated Maintenance</h3>
                            <p id="nutrition-goal-maintenance">--</p>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div>
                            <h3>Starting Calorie Target</h3>
                            <p id="nutrition-goal-calories">--</p>
                        </div>
                    </div>
                </div>

                <p id="nutrition-goal-message" class="nutrition-message" aria-live="polite"></p>
                <small>
                    Adult-use estimate only. Treat this as a starting point and adjust from
                    real-world weight trends, training performance, recovery and professional guidance.
                </small>
            </div>
        </section>
    `;
}


export function initializeEnergyProfile() {
    const savedProfile = getNutritionProfile();
    const savedGoal = getNutritionGoal();

    if (savedProfile) {
        populateProfile(savedProfile);
        updateEstimate(savedProfile);
    }

    if (savedGoal) {
        setValue("nutrition-goal-select", savedGoal.goalId);
        updateGoalDescription(savedGoal.goalId);
    }

    if (savedProfile && savedGoal) {
        updateGoalDisplay(savedProfile, savedGoal.goalId);
    }

    document
        .getElementById("save-nutrition-profile-btn")
        ?.addEventListener("click", saveProfileFromForm);

    document
        .getElementById("nutrition-goal-select")
        ?.addEventListener("change", event => {
            updateGoalDescription(event.target.value);
        });

    document
        .getElementById("save-nutrition-goal-btn")
        ?.addEventListener("click", saveGoalFromForm);
}


function saveProfileFromForm() {
    const profile = readProfileFromForm();
    const message = document.getElementById("nutrition-profile-message");

    if (!profile) {
        if (message) {
            message.textContent = "Please complete all profile fields with valid adult values.";
        }
        return;
    }

    saveNutritionProfile(profile);
    updateEstimate(profile);

    const savedGoal = getNutritionGoal();
    if (savedGoal?.goalId) {
        updateGoalDisplay(profile, savedGoal.goalId);
    }

    if (message) {
        message.textContent = "Profile saved. Your energy estimate has been updated.";
    }
}


function saveGoalFromForm() {
    const profile = getNutritionProfile();
    const goalId = document.getElementById("nutrition-goal-select")?.value;
    const message = document.getElementById("nutrition-goal-message");

    if (!profile) {
        if (message) {
            message.textContent = "Save your Body Profile first so Level Up can estimate maintenance calories.";
        }
        return;
    }

    if (!GOAL_PRESETS[goalId]) {
        if (message) {
            message.textContent = "Choose a nutrition goal first.";
        }
        return;
    }

    if (!Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        if (message) {
            message.textContent = "Calorie-target planning in this tool is for adults only.";
        }
        return;
    }

    const goal = {
        goalId,
        updatedAt: new Date().toISOString()
    };

    saveNutritionGoal(goal);
    updateGoalDisplay(profile, goalId);

    if (message) {
        message.textContent = "Nutrition goal saved.";
    }
}


function readProfileFromForm() {
    const age = Number(document.getElementById("nutrition-age")?.value);
    const sex = document.getElementById("nutrition-sex")?.value;
    const heightFeet = Number(document.getElementById("nutrition-height-feet")?.value);
    const heightInches = Number(document.getElementById("nutrition-height-inches")?.value);
    const weightLb = Number(document.getElementById("nutrition-weight")?.value);
    const activity = document.getElementById("nutrition-activity")?.value;

    if (
        !Number.isFinite(age) || age < 18 ||
        !["male", "female"].includes(sex) ||
        !Number.isFinite(heightFeet) || heightFeet <= 0 ||
        !Number.isFinite(heightInches) || heightInches < 0 || heightInches > 11 ||
        !Number.isFinite(weightLb) || weightLb <= 0 ||
        !ACTIVITY_LEVELS[activity]
    ) {
        return null;
    }

    return {
        age,
        sex,
        heightFeet,
        heightInches,
        weightLb,
        activity,
        heightCm: feetAndInchesToCm(heightFeet, heightInches),
        weightKg: poundsToKg(weightLb)
    };
}


function populateProfile(profile) {
    setValue("nutrition-age", profile.age);
    setValue("nutrition-sex", profile.sex);
    setValue("nutrition-height-feet", profile.heightFeet);
    setValue("nutrition-height-inches", profile.heightInches);
    setValue("nutrition-weight", profile.weightLb);
    setValue("nutrition-activity", profile.activity);
}


function setValue(id, value) {
    const element = document.getElementById(id);

    if (element && value !== undefined && value !== null) {
        element.value = value;
    }
}


function getEnergyResults(profile) {
    return calculateTdee({
        ...profile,
        heightCm:
            profile.heightCm ||
            feetAndInchesToCm(profile.heightFeet, profile.heightInches),
        weightKg:
            profile.weightKg ||
            poundsToKg(profile.weightLb)
    });
}


function updateEstimate(profile) {
    const results = getEnergyResults(profile);
    const bmrElement = document.getElementById("nutrition-bmr");
    const tdeeElement = document.getElementById("nutrition-tdee");

    if (bmrElement) {
        bmrElement.textContent = `${results.bmr.toLocaleString()} kcal/day`;
    }

    if (tdeeElement) {
        tdeeElement.textContent = `${results.tdee.toLocaleString()} kcal/day`;
    }
}


function updateGoalDescription(goalId) {
    const element = document.getElementById("nutrition-goal-description");
    const goal = GOAL_PRESETS[goalId];

    if (!element) {
        return;
    }

    element.textContent = goal
        ? goal.description
        : "";
}


function updateGoalDisplay(profile, goalId) {
    const results = getEnergyResults(profile);
    const target = calculateGoalCalories(results.tdee, goalId);
    const maintenanceElement = document.getElementById("nutrition-goal-maintenance");
    const caloriesElement = document.getElementById("nutrition-goal-calories");

    if (!target) {
        if (maintenanceElement) maintenanceElement.textContent = "--";
        if (caloriesElement) caloriesElement.textContent = "--";
        return;
    }

    if (maintenanceElement) {
        maintenanceElement.textContent = `${results.tdee.toLocaleString()} kcal/day`;
    }

    if (caloriesElement) {
        caloriesElement.textContent = `${target.calories.toLocaleString()} kcal/day`;
    }
}
