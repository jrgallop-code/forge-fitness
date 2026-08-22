import { getUnitSystem, setUnitSystem } from "../core/unit-system.js?v=unit-system-1";

export function renderUnitSettings() {
    ensureUnitSettingsStyles();
    const current = getUnitSystem();
    return `<section class="dashboard-welcome"><div><button class="nutrition-planner-back" id="unit-settings-back" type="button">← More</button><span class="eyebrow">PREFERENCES</span><h2>Units</h2><p>Choose how Level Up displays and accepts measurements.</p></div></section>
        <section class="section-card unit-settings-card">
            <div class="unit-settings-heading"><div><span class="eyebrow">UNIT SYSTEM</span><h3>Measurement Units</h3></div></div>
            <div class="unit-settings-options" role="radiogroup" aria-label="Measurement units">
                <button type="button" data-unit-choice="imperial" role="radio" aria-checked="${current === "imperial"}" class="${current === "imperial" ? "selected" : ""}">
                    <strong>Imperial</strong><small>Pounds, feet/inches and miles</small>
                </button>
                <button type="button" data-unit-choice="metric" role="radio" aria-checked="${current === "metric"}" class="${current === "metric" ? "selected" : ""}">
                    <strong>Metric</strong><small>Kilograms, centimetres and kilometres</small>
                </button>
            </div>
            <p class="unit-settings-note">Switching units changes how values are entered and displayed. Your original training and body records remain intact.</p>
        </section>`;
}

export function initializeUnitSettings({ onBack } = {}) {
    document.getElementById("unit-settings-back")?.addEventListener("click", () => onBack?.());
    document.querySelectorAll("[data-unit-choice]").forEach(button => {
        button.addEventListener("click", () => {
            const next = button.dataset.unitChoice;
            if (next === getUnitSystem()) return;
            setUnitSystem(next, { reload: true });
        });
    });
}

function ensureUnitSettingsStyles() {
    if (document.querySelector('link[data-unit-settings-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/unit-settings.css?v=unit-system-1";
    link.dataset.unitSettingsStyles = "1";
    document.head.appendChild(link);
}
