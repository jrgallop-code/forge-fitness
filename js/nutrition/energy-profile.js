import {
    ACTIVITY_LEVELS,
    calculateTdee,
    poundsToKg,
    feetAndInchesToCm
}
from "./tdee-calculator.js";

import {
    getNutritionProfile,
    saveNutritionProfile
}
from "./nutrition-storage.js";

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

            <div class="goal-box">
                <h3>Current Goal</h3>
                <p>Not selected yet</p>
                <small>Fat loss, maintenance and lean-bulk planning will be added in Stage 2.</small>
            </div>
        </section>
    `;
}

export function initializeEnergyProfile() {
    const savedProfile = getNutritionProfile();

    if (savedProfile) {
        populateProfile(savedProfile);
        updateEstimate(savedProfile);
    }

    document
        .getElementById("save-nutrition-profile-btn")
        ?.addEventListener("click", saveProfileFromForm);
}

function saveProfileFromForm() {
    const profile = readProfileFromForm();
    const message = document.getElementById("nutrition-profile-message");

    if (!profile) {
        if (message) {
            message.textContent = "Please complete all profile fields with valid values.";
        }
        return;
    }

    saveNutritionProfile(profile);
    updateEstimate(profile);

    if (message) {
        message.textContent = "Profile saved. Your energy estimate has been updated.";
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

function updateEstimate(profile) {
    const results = calculateTdee({
        ...profile,
        heightCm:
            profile.heightCm ||
            feetAndInchesToCm(profile.heightFeet, profile.heightInches),
        weightKg:
            profile.weightKg ||
            poundsToKg(profile.weightLb)
    });

    const bmrElement = document.getElementById("nutrition-bmr");
    const tdeeElement = document.getElementById("nutrition-tdee");

    if (bmrElement) {
        bmrElement.textContent = `${results.bmr.toLocaleString()} kcal/day`;
    }

    if (tdeeElement) {
        tdeeElement.textContent = `${results.tdee.toLocaleString()} kcal/day`;
    }
}
