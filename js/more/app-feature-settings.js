import { isNutritionEnabled, setNutritionEnabled } from "../core/app-feature-preferences.js?v=nutrition-feature-choice-1";

export function renderAppFeatureSettings() {
    const enabled = isNutritionEnabled();
    return `<section class="dashboard-welcome app-feature-settings-header">
        <div>
            <button class="nutrition-planner-back" type="button" data-feature-settings-back>← More</button>
            <span class="eyebrow">APP PREFERENCES</span>
            <h2>App Features</h2>
            <p>Choose whether nutrition tracking appears in Level Up. Your saved data is never deleted.</p>
        </div>
    </section>
    <section class="section-card app-feature-settings-card">
        <div class="adaptive-toggle-row">
            <div>
                <strong>Nutrition Tracking</strong>
                <span>Food logging, calorie targets and nutrition progress</span>
            </div>
            <label class="adaptive-switch">
                <input type="checkbox" data-nutrition-feature-toggle ${enabled ? "checked" : ""}>
                <span aria-hidden="true"></span>
                <span class="sr-only">Show Nutrition Tracking</span>
            </label>
        </div>
        <p class="app-feature-status" data-feature-status>${enabled ? "Nutrition is on and appears throughout the app." : "Nutrition is off and hidden from the app."}</p>
        <p class="app-feature-data-note"><strong>Your information stays safe.</strong> Turning nutrition off only hides it. Turn it back on anytime to restore your logs, goals and charts.</p>
    </section>`;
}

export function initializeAppFeatureSettings({ onBack } = {}) {
    document.querySelector("[data-feature-settings-back]")?.addEventListener("click", () => onBack?.());
    const toggle = document.querySelector("[data-nutrition-feature-toggle]");
    const status = document.querySelector("[data-feature-status]");
    toggle?.addEventListener("change", () => {
        const enabled = setNutritionEnabled(toggle.checked);
        if (status) status.textContent = enabled
            ? "Nutrition is on and appears throughout the app."
            : "Nutrition is off and hidden from the app.";
    });
}
