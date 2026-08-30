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
from "./tdee-calculator.js?v=nutrition-dashboard-1";

import {
    getNutritionProfile,
    saveNutritionProfile,
    getNutritionGoal,
    saveNutritionGoal,
    getNutritionMacroPreference,
    saveNutritionMacroPreference
}
from "./nutrition-storage.js?v=nutrition-dashboard-1";

import {
    UNIT_KINDS,
    isMetric,
    kilogramsToPounds,
    poundsToKilograms,
    centimetersToInches,
    inchesToCentimeters,
    massUnit
}
from "../core/unit-system.js?v=granular-units-1";


const GOAL_WEIGHT_STORAGE_KEY =
    "level_up_goal_weight";


export function renderEnergyProfile() {
    return `
        <section class="section-card nutrition-planner-shell">

            <div id="nutrition-planner-dashboard" class="nutrition-planner-dashboard">
                <span class="eyebrow">NUTRITION PLANNER</span>
                <h2>Your Nutrition Plan</h2>
                <p class="section-description">
                    Review the essentials at a glance, then open only the section you want to change.
                </p>

                <div class="nutrition-plan-summary">
                    <div>
                        <span>Calories</span>
                        <strong id="planner-summary-calories">--</strong>
                    </div>
                    <div>
                        <span>Protein</span>
                        <strong id="planner-summary-protein">--</strong>
                    </div>
                    <div>
                        <span>Current Goal</span>
                        <strong id="planner-summary-goal">Not set</strong>
                    </div>
                    <div>
                        <span>Goal Weight</span>
                        <strong id="planner-summary-goal-weight">--</strong>
                    </div>
                </div>

                <div class="nutrition-planner-grid" aria-label="Nutrition planner sections">
                    <button class="nutrition-planner-card" type="button" data-nutrition-view="profile">
                        <span class="nutrition-planner-icon">👤</span>
                        <strong>Body Profile</strong>
                        <small>Age, height, weight & TDEE</small>
                    </button>

                    <button class="nutrition-planner-card" type="button" data-nutrition-view="goals">
                        <span class="nutrition-planner-icon">🎯</span>
                        <strong>Goals & Calories</strong>
                        <small>Cut, maintain or lean bulk</small>
                    </button>

                    <button class="nutrition-planner-card" type="button" data-nutrition-view="macros">
                        <span class="nutrition-planner-icon">🥩</span>
                        <strong>Protein & Macros</strong>
                        <small>Daily nutrition targets</small>
                    </button>

                    <button class="nutrition-planner-card" type="button" data-nutrition-view="projection">
                        <span class="nutrition-planner-icon">📉</span>
                        <strong>Goal Projection</strong>
                        <small>Weight timeline & forecast</small>
                    </button>
                </div>
            </div>


            <div class="nutrition-planner-view" data-planner-view="profile" hidden>
                ${renderBackButton()}

                <span class="eyebrow">BODY PROFILE</span>
                <h2>Body Profile & Energy Needs</h2>
                <p class="section-description">
                    Save your profile once and use it as the starting point for nutrition planning.
                    Estimated energy needs are a starting estimate, not a guarantee of true maintenance calories.
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
                    ${isMetric(UNIT_KINDS.LENGTH)
                        ? `<input id="nutrition-height-cm" data-unit-input-ignore type="number" min="90" max="250" step="0.1" placeholder="Centimetres">`
                        : `<div class="nutrition-height-grid">
                            <input id="nutrition-height-feet" data-unit-input-ignore type="number" min="3" max="8" step="1" placeholder="Feet">
                            <input id="nutrition-height-inches" data-unit-input-ignore type="number" min="0" max="11" step="1" placeholder="Inches">
                        </div>`}

                    <label for="nutrition-weight">Current Weight (${massUnit(UNIT_KINDS.BODY_WEIGHT)})</label>
                    <input id="nutrition-weight" data-unit-input-ignore type="number" min="1" step="0.1" placeholder="Weight">

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
            </div>


            <div class="nutrition-planner-view" data-planner-view="goals" hidden>
                ${renderBackButton()}

                <span class="eyebrow">GOALS & CALORIES</span>
                <h2>Choose Your Nutrition Goal</h2>
                <p class="section-description">
                    Level Up uses simple daily calorie adjustments as a starting point.
                    The common 3,500 kcal-per-pound rule is an approximation, so actual progress may differ.
                </p>

                <div class="goal-box nutrition-goal-card">
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
                                <h3>Estimated TDEE</h3>
                                <p id="nutrition-goal-maintenance">--</p>
                            </div>
                        </div>

                        <div class="metric-card">
                            <div>
                                <h3>Daily Adjustment</h3>
                                <p id="nutrition-goal-adjustment">--</p>
                            </div>
                        </div>

                        <div class="metric-card">
                            <div>
                                <h3>Target Weekly Change</h3>
                                <p id="nutrition-goal-weekly-rate">--</p>
                            </div>
                        </div>

                        <div class="metric-card">
                            <div>
                                <h3>Recommended Calories</h3>
                                <p id="nutrition-goal-calories">--</p>
                            </div>
                        </div>
                    </div>

                    <p id="nutrition-goal-message" class="nutrition-message" aria-live="polite"></p>
                    <small>
                        Adult-use estimate only. Treat this as a starting point and adjust from real-world
                        weight trends, training performance, recovery and professional guidance.
                    </small>
                </div>
            </div>


            <div class="nutrition-planner-view" data-planner-view="macros" hidden>
                ${renderBackButton()}

                <span class="eyebrow">PROTEIN & MACROS</span>
                <h2>Daily Macro Starting Point</h2>
                <p class="section-description">
                    Use your saved calorie target to create a simple protein, carbohydrate and fat starting point.
                </p>

                <div class="goal-box nutrition-goal-card">
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
                        Carbohydrate and fat are flexible starting allocations, not required ratios.
                    </small>
                </div>
            </div>

        </section>
    `;
}


