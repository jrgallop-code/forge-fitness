import { getMaintenanceUpdateMode, setMaintenanceUpdateMode } from "./maintenance-check-in.js?v=calorie-authority-recovery-1";

const VALID_MODES = new Set(["review", "automatic"]);
let installed = false;

function syncControls(mode = getMaintenanceUpdateMode()) {
    document.querySelectorAll("[data-coach-update-choice]").forEach(control => {
        const value = control.dataset.coachUpdateChoice;
        const selected = value === mode;
        control.classList.toggle("is-selected", selected);
        control.setAttribute("aria-checked", String(selected));
        control.setAttribute("aria-pressed", String(selected));
    });
}

function applyChoice(control) {
    const mode = control?.dataset?.coachUpdateChoice;
    if (!VALID_MODES.has(mode)) return;

    const saved = setMaintenanceUpdateMode(mode);
    syncControls(saved);
    window.dispatchEvent(new CustomEvent("levelup:nutrition-mode-updated", {
        detail: { mode: "coach", updateMode: saved }
    }));
}

function installStyles() {
    if (document.getElementById("nutrition-mode-controls-fix-styles")) return;
    const style = document.createElement("style");
    style.id = "nutrition-mode-controls-fix-styles";
    style.textContent = `
        [data-coach-update-choice]{
            position:relative;
            z-index:2;
            pointer-events:auto!important;
            touch-action:manipulation;
            -webkit-tap-highlight-color:transparent;
            cursor:pointer;
        }
    `;
    document.head.appendChild(style);
}

export function initializeNutritionModeControls() {
    if (installed) return;
    installed = true;
    installStyles();

    // Capture the tap before any surrounding Goals & Plan handlers can consume it.
    // This is particularly important in the installed iOS PWA, where nested card
    // handlers can otherwise prevent these two controls from receiving the bubble click.
    document.addEventListener("click", event => {
        const control = event.target.closest?.("[data-coach-update-choice]");
        if (!control) return;
        event.preventDefault();
        event.stopPropagation();
        applyChoice(control);
    }, true);

    window.addEventListener("levelup:maintenance-mode-updated", event => {
        syncControls(event?.detail?.mode || getMaintenanceUpdateMode());
    });

    const observer = new MutationObserver(() => syncControls());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    syncControls();
}

if (typeof window !== "undefined" && typeof document !== "undefined") initializeNutritionModeControls();
