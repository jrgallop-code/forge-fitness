export const DYNAMIC_WARMUP_MODE_KEY = "level_up_dynamic_warmup_mode";
const LAST_ENABLED_MODE_KEY = "level_up_dynamic_warmup_last_enabled_mode";
const VALID_MODES = new Set(["ask", "always", "off"]);

export function getDynamicWarmupMode() {
    try {
        const mode = localStorage.getItem(DYNAMIC_WARMUP_MODE_KEY);
        return VALID_MODES.has(mode) ? mode : "ask";
    }
    catch {
        return "ask";
    }
}

function getLastEnabledMode() {
    try {
        const mode = localStorage.getItem(LAST_ENABLED_MODE_KEY);
        return mode === "always" ? "always" : "ask";
    }
    catch {
        return "ask";
    }
}

function setDynamicWarmupMode(mode) {
    if (!VALID_MODES.has(mode)) return;
    try {
        localStorage.setItem(DYNAMIC_WARMUP_MODE_KEY, mode);
        if (mode !== "off") localStorage.setItem(LAST_ENABLED_MODE_KEY, mode);
    }
    catch {}
    window.dispatchEvent(new CustomEvent("levelup:dynamic-warmup-mode-changed", { detail: { mode } }));
}

export function renderDynamicWarmupSettings() {
    const mode = getDynamicWarmupMode();
    const enabled = mode !== "off";
    const selectedMode = enabled ? mode : getLastEnabledMode();
    return `
        <section class="dashboard-welcome">
            <div>
                <button class="nutrition-planner-back" id="dynamic-warmup-settings-back" type="button">← More</button>
                <span class="eyebrow">WORKOUT PREFERENCES</span>
                <h2>Dynamic Warm-Ups</h2>
                <p>Video-guided movement preparation selected for today's workout.</p>
            </div>
        </section>
        <section class="section-card adaptive-settings-card">
            <div class="adaptive-settings-toggle-row">
                <div>
                    <strong>Offer Dynamic Warm-Ups</strong>
                    <small>Show tailored movement preparation before lifting begins</small>
                </div>
                <label class="adaptive-settings-switch">
                    <input id="dynamic-warmup-enabled" type="checkbox" ${enabled ? "checked" : ""}>
                    <span aria-hidden="true"></span>
                    <span class="sr-only">Enable Dynamic Warm-Ups</span>
                </label>
            </div>
            <div class="adaptive-settings-details">
                <p><b>Everything is optional.</b> Start the routine, skip individual movements or skip the entire warm-up.</p>
                <p><b>When enabled</b></p>
                <div class="adaptive-option-row" id="dynamic-warmup-mode-options" role="radiogroup" aria-label="Dynamic warm-up behavior">
                    <button class="adaptive-rir-choice ${selectedMode === "ask" ? "selected" : ""}" type="button" role="radio" aria-checked="${selectedMode === "ask"}" data-dynamic-warmup-mode="ask" ${enabled ? "" : "disabled"}>Ask each workout</button>
                    <button class="adaptive-rir-choice ${selectedMode === "always" ? "selected" : ""}" type="button" role="radio" aria-checked="${selectedMode === "always"}" data-dynamic-warmup-mode="always" ${enabled ? "" : "disabled"}>Always show</button>
                </div>
                <p>Guided warm-ups do not count as working sets, volume, records or progression.</p>
            </div>
            <p id="dynamic-warmup-settings-message" class="adaptive-settings-message" aria-live="polite"></p>
        </section>
    `;
}

export function initializeDynamicWarmupSettings({ onBack } = {}) {
    document.getElementById("dynamic-warmup-settings-back")?.addEventListener("click", () => onBack?.());
    const toggle = document.getElementById("dynamic-warmup-enabled");
    const options = [...document.querySelectorAll("[data-dynamic-warmup-mode]")];
    const message = document.getElementById("dynamic-warmup-settings-message");

    const updateOptionState = (enabled, selectedMode) => {
        options.forEach(button => {
            const selected = button.dataset.dynamicWarmupMode === selectedMode;
            button.disabled = !enabled;
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-checked", String(selected));
        });
    };

    toggle?.addEventListener("change", event => {
        const enabled = event.target.checked === true;
        const mode = enabled ? getLastEnabledMode() : "off";
        setDynamicWarmupMode(mode);
        updateOptionState(enabled, enabled ? mode : getLastEnabledMode());
        if (message) message.textContent = enabled
            ? "Dynamic Warm-Ups are on."
            : "Dynamic Warm-Ups are off.";
    });

    options.forEach(button => button.addEventListener("click", () => {
        if (!toggle?.checked) return;
        const mode = button.dataset.dynamicWarmupMode;
        setDynamicWarmupMode(mode);
        updateOptionState(true, mode);
        if (message) message.textContent = mode === "always"
            ? "Dynamic Warm-Ups will open automatically."
            : "You will be asked at the start of each workout.";
    }));
}
