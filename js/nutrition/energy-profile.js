import {
    ACTIVITY_LEVELS,
    GOAL_PRESETS,
    MACRO_PRESETS,
    calculateTdee,
    calculateGoalCalories,
    calculateMacroTargets,
    poundsToKg,
    feetAndInchesToCm
}
from "./tdee-calculator.js?v=nutrition-macros-1";

import {
    getNutritionProfile,
    saveNutritionProfile,
    getNutritionGoal,
    saveNutritionGoal,
    getNutritionMacroPreference,
    saveNutritionMacroPreference
}
from "./nutrition-storage.js?v=nutrition-macros-1";


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

            <div class="goal-box nutrition-goal-card">
                <h3>Protein & Macro Starting Point</h3>
                <p class="section-description">
                    After you save a Body Profile and Nutrition Goal, Level Up can
                    turn your calorie target into a simple daily macro starting point.
                </p>

                <label for="nutrition-macro-select">Macro Style</label>
                <select id="nutrition-macro-select">
                    ${Object.entries(MACRO_PRESETS).map(([value, preset]) => `
                        <option value="${value}">${preset.label}</option>
                    `).join("")}
                </select>

                <div id="nutrition-macro-description" class="nutrition-message"></div>

                <button id="save-nutrition-macro-btn" class="primary-btn" type="button">
                    Save Macro Preference
                </button>

                <div class="weight-summary nutrition-energy-summary">
                    <div class="metric-card">
                        <div>
                            <h3>Protein</h3>
                            <p id="nutrition-protein-target">--</p>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div>
                            <h3>Carbohydrate</h3>
                            <p id="nutrition-carb-target">--</p>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div>
                            <h3>Fat</h3>
                            <p id="nutrition-fat-target">--</p>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div>
                            <h3>Calories Used</h3>
                            <p id="nutrition-macro-calories">--</p>
                        </div>
                    </div>
                </div>

                <p id="nutrition-macro-message" class="nutrition-message" aria-live="polite"></p>
                <small>
                    Protein is set at about 1.6 g/kg/day for healthy adults doing resistance training.
                    Carbohydrate and fat are flexible starting allocations, not required targets.
                </small>
            </div>
        </section>
    `;
}


export function initializeEnergyProfile() {
    const savedProfile = getNutritionProfile();
    const savedGoal = getNutritionGoal();
    const savedMacro = getNutritionMacroPreference();

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

    const macroPreset =
        savedMacro?.macroPreset ||
        "balanced";

    setValue("nutrition-macro-select", macroPreset);
    updateMacroDescription(macroPreset);

    if (savedProfile && savedGoal) {
        updateMacroDisplay(
            savedProfile,
            savedGoal.goalId,
            macroPreset
        );
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

    document
        .getElementById("nutrition-macro-select")
        ?.addEventListener("change", event => {
            updateMacroDescription(event.target.value);
        });

    document
        .getElementById("save-nutrition-macro-btn")
        ?.addEventListener("click", saveMacroFromForm);
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
    const savedMacro = getNutritionMacroPreference();

    if (savedGoal?.goalId) {
        updateGoalDisplay(profile, savedGoal.goalId);
        updateMacroDisplay(
            profile,
            savedGoal.goalId,
            savedMacro?.macroPreset || "balanced"
        );
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

    const savedMacro = getNutritionMacroPreference();
    updateMacroDisplay(
        profile,
        goalId,
        savedMacro?.macroPreset || "balanced"
    );

    if (message) {
        message.textContent = "Nutrition goal saved.";
    }
}


function saveMacroFromForm() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const macroPreset =
        document.getElementById("nutrition-macro-select")?.value;
    const message =
        document.getElementById("nutrition-macro-message");

    if (!profile || !goal?.goalId) {
        if (message) {
            message.textContent = "Save your Body Profile and Nutrition Goal first.";
        }
        return;
    }

    if (!Number.isFinite(Number(profile.age)) || Number(profile.age) < 18) {
        if (message) {
            message.textContent = "Macro planning in this tool is for adults only.";
        }
        return;
    }

    if (!MACRO_PRESETS[macroPreset]) {
        if (message) {
            message.textContent = "Choose a macro style first.";
        }
        return;
    }

    saveNutritionMacroPreference({
        macroPreset,
        updatedAt: new Date().toISOString()
    });

    updateMacroDisplay(
        profile,
        goal.goalId,
        macroPreset
    );

    if (message) {
        message.textContent = "Macro preference saved.";
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


function updateMacroDescription(macroPreset) {
    const element =
        document.getElementById("nutrition-macro-description");
    const preset = MACRO_PRESETS[macroPreset];

    if (!element) {
        return;
    }

    element.textContent = preset
        ? preset.description
        : "";
}


function updateMacroDisplay(profile, goalId, macroPreset) {
    const results = getEnergyResults(profile);
    const goalTarget = calculateGoalCalories(results.tdee, goalId);

    const weightKg =
        profile.weightKg ||
        poundsToKg(profile.weightLb);

    const macros = goalTarget
        ? calculateMacroTargets({
            calories: goalTarget.calories,
            weightKg,
            macroPreset
        })
        : null;

    const proteinElement =
        document.getElementById("nutrition-protein-target");
    const carbElement =
        document.getElementById("nutrition-carb-target");
    const fatElement =
        document.getElementById("nutrition-fat-target");
    const caloriesElement =
        document.getElementById("nutrition-macro-calories");

    if (!macros) {
        if (proteinElement) proteinElement.textContent = "--";
        if (carbElement) carbElement.textContent = "--";
        if (fatElement) fatElement.textContent = "--";
        if (caloriesElement) caloriesElement.textContent = "--";
        return;
    }

    if (proteinElement) {
        proteinElement.textContent = `${macros.protein} g/day`;
    }

    if (carbElement) {
        carbElement.textContent = `${macros.carbs} g/day`;
    }

    if (fatElement) {
        fatElement.textContent = `${macros.fat} g/day`;
    }

    if (caloriesElement) {
        caloriesElement.textContent = `${macros.calories.toLocaleString()} kcal/day`;
    }
}