function renderBackButton() {
    return `
        <button class="nutrition-planner-back" type="button" data-nutrition-back>
            ← Nutrition Planner
        </button>
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

    initializePlannerNavigation();
    refreshPlannerSummary();

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

    window.addEventListener(
        "levelup:nutrition-updated",
        refreshPlannerSummary
    );
}


function initializePlannerNavigation() {
    document
        .querySelectorAll("[data-nutrition-view]")
        .forEach(button => {
            button.addEventListener("click", () => {
                showPlannerView(button.dataset.nutritionView);
            });
        });

    document
        .querySelectorAll("[data-nutrition-back]")
        .forEach(button => {
            button.addEventListener("click", () => {
                showPlannerDashboard();
            });
        });
}


function showPlannerView(viewName) {
    const dashboard =
        document.getElementById("nutrition-planner-dashboard");

    if (dashboard) {
        dashboard.hidden = true;
    }

    document
        .querySelectorAll("[data-planner-view]")
        .forEach(section => {
            section.hidden =
                section.dataset.plannerView !== viewName;
        });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function showPlannerDashboard() {
    document
        .querySelectorAll("[data-planner-view]")
        .forEach(section => {
            section.hidden = true;
        });

    const dashboard =
        document.getElementById("nutrition-planner-dashboard");

    if (dashboard) {
        dashboard.hidden = false;
    }

    refreshPlannerSummary();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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

    refreshPlannerSummary();

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

    refreshPlannerSummary();

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

    refreshPlannerSummary();

    if (message) {
        message.textContent = "Macro preference saved.";
    }
}


function readProfileFromForm() {
    const age = Number(document.getElementById("nutrition-age")?.value);
    const sex = document.getElementById("nutrition-sex")?.value;
    const activity = document.getElementById("nutrition-activity")?.value;
    const enteredWeight = Number(document.getElementById("nutrition-weight")?.value);

    let heightFeet;
    let heightInches;
    let heightCm;
    let weightLb;
    let weightKg;

    if (isMetric(UNIT_KINDS.LENGTH)) {
        heightCm = Number(document.getElementById("nutrition-height-cm")?.value);
        const totalInches = centimetersToInches(heightCm);
        heightFeet = Math.floor(totalInches / 12);
        heightInches = Number((totalInches - heightFeet * 12).toFixed(2));
    }
    else {
        heightFeet = Number(document.getElementById("nutrition-height-feet")?.value);
        heightInches = Number(document.getElementById("nutrition-height-inches")?.value);
        heightCm = inchesToCentimeters(heightFeet * 12 + heightInches);
    }
    if (isMetric(UNIT_KINDS.BODY_WEIGHT)) {
        weightKg = enteredWeight;
        weightLb = kilogramsToPounds(weightKg);
    } else {
        weightLb = enteredWeight;
        weightKg = poundsToKilograms(weightLb);
    }

    if (
        !Number.isFinite(age) || age < 18 ||
        !["male", "female"].includes(sex) ||
        !Number.isFinite(heightCm) || heightCm < 90 || heightCm > 250 ||
        !Number.isFinite(weightLb) || weightLb <= 0 ||
        !ACTIVITY_LEVELS[activity]
    ) {
        return null;
    }

    return { age, sex, heightFeet, heightInches, weightLb, activity, heightCm, weightKg };
}


function populateProfile(profile) {
    const heightCm = Number(profile.heightCm) || feetAndInchesToCm(profile.heightFeet, profile.heightInches);
    const weightLb = Number(profile.weightLb) || kilogramsToPounds(profile.weightKg);

    setValue("nutrition-age", profile.age);
    setValue("nutrition-sex", profile.sex);

    if (isMetric(UNIT_KINDS.LENGTH)) {
        setValue("nutrition-height-cm", Number(heightCm.toFixed(1)));
    }
    else {
        const totalInches = centimetersToInches(heightCm);
        const feet = Number.isFinite(Number(profile.heightFeet)) ? Number(profile.heightFeet) : Math.floor(totalInches / 12);
        const inches = Number.isFinite(Number(profile.heightInches)) ? Number(profile.heightInches) : Number((totalInches - feet * 12).toFixed(1));
        setValue("nutrition-height-feet", feet);
        setValue("nutrition-height-inches", inches);
    }
    setValue("nutrition-weight", isMetric(UNIT_KINDS.BODY_WEIGHT)
        ? Number(poundsToKilograms(weightLb).toFixed(1))
        : Number(weightLb.toFixed(1)));

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
    const adjustmentElement = document.getElementById("nutrition-goal-adjustment");
    const weeklyRateElement = document.getElementById("nutrition-goal-weekly-rate");
    const caloriesElement = document.getElementById("nutrition-goal-calories");

    if (!target) {
        if (maintenanceElement) maintenanceElement.textContent = "--";
        if (adjustmentElement) adjustmentElement.textContent = "--";
        if (weeklyRateElement) weeklyRateElement.textContent = "--";
        if (caloriesElement) caloriesElement.textContent = "--";
        return;
    }

    if (maintenanceElement) {
        maintenanceElement.textContent = `${results.tdee.toLocaleString()} kcal/day`;
    }

    if (adjustmentElement) {
        const value = target.dailyCalorieAdjustment;
        adjustmentElement.textContent =
            `${value > 0 ? "+" : ""}${value.toLocaleString()} kcal/day`;
    }

    if (weeklyRateElement) {
        const rate = target.weeklyWeightChangeLb;
        weeklyRateElement.textContent =
            rate === 0
                ? "Maintain"
                : `${rate > 0 ? "+" : ""}${rate.toFixed(2).replace(/\.00$/, "")} lb/week`;
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


function refreshPlannerSummary() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const macroPreference = getNutritionMacroPreference();

    let calorieText = "--";
    let proteinText = "--";
    let goalText = "Not set";

    if (profile && goal?.goalId && GOAL_PRESETS[goal.goalId]) {
        const energy = getEnergyResults(profile);
        const goalTarget = calculateGoalCalories(
            energy.tdee,
            goal.goalId
        );

        if (goalTarget) {
            calorieText = `${goalTarget.calories.toLocaleString()} kcal`;
            goalText = goalTarget.label;

            const macros = calculateMacroTargets({
                calories: goalTarget.calories,
                weightKg:
                    profile.weightKg ||
                    poundsToKg(profile.weightLb),
                macroPreset:
                    macroPreference?.macroPreset ||
                    "balanced"
            });

            if (macros) {
                proteinText = `${macros.protein} g`;
            }
        }
    }

    const goalWeight = Number(
        localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY)
    );

    setText("planner-summary-calories", calorieText);
    setText("planner-summary-protein", proteinText);
    setText("planner-summary-goal", goalText);
    setText(
        "planner-summary-goal-weight",
        Number.isFinite(goalWeight) && goalWeight > 0
            ? `${goalWeight.toFixed(1)} lb`
            : "--"
    );
}


function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}
