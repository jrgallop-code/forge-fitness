const STYLE_ID = "level-up-contextual-tutorial-theme-v1";

function ensureTutorialThemeStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        html[data-theme] .expenditure-tutorial-card {
            border-color: color-mix(in srgb, var(--accent) 34%, var(--card-border)) !important;
            background: color-mix(in srgb, var(--accent) 6%, var(--card)) !important;
            color: var(--text) !important;
            box-shadow: var(--shadow) !important;
        }
        html[data-theme] .expenditure-tutorial-progress {
            color: var(--muted) !important;
        }
        html[data-theme] .expenditure-tutorial-progress i {
            background: var(--line) !important;
        }
        html[data-theme] .expenditure-tutorial-progress i.is-active {
            background: var(--accent) !important;
        }
        html[data-theme] .expenditure-tutorial-icon {
            border-color: color-mix(in srgb, var(--accent) 34%, var(--card-border)) !important;
            background: color-mix(in srgb, var(--accent) 10%, transparent) !important;
            color: var(--accent-text, var(--accent)) !important;
        }
        html[data-theme] .expenditure-tutorial-copy small {
            color: var(--accent-text, var(--accent)) !important;
        }
        html[data-theme] .expenditure-tutorial-copy h3 {
            color: var(--heading, var(--text)) !important;
        }
        html[data-theme] .expenditure-tutorial-copy p {
            color: var(--text-secondary, var(--muted)) !important;
        }
        html[data-theme] .expenditure-tutorial-dismiss {
            color: var(--text-secondary, var(--muted)) !important;
        }
        html[data-theme] .expenditure-tutorial-actions .secondary-btn {
            border-color: var(--card-border) !important;
            background: var(--surface-raised, transparent) !important;
            color: var(--text) !important;
        }
        html[data-theme] .weight-trend-tutorial-launch,
        html[data-theme] .tdee-tutorial-launch {
            border-color: var(--card-border) !important;
            background: var(--surface-raised, var(--card)) !important;
            color: var(--text) !important;
        }
        html[data-theme] .tdee-tutorial-launch-shell,
        html[data-theme] .weight-trend-tutorial-launch,
        html[data-theme] .expenditure-tutorial-card,
        html[data-theme] .expenditure-tutorial-actions,
        html[data-theme] .expenditure-tutorial-actions button {
            pointer-events: auto !important;
            touch-action: manipulation !important;
        }
    `;
    document.head.appendChild(style);
}

ensureTutorialThemeStyles();
window.addEventListener("levelup:appearance-changed", ensureTutorialThemeStyles);
