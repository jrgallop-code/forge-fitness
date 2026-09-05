const STYLE_ID = "workout-theme-guardrail-2";
const OBSERVER_FLAG = "__levelUpWorkoutThemeGuardrailObserver";

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        html[data-theme] #workout-session-logger .session-set-row > strong {
            border-color: var(--accent) !important;
            background: var(--accent) !important;
            color: var(--accent-contrast) !important;
            box-shadow: 0 0 0 1px var(--accent-glow) !important;
        }

        html[data-theme] #workout-session-logger .session-warmup-row > strong {
            border-color: color-mix(in srgb, var(--accent) 52%, var(--line)) !important;
            background: var(--accent-soft) !important;
            color: var(--accent-text) !important;
            box-shadow: none !important;
        }

        html[data-theme] #workout-session-logger .session-set-row input,
        html[data-theme] #workout-session-logger .session-warmup-row input {
            border-color: var(--line) !important;
            background: var(--input-bg) !important;
            color: var(--text) !important;
        }

        html[data-theme] #workout-session-logger .complete-set-btn,
        html[data-theme] #workout-session-logger .complete-warmup-btn,
        html[data-theme] #workout-session-logger .logger-remove-set-btn {
            border-color: var(--line) !important;
            background: var(--surface-raised) !important;
            color: var(--text) !important;
        }

        html[data-theme] #workout-session-logger .session-set-row.completed .complete-set-btn,
        html[data-theme] #workout-session-logger .session-warmup-row.completed .complete-warmup-btn {
            border-color: color-mix(in srgb, var(--success) 48%, var(--line)) !important;
            background: color-mix(in srgb, var(--success) 12%, var(--surface-raised)) !important;
            color: var(--success-text) !important;
        }

        html[data-theme] #workout-session-logger .complete-set-btn::before,
        html[data-theme] #workout-session-logger .complete-warmup-btn::before {
            border-color: var(--muted) !important;
            color: var(--success-text) !important;
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

        html[data-theme] .live-pr-toast span { color: var(--accent-text) !important; }
        html[data-theme] .live-pr-toast strong { color: var(--heading) !important; }
        html[data-theme] .live-pr-toast small { color: var(--text-secondary) !important; }
    `;
    document.head.appendChild(style);
}

function forceImportant(element, property, value) {
    element?.style?.setProperty(property, value, "important");
}

function applyRuntimeTheme(root = document) {
    root.querySelectorAll?.("#workout-session-logger .session-set-row > strong").forEach(circle => {
        forceImportant(circle, "border-color", "var(--accent)");
        forceImportant(circle, "background", "var(--accent)");
        forceImportant(circle, "color", "var(--accent-contrast)");
        forceImportant(circle, "box-shadow", "0 0 0 1px var(--accent-glow)");
    });

    root.querySelectorAll?.("#workout-session-logger .session-warmup-row > strong").forEach(circle => {
        forceImportant(circle, "border-color", "color-mix(in srgb, var(--accent) 52%, var(--line))");
        forceImportant(circle, "background", "var(--accent-soft)");
        forceImportant(circle, "color", "var(--accent-text)");
    });

    root.querySelectorAll?.("#workout-session-logger .session-set-row input, #workout-session-logger .session-warmup-row input").forEach(input => {
        forceImportant(input, "border-color", "var(--line)");
        forceImportant(input, "background", "var(--input-bg)");
        forceImportant(input, "color", "var(--text)");
    });

    root.querySelectorAll?.("#workout-session-logger .live-pr-exercise-badge").forEach(badge => {
        forceImportant(badge, "border-color", "color-mix(in srgb, var(--accent) 42%, var(--line))");
        forceImportant(badge, "background", "var(--accent-soft)");
        forceImportant(badge, "color", "var(--accent-text)");
    });
}

function scheduleRuntimeTheme() {
    requestAnimationFrame(() => applyRuntimeTheme(document));
}

ensureStyles();
applyRuntimeTheme(document);

if (!globalThis[OBSERVER_FLAG]) {
    globalThis[OBSERVER_FLAG] = true;
    const observer = new MutationObserver(mutations => {
        if (mutations.some(mutation => mutation.type === "childList" || mutation.type === "attributes")) {
            scheduleRuntimeTheme();
        }
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-theme", "data-theme-mode"]
    });
    window.addEventListener("levelup:appearance-changed", scheduleRuntimeTheme);
}
