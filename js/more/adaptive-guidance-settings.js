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
                <h2 class="adaptive-title-with-badge">Adaptive Guidance <span class="adaptive-beta-badge">BETA</span></h2>
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
            <div class="adaptive-deload-preview-card">
                <div>
                    <strong>Preview deload suggestion</strong>
                    <small>Test the recommendation and recovery-week explanation without changing your data.</small>
                </div>
                <button class="secondary-btn" id="adaptive-deload-preview-open" type="button">Preview</button>
            </div>
            <p id="adaptive-settings-message" class="adaptive-settings-message" aria-live="polite"></p>
        </section>
    `;
}

export function initializeAdaptiveGuidanceSettings({ onBack } = {}) {
    document.getElementById("adaptive-guidance-back")?.addEventListener("click", () => onBack?.());
    document.getElementById("adaptive-deload-preview-open")?.addEventListener("click", showDeloadPreview);
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

function showDeloadPreview() {
    document.querySelector(".adaptive-deload-preview-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "adaptive-info-overlay adaptive-deload-preview-overlay";
    document.body.appendChild(overlay);
    renderDeloadPreviewStage(overlay, "recommendation");
    overlay.addEventListener("click", event => {
        if (event.target === overlay || event.target.closest?.("[data-deload-preview-close]")) overlay.remove();
        if (event.target.closest?.("[data-deload-preview-start]")) renderDeloadPreviewStage(overlay, "recovery-week");
    });
}

function renderDeloadPreviewStage(overlay, stage) {
    if (stage === "recovery-week") {
        overlay.innerHTML = `
            <section class="adaptive-info-sheet adaptive-deload-preview-sheet" role="dialog" aria-modal="true" aria-labelledby="adaptive-deload-preview-title">
                <span class="adaptive-preview-label">PREVIEW · NO DATA CHANGES</span>
                <h3 id="adaptive-deload-preview-title">Recovery week</h3>
                <div class="adaptive-deload-banner adaptive-deload-preview-banner">
                    <strong>Recovery week active</strong>
                    <p>Progression prompts pause while training targets are reduced.</p>
                </div>
                <ul class="adaptive-deload-preview-rules">
                    <li><b>Early week:</b> about 85% of your usual load</li>
                    <li><b>Later week:</b> about 67% of your usual load</li>
                    <li><b>Sets and reps:</b> reduced to about two-thirds</li>
                    <li><b>Effort:</b> keep at least 5 RIR</li>
                </ul>
                <p class="adaptive-preview-note">This preview has not started a deload or changed your plan.</p>
                <button class="primary-btn" type="button" data-deload-preview-close>Done</button>
            </section>`;
        return;
    }

    overlay.innerHTML = `
        <section class="adaptive-info-sheet adaptive-deload-preview-sheet" role="dialog" aria-modal="true" aria-labelledby="adaptive-deload-preview-title">
            <span class="adaptive-preview-label">PREVIEW · NO DATA CHANGES</span>
            <h3 id="adaptive-deload-preview-title">Coach Summary</h3>
            <p>Suggestions only—nothing changes unless you apply it.</p>
            <article class="adaptive-recommendation">
                <strong>Recovery week recommended</strong>
                <p>Recovery and performance are declining.</p>
                <div class="adaptive-recommendation-actions">
                    <button class="primary-btn" type="button" data-deload-preview-start>Start deload</button>
                    <button class="secondary-btn" type="button" data-deload-preview-close>Keep current</button>
                </div>
            </article>
        </section>`;
}
