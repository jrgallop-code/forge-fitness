const STYLE_ID = "workout-theme-guardrail-3";
const OBSERVER_FLAG = "__levelUpWorkoutThemeGuardrailObserver";

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        html[data-theme] #workout-session-logger .session-set-row > strong,
        html[data-theme] #workout-session-logger .drop-set-menu-trigger {
            border-color: var(--accent) !important;
            background: var(--accent) !important;
            color: var(--accent-contrast) !important;
            box-shadow: 0 0 0 1px var(--accent-glow) !important;
        }

        html[data-theme] #workout-session-logger .drop-set-menu-trigger::after {
            color: var(--muted) !important;
        }

        html[data-theme] #workout-session-logger .session-set-row.has-drop-set .drop-set-menu-trigger,
        html[data-theme] #workout-session-logger .session-set-row.live-pr-set .drop-set-menu-trigger {
            border-color: var(--accent-dark) !important;
            background: var(--accent) !important;
            color: var(--accent-contrast) !important;
            box-shadow: 0 0 0 2px var(--accent-glow) !important;
        }

        html[data-theme] #workout-session-logger .session-warmup-row > strong {
            border-color: color-mix(in srgb, var(--accent) 52%, var(--line)) !important;
            background: var(--accent-soft) !important;
            color: var(--accent-text) !important;
            box-shadow: none !important;
        }

        html[data-theme] #workout-session-logger .session-set-row input,
        html[data-theme] #workout-session-logger .session-warmup-row input,
        html[data-theme] #workout-session-logger .drop-set-row input {
            border-color: var(--line) !important;
            background: var(--input-bg) !important;
            color: var(--text) !important;
        }

        html[data-theme] #workout-session-logger .session-set-row input:focus,
        html[data-theme] #workout-session-logger .session-warmup-row input:focus,
        html[data-theme] #workout-session-logger .drop-set-row input:focus {
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 2px var(--accent-glow) !important;
        }

        html[data-theme] #workout-session-logger .complete-set-btn,
        html[data-theme] #workout-session-logger .complete-warmup-btn,
        html[data-theme] #workout-session-logger .logger-remove-set-btn,
        html[data-theme] #workout-session-logger .drop-set-complete {
            border-color: var(--line) !important;
            background: var(--surface-raised) !important;
            color: var(--text) !important;
        }

        html[data-theme] #workout-session-logger .session-set-row.completed .complete-set-btn,
        html[data-theme] #workout-session-logger .session-warmup-row.completed .complete-warmup-btn,
        html[data-theme] #workout-session-logger .drop-set-row.completed .drop-set-complete {
            border-color: color-mix(in srgb, var(--success) 48%, var(--line)) !important;
            background: color-mix(in srgb, var(--success) 12%, var(--surface-raised)) !important;
            color: var(--success-text) !important;
        }

        html[data-theme] #workout-session-logger .complete-set-btn::before,
        html[data-theme] #workout-session-logger .complete-warmup-btn::before {
            border-color: var(--muted) !important;
            color: var(--success-text) !important;
        }

        html[data-theme] #workout-session-logger .drop-set-menu {
            border-color: var(--card-border) !important;
            background: var(--card) !important;
            color: var(--text) !important;
            box-shadow: var(--shadow) !important;
        }

        html[data-theme] #workout-session-logger .drop-set-menu button {
            border-color: var(--line) !important;
            background: var(--surface-raised) !important;
            color: var(--text) !important;
        }

        html[data-theme] #workout-session-logger .drop-set-block {
            border-left-color: var(--accent) !important;
            background: color-mix(in srgb, var(--accent) 6%, transparent) !important;
        }

        html[data-theme] #workout-session-logger .drop-set-label {
            color: var(--text-secondary) !important;
        }

        html[data-theme] #workout-session-logger .drop-set-remove {
            border-color: transparent !important;
            background: transparent !important;
            color: var(--muted) !important;
        }

        html[data-theme] #workout-session-logger .drop-set-add-another {
            background: transparent !important;
            color: var(--accent-text) !important;
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

function themeSetTrigger(trigger) {
    forceImportant(trigger, "border-color", "var(--accent)");
    forceImportant(trigger, "background", "var(--accent)");
    forceImportant(trigger, "color", "var(--accent-contrast)");
    forceImportant(trigger, "box-shadow", "0 0 0 1px var(--accent-glow)");
}

function applyRuntimeTheme(root = document) {
    root.querySelectorAll?.("#workout-session-logger .session-set-row > strong, #workout-session-logger .drop-set-menu-trigger").forEach(themeSetTrigger);

    root.querySelectorAll?.("#workout-session-logger .session-set-row.has-drop-set .drop-set-menu-trigger, #workout-session-logger .session-set-row.live-pr-set .drop-set-menu-trigger").forEach(trigger => {
        forceImportant(trigger, "border-color", "var(--accent-dark)");
        forceImportant(trigger, "box-shadow", "0 0 0 2px var(--accent-glow)");
    });

    root.querySelectorAll?.("#workout-session-logger .session-warmup-row > strong").forEach(circle => {
        forceImportant(circle, "border-color", "color-mix(in srgb, var(--accent) 52%, var(--line))");
        forceImportant(circle, "background", "var(--accent-soft)");
        forceImportant(circle, "color", "var(--accent-text)");
    });

    root.querySelectorAll?.("#workout-session-logger .session-set-row input, #workout-session-logger .session-warmup-row input, #workout-session-logger .drop-set-row input").forEach(input => {
        forceImportant(input, "border-color", "var(--line)");
        forceImportant(input, "background", "var(--input-bg)");
        forceImportant(input, "color", "var(--text)");
    });

    root.querySelectorAll?.("#workout-session-logger .drop-set-block").forEach(block => {
        forceImportant(block, "border-left-color", "var(--accent)");
        forceImportant(block, "background", "color-mix(in srgb, var(--accent) 6%, transparent)");
    });

    root.querySelectorAll?.("#workout-session-logger .drop-set-label").forEach(label => {
        forceImportant(label, "color", "var(--text-secondary)");
    });

    root.querySelectorAll?.("#workout-session-logger .drop-set-add-another").forEach(button => {
        forceImportant(button, "color", "var(--accent-text)");
        forceImportant(button, "background", "transparent");
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
