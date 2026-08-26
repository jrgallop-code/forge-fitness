export const ADAPTIVE_GUIDANCE_SETTINGS_KEY = "level_up_adaptive_guidance_settings";

export function getAdaptiveGuidanceSettings() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ADAPTIVE_GUIDANCE_SETTINGS_KEY) || "null");
        return {
            enabled: parsed?.enabled === true
        };
    }
    catch {
        return { enabled: false };
    }
}

export function renderAdaptiveGuidanceSettings() {
    const settings = getAdaptiveGuidanceSettings();
    return `
        <section class="dashboard-welcome">
            <div>
                <button class="nutrition-planner-back" id="adaptive-guidance-back" type="button">← More</button>
                <span class="eyebrow">WORKOUT PREFERENCES</span>
                <h2>Adaptive Guidance</h2>
                <p>Optional coaching based on the training information you choose to record.</p>
            </div>
        </section>
        <section class="section-card adaptive-settings-card">
            <div class="adaptive-settings-toggle-row">
                <div>
                    <strong>Adaptive Guidance</strong>
                    <small>Recovery, effort, volume and deload suggestions</small>
                </div>
                <label class="adaptive-settings-switch">
                    <input id="adaptive-guidance-toggle" type="checkbox" ${settings.enabled ? "checked" : ""}>
                    <span aria-hidden="true"></span>
                    <span class="sr-only">Enable Adaptive Guidance</span>
                </label>
            </div>
            <div class="adaptive-settings-details">
                <p><b>Everything is optional.</b> Skip recovery questions or leave RIR blank whenever you want.</p>
                <ul>
                    <li>Existing workout logging and progression continue normally.</li>
                    <li>Suggestions appear only when enough information is available.</li>
                    <li>No workout plan is changed without your approval.</li>
                </ul>
            </div>
            <p id="adaptive-settings-message" class="adaptive-settings-message" aria-live="polite"></p>
        </section>
    `;
}

export function initializeAdaptiveGuidanceSettings({ onBack } = {}) {
    document.getElementById("adaptive-guidance-back")?.addEventListener("click", () => onBack?.());
    document.getElementById("adaptive-guidance-toggle")?.addEventListener("change", event => {
        const enabled = event.target.checked === true;
        localStorage.setItem(ADAPTIVE_GUIDANCE_SETTINGS_KEY, JSON.stringify({ enabled }));
        const message = document.getElementById("adaptive-settings-message");
        if (message) message.textContent = enabled
            ? "Adaptive Guidance is on. All check-ins remain optional."
            : "Adaptive Guidance is off. Your existing workout tools are unchanged.";
        window.dispatchEvent(new CustomEvent("levelup:adaptive-settings-changed", { detail: { enabled } }));
    });
}
