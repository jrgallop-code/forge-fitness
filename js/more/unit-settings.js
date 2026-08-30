import { getUnitPreferences, setUnitPreferences } from "../core/unit-system.js?v=granular-units-1";

const GROUPS = [
    { key: "bodyWeight", label: "Body weight", detail: "Weigh-ins, goal weight and nutrition profile", options: [["lb", "Pounds", "lb"], ["kg", "Kilograms", "kg"]] },
    { key: "liftingWeight", label: "Workout weights", detail: "Exercise loads, estimated 1RM and training volume", options: [["lb", "Pounds", "lb"], ["kg", "Kilograms", "kg"]] },
    { key: "distance", label: "Cardio distance", detail: "Walking, running, cycling and speed", options: [["km", "Kilometres", "km"], ["mi", "Miles", "mi"]] },
    { key: "length", label: "Height & measurements", detail: "Height, waist and other body measurements", options: [["cm", "Centimetres", "cm"], ["in", "Feet/inches", "ft / in"]] }
];

export function renderUnitSettings() {
    ensureUnitSettingsStyles();
    const current = getUnitPreferences();
    return `<section class="dashboard-welcome"><div><button class="nutrition-planner-back" id="unit-settings-back" type="button">← More</button><span class="eyebrow">PREFERENCES</span><h2>Units</h2><p>Choose the units that fit how you actually measure things. Mix pounds with kilometres or any other combination.</p></div></section>
        <section class="section-card unit-settings-card">
            <div class="unit-settings-heading"><div><span class="eyebrow">DISPLAY & ENTRY</span><h3>Measurement Units</h3></div></div>
            <div class="unit-settings-groups">${GROUPS.map(group => renderGroup(group, current)).join("")}</div>
            <p class="unit-settings-status" aria-live="polite"></p>
            <p class="unit-settings-note">Changing units only changes how values are entered and displayed. Your saved training, weight and measurement records remain intact.</p>
        </section>`;
}

function renderGroup(group, current) {
    return `<fieldset class="unit-settings-group"><legend>${group.label}</legend><small>${group.detail}</small><div class="unit-settings-options" role="radiogroup" aria-label="${group.label}">${group.options.map(([value, label, short]) => `<button type="button" data-unit-kind="${group.key}" data-unit-value="${value}" role="radio" aria-checked="${current[group.key] === value}" class="${current[group.key] === value ? "selected" : ""}"><strong>${label}</strong><small>${short}</small></button>`).join("")}</div></fieldset>`;
}

export function initializeUnitSettings({ onBack } = {}) {
    document.getElementById("unit-settings-back")?.addEventListener("click", () => onBack?.());
    document.querySelectorAll("[data-unit-kind][data-unit-value]").forEach(button => {
        button.addEventListener("click", () => {
            const kind = button.dataset.unitKind;
            const value = button.dataset.unitValue;
            if (getUnitPreferences()[kind] === value) return;
            setUnitPreferences({ [kind]: value });
            document.querySelectorAll(`[data-unit-kind="${kind}"]`).forEach(option => {
                const selected = option.dataset.unitValue === value;
                option.classList.toggle("selected", selected);
                option.setAttribute("aria-checked", String(selected));
            });
            const status = document.querySelector(".unit-settings-status");
            if (status) status.textContent = "Unit preference saved.";
        });
    });
}

function ensureUnitSettingsStyles() {
    if (document.querySelector('link[data-unit-settings-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/unit-settings.css?v=granular-units-1";
    link.dataset.unitSettingsStyles = "1";
    document.head.appendChild(link);
}
