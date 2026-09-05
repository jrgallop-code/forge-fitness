const STYLE_ID = "workout-theme-guardrail-1";

if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        html[data-theme] #workout-session-logger .session-set-row > strong,
        html[data-theme] #workout-session-logger .session-warmup-row > strong {
            border-color: var(--accent) !important;
            background: var(--accent) !important;
            color: var(--accent-contrast) !important;
            box-shadow: 0 0 0 1px var(--accent-glow) !important;
        }

        html[data-theme] #workout-session-logger .session-set-row input,
        html[data-theme] #workout-session-logger .session-warmup-row input {
            border-color: var(--line) !important;
            background: var(--input-bg) !important;
            color: var(--text) !important;
        }

        html[data-theme] #workout-session-logger .live-pr-exercise-badge {
            border-color: color-mix(in srgb, var(--accent) 42%, var(--line)) !important;
            background: var(--accent-soft) !important;
            color: var(--accent-text) !important;
            box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent) !important;
        }

        html[data-theme] #workout-session-logger .live-pr-exercise-badge .workout-pr-trophy,
        html[data-theme] #workout-session-logger .live-pr-workout-count .workout-pr-trophy {
            color: currentColor !important;
            stroke: currentColor !important;
        }

        html[data-theme] #workout-session-logger .session-set-row.live-pr-set {
            outline-color: color-mix(in srgb, var(--accent) 58%, transparent) !important;
        }

        html[data-theme] .live-pr-toast {
            border-color: var(--card-border) !important;
            background: var(--card) !important;
            color: var(--text) !important;
            box-shadow: var(--shadow) !important;
        }

        html[data-theme] .live-pr-toast-icon {
            border-color: var(--line) !important;
            background: var(--surface-raised) !important;
            color: var(--accent-text) !important;
        }

        html[data-theme] .live-pr-toast span {
            color: var(--accent-text) !important;
        }

        html[data-theme] .live-pr-toast strong {
            color: var(--heading) !important;
        }

        html[data-theme] .live-pr-toast small {
            color: var(--text-secondary) !important;
        }
    `;
    document.head.appendChild(style);
}
