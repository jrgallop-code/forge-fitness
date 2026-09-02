import { getNutritionProfile, saveNutritionProfile } from "../nutrition/nutrition-storage.js?v=profile-appearance-1";
import { getTrainingPreferences, saveTrainingPreferences } from "../core/training-preferences.js?v=onboarding-1";
import {
    UNIT_KINDS,
    isMetric,
    inchesToCentimeters,
    centimetersToInches,
    poundsToKilograms,
    kilogramsToPounds
} from "../core/unit-system.js?v=granular-units-1";

const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");

export function renderProfileAppearance() {
    const profile = getNutritionProfile() || {};
    const preferences = getTrainingPreferences();
    const metricHeight = isMetric(UNIT_KINDS.LENGTH);
    const metricWeight = isMetric(UNIT_KINDS.BODY_WEIGHT);
    const sex = profile.sex === "female" ? "female" : "male";
    const heightFields = metricHeight
        ? `<label>Height (cm)<input data-unit-input-ignore name="heightCm" type="number" step="0.1" min="90" max="250" value="${esc(profile.heightCm)}" placeholder="Optional"></label>`
        : `<label>Height (ft)<input data-unit-input-ignore name="heightFeet" type="number" min="3" max="8" value="${esc(profile.heightFeet)}" placeholder="ft"></label><label>Height (in)<input data-unit-input-ignore name="heightInches" type="number" min="0" max="11" step="0.1" value="${esc(profile.heightInches)}" placeholder="in"></label>`;
    const weightField = metricWeight
        ? `<label>Weight (kg)<input data-unit-input-ignore name="weightKg" type="number" step="0.1" min="1" value="${esc(profile.weightKg)}" placeholder="Optional"></label>`
        : `<label>Weight (lb)<input data-unit-input-ignore name="weightLb" type="number" step="0.1" min="1" value="${esc(profile.weightLb)}" placeholder="Optional"></label>`;

    return `<section class="dashboard-welcome"><div><button class="nutrition-planner-back" id="profile-appearance-back" type="button">← More</button><span class="eyebrow">YOUR ACCOUNT</span><h2>Body Profile</h2><p>Update your name and personal details without repeating onboarding. Your anatomy maps update from the sex selected here.</p></div></section><section class="profile-appearance-card"><form id="profile-appearance-form"><div class="profile-appearance-grid"><label class="profile-name-field">Name or username <small>Used in your dashboard greeting</small><input name="displayName" type="text" autocomplete="nickname" maxlength="40" value="${esc(profile.displayName)}" placeholder="What should we call you?"></label></div><fieldset><legend>Anatomy appearance</legend><div class="profile-sex-options" role="radiogroup" aria-label="Anatomy appearance"><label><input type="radio" name="sex" value="male" ${sex === "male" ? "checked" : ""}> Male</label><label><input type="radio" name="sex" value="female" ${sex === "female" ? "checked" : ""}> Female</label></div><small>If no choice is saved, Level Up uses the male anatomy by default.</small></fieldset><div class="profile-appearance-grid"><label>Age<input name="age" type="number" min="18" max="100" value="${esc(profile.age)}" placeholder="Optional"></label>${heightFields}${weightField}<label>Training experience<select name="experience"><option value="">Not set</option><option value="new" ${preferences.experience === "new" ? "selected" : ""}>Beginner</option><option value="intermediate" ${preferences.experience === "intermediate" ? "selected" : ""}>Intermediate</option><option value="experienced" ${["experienced", "advanced"].includes(preferences.experience) ? "selected" : ""}>Experienced</option></select></label></div><p class="profile-appearance-status" aria-live="polite"></p><button class="primary-btn" type="submit">Save Profile</button><button class="secondary-btn" type="button" data-review-full-setup>Review Full Training Setup</button></form></section>`;
}

export function initializeProfileAppearance({ onBack } = {}) {
    document.getElementById("profile-appearance-back")?.addEventListener("click", () => onBack?.());
    document.querySelector("[data-review-full-setup]")?.addEventListener("click", () => document.dispatchEvent(new CustomEvent("levelup:open-profile-setup")));
    document.getElementById("profile-appearance-form")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const existing = getNutritionProfile() || {};
        const metricHeight = isMetric(UNIT_KINDS.LENGTH);
        const metricWeight = isMetric(UNIT_KINDS.BODY_WEIGHT);

        let heightCm;
        if (metricHeight) {
            heightCm = Number(form.get("heightCm"));
        } else {
            const feet = Number(form.get("heightFeet"));
            const inches = Number(form.get("heightInches"));
            heightCm = Number.isFinite(feet) && Number.isFinite(inches)
                ? inchesToCentimeters(feet * 12 + inches)
                : Number(existing.heightCm);
        }

        let weightKg;
        if (metricWeight) {
            weightKg = Number(form.get("weightKg"));
        } else {
            const pounds = Number(form.get("weightLb"));
            weightKg = Number.isFinite(pounds) && pounds > 0
                ? poundsToKilograms(pounds)
                : Number(existing.weightKg);
        }

        const totalInches = centimetersToInches(heightCm);
        const feet = Math.floor(totalInches / 12);
        const inches = Number((totalInches - feet * 12).toFixed(1));
        const weightLb = kilogramsToPounds(weightKg);
        const age = Number(form.get("age"));
        saveNutritionProfile({
            ...existing,
            displayName: String(form.get("displayName") || "").trim().replace(/\s+/g, " ").slice(0, 40),
            sex: form.get("sex") === "female" ? "female" : "male",
            ...(Number.isFinite(age) && age > 0 ? { age } : {}),
            ...(Number.isFinite(heightCm) && heightCm > 0 ? { heightCm, heightFeet: feet, heightInches: inches } : {}),
            ...(Number.isFinite(weightKg) && weightKg > 0 ? { weightKg, weightLb } : {})
        });

        const experience = String(form.get("experience") || "");
        if (experience) saveTrainingPreferences({ experience });
        window.dispatchEvent(new CustomEvent("levelup:profile-updated"));
        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
        const status = document.querySelector(".profile-appearance-status");
        if (status) status.textContent = "Profile saved. Your dashboard greeting is updated.";
    });
}
