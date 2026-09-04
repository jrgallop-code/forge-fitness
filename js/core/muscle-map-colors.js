import { getAppearanceTheme, resolveAppearanceTheme } from "./appearance-theme.js?v=appearance-themes-3";

export const MUSCLE_MAP_COLOR_STORAGE_KEY = "level_up_muscle_map_colors_v1";

export const MUSCLE_COLOR_PRESETS = [
    { id: "level-up-red", name: "Level Up Red", color: "#FF315F" },
    { id: "level-up-green", name: "Level Up Green", color: "#45CB75" },
    { id: "electric-blue", name: "Electric Blue", color: "#2F80FF" },
    { id: "cyber-cyan", name: "Cyber Cyan", color: "#00CFE8" },
    { id: "neon-lime", name: "Neon Lime", color: "#55D85A" },
    { id: "hot-pink", name: "Hot Pink", color: "#FF3EB5" },
    { id: "ultra-violet", name: "Ultra Violet", color: "#8B5CFF" },
    { id: "tangerine", name: "Tangerine", color: "#FF8A32" },
    { id: "gold", name: "Gold", color: "#F5B942" },
    { id: "teal", name: "Teal", color: "#17BFA6" },
    { id: "ice-blue", name: "Ice Blue", color: "#72C7FF" },
    { id: "graphite", name: "Graphite", color: "#34343A" }
];

export const THEME_MUSCLE_MAP_DEFAULTS = {
    "level-up": { recovery: "#FF315F", sets: "#45CB75" },
    arctic: { recovery: "#2F80FF", sets: "#17BFA6" },
    pure: { recovery: "#FF3347", sets: "#2F80FF" },
    ocean: { recovery: "#00CFE8", sets: "#2F80FF" },
    midnight: { recovery: "#00CFE8", sets: "#8B5CFF" },
    slate: { recovery: "#17BFA6", sets: "#72C7FF" },
    pulse: { recovery: "#FF3EB5", sets: "#8B5CFF" }
};

export const DEFAULT_MUSCLE_MAP_COLORS = { ...THEME_MUSCLE_MAP_DEFAULTS["level-up"] };

const LEGACY_DEFAULTS = { recovery: "#55D85A", sets: "#2F80FF" };
const STYLE_ID = "level-up-muscle-map-color-styles";
const NEUTRAL = "#858793";
let syncQueued = false;
let observer = null;

export function getThemeDefaultMuscleMapColors(theme = getAppearanceTheme()) {
    const effective = resolveAppearanceTheme(theme);
    return { ...(THEME_MUSCLE_MAP_DEFAULTS[effective] || THEME_MUSCLE_MAP_DEFAULTS["level-up"]), theme: effective };
}

export function getMuscleMapColors() {
    const defaults = getThemeDefaultMuscleMapColors();
    const state = readSettings();
    return {
        recovery: state.recoveryMode === "custom" ? normalizeColor(state.recovery, defaults.recovery) : defaults.recovery,
        sets: state.setsMode === "custom" ? normalizeColor(state.sets, defaults.sets) : defaults.sets,
        recoveryMode: state.recoveryMode,
        setsMode: state.setsMode,
        theme: defaults.theme
    };
}

export function getMuscleMapColor(kind) {
    const key = kind === "sets" ? "sets" : "recovery";
    return getMuscleMapColors()[key];
}

export function setMuscleMapColor(kind, color, { announce = true } = {}) {
    const key = kind === "sets" ? "sets" : "recovery";
    const defaults = getThemeDefaultMuscleMapColors();
    const state = readSettings();
    state[key] = normalizeColor(color, defaults[key]);
    state[`${key}Mode`] = "custom";
    saveSettings(state);
    applyMuscleMapColors({ announce });
    return getMuscleMapColors();
}

export function resetMuscleMapColors({ announce = true } = {}) {
    saveSettings({ recoveryMode: "theme", setsMode: "theme" });
    applyMuscleMapColors({ announce });
    return getMuscleMapColors();
}

export function applyMuscleMapColors({ announce = false } = {}) {
    ensureStyles();
    const settings = getMuscleMapColors();
    const root = document.documentElement;
    root.style.setProperty("--muscle-recovery-accent", settings.recovery);
    root.style.setProperty("--muscle-set-accent", settings.sets);
    root.style.setProperty("--muscle-recovery-scale", recoveryScale(settings.recovery));
    root.style.setProperty("--muscle-set-scale", setScale(settings.sets));
    queueRenderedSync();
    if (announce) {
        window.dispatchEvent(new CustomEvent("levelup:muscle-map-colors-changed", { detail: settings }));
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
    return settings;
}

function readSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(MUSCLE_MAP_COLOR_STORAGE_KEY) || "null") || {};
        const recoveryMode = saved.recoveryMode === "custom" || saved.recoveryMode === "theme"
            ? saved.recoveryMode
            : inferLegacyMode("recovery", saved.recovery);
        const setsMode = saved.setsMode === "custom" || saved.setsMode === "theme"
            ? saved.setsMode
            : inferLegacyMode("sets", saved.sets);
        return { recovery: saved.recovery, sets: saved.sets, recoveryMode, setsMode };
    }
    catch {
        return { recoveryMode: "theme", setsMode: "theme" };
    }
}

function inferLegacyMode(kind, value) {
    if (!value) return "theme";
    const normalized = normalizeColor(value, LEGACY_DEFAULTS[kind]);
    return normalized === LEGACY_DEFAULTS[kind] ? "theme" : "custom";
}

function saveSettings(settings) {
    try {
        const payload = {
            recoveryMode: settings.recoveryMode === "custom" ? "custom" : "theme",
            setsMode: settings.setsMode === "custom" ? "custom" : "theme"
        };
        if (payload.recoveryMode === "custom") payload.recovery = normalizeColor(settings.recovery, DEFAULT_MUSCLE_MAP_COLORS.recovery);
        if (payload.setsMode === "custom") payload.sets = normalizeColor(settings.sets, DEFAULT_MUSCLE_MAP_COLORS.sets);
        localStorage.setItem(MUSCLE_MAP_COLOR_STORAGE_KEY, JSON.stringify(payload));
    }
    catch {
        // Keep the current visual state usable if storage is unavailable.
    }
}

function normalizeColor(value, fallback) {
    const text = String(value || "").trim().toUpperCase();
    return /^#[0-9A-F]{6}$/.test(text) ? text : fallback;
}

function rgb(hex) {
    const normalized = normalizeColor(hex, "#000000").slice(1);
    return [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16));
}

function mix(colorA, colorB, amount) {
    const a = rgb(colorA);
    const b = rgb(colorB);
    const weight = Math.max(0, Math.min(1, Number(amount) || 0));
    const values = a.map((value, index) => Math.round(value + (b[index] - value) * weight));
    return `#${values.map(value => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function rgba(hex, alpha) {
    const values = rgb(hex);
    return `rgba(${values.join(",")},${Math.max(0, Math.min(1, Number(alpha) || 0)).toFixed(3)})`;
}

function recoveryColor(percent, base) {
    return mix(base, NEUTRAL, Math.max(0, Math.min(100, Number(percent) || 0)) / 100);
}

function recoveryScale(base) {
    return `linear-gradient(90deg,${base} 0%,${mix(base, NEUTRAL, .25)} 25%,${mix(base, NEUTRAL, .5)} 50%,${mix(base, NEUTRAL, .75)} 75%,${NEUTRAL} 100%)`;
}

function setScale(base) {
    return `linear-gradient(90deg,${NEUTRAL} 0%,${mix(NEUTRAL, base, .48)} 52%,${base} 100%)`;
}

function percentFromRecoveryNode(node) {
    const direct = Number(node?.dataset?.recoveryPercent);
    if (Number.isFinite(direct)) return Math.max(0, Math.min(100, direct));
    const opacity = Number.parseFloat(node?.style?.getPropertyValue("--recovery-opacity"));
    if (Number.isFinite(opacity)) return Math.max(0, Math.min(100, (1 - Math.max(.04, opacity) / .96) * 100));
    return 100;
}

function syncRenderedMaps() {
    const settings = getMuscleMapColors();

    document.querySelectorAll("[data-recovery-muscle]").forEach(node => {
        node.style.setProperty("--recovery-fill", recoveryColor(percentFromRecoveryNode(node), settings.recovery), "important");
    });

    document.querySelectorAll(".dashboard-muscle-card.is-recovery .dashboard-muscle-region").forEach(node => {
        node.style.setProperty("--dashboard-muscle-fill", settings.recovery, "important");
    });

    document.querySelectorAll("[data-seven-day-muscle]").forEach(node => {
        node.style.setProperty("--seven-day-volume-fill", settings.sets, "important");
    });

    document.querySelectorAll("[data-plan-target-muscle]").forEach(node => {
        node.style.setProperty("--plan-target-fill", settings.sets, "important");
    });

    document.querySelectorAll(".dashboard-muscle-card.is-volume .dashboard-muscle-region").forEach(node => {
        node.style.setProperty("--dashboard-muscle-fill", settings.sets, "important");
    });

    document.querySelectorAll(".volume-cell").forEach(cell => {
        const sets = Number.parseFloat(cell.textContent || "0") || 0;
        const intensity = Math.max(0, Math.min(1, sets / 12));
        const backgroundAlpha = sets > 0 ? .08 + intensity * .38 : .045;
        const borderAlpha = sets > 0 ? .12 + intensity * .38 : .08;
        cell.style.setProperty("background", rgba(settings.sets, backgroundAlpha), "important");
        cell.style.setProperty("border-color", rgba(settings.sets, borderAlpha), "important");
    });

    document.querySelectorAll(".recovery-map-note").forEach(note => {
        if (!/strongest red|red overlay/i.test(note.textContent || "")) return;
        note.textContent = "0% means recently trained and shows the strongest selected highlight. As recovery rises, the chosen colour fades toward the neutral body at 100%. Recovery timing still uses Level Up's current 72-hour model.";
    });
    document.querySelectorAll(".seven-day-volume-note").forEach(note => {
        if (!/green intensity/i.test(note.textContent || "")) return;
        note.textContent = "Same scale as Plan Target Maps: 0 sets stays neutral grey; your selected set-distribution colour increases continuously to full intensity at 12+ set credits.";
    });
}

function queueRenderedSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
        syncQueued = false;
        syncRenderedMaps();
    });
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .recovery-facing-toggle button.active,
        .muscle-overview-shell[data-muscle-mode="recovery"] .muscle-overview-toggle [data-muscle-overview-mode="recovery"].active {
            background:var(--muscle-recovery-accent)!important;
            color:#fff!important;
            box-shadow:0 0 22px color-mix(in srgb,var(--muscle-recovery-accent) 25%,transparent)!important;
        }
        .recovery-scale-bar {
            background:var(--muscle-recovery-scale)!important;
            box-shadow:0 0 12px color-mix(in srgb,var(--muscle-recovery-accent) 20%,transparent)!important;
        }
        .recovery-scale-points span:first-child small { color:var(--muscle-recovery-accent)!important; }
        .recovery-row-progress span { background:var(--muscle-recovery-accent)!important; }
        .recovery-detail-row { grid-template-columns:minmax(0,1fr) auto!important; }
        .recovery-detail-row > .recovery-mini { display:none!important; }
        .muscle-overview-shell[data-muscle-mode="volume"] .muscle-overview-toggle [data-muscle-overview-mode="volume"].active {
            background:var(--muscle-set-accent)!important;
            color:#fff!important;
            box-shadow:0 0 22px color-mix(in srgb,var(--muscle-set-accent) 24%,transparent)!important;
        }
        .seven-day-volume-window {
            border-color:color-mix(in srgb,var(--muscle-set-accent) 34%,transparent)!important;
            background:color-mix(in srgb,var(--muscle-set-accent) 12%,transparent)!important;
            color:color-mix(in srgb,var(--muscle-set-accent) 72%,var(--heading))!important;
        }
        .seven-day-volume-legend i,
        .plan-target-map-legend i { background:var(--muscle-set-scale)!important; }
        .seven-day-volume-fill,
        .plan-muscle-breakdown-row > i > b,
        .frequency-fill,
        .overall-week-bar {
            background:var(--muscle-set-accent)!important;
            box-shadow:0 0 12px color-mix(in srgb,var(--muscle-set-accent) 24%,transparent)!important;
        }
        .volume-intensity-legend .legend-some {
            background:color-mix(in srgb,var(--muscle-set-accent) 42%,transparent)!important;
            border-color:color-mix(in srgb,var(--muscle-set-accent) 52%,transparent)!important;
        }
        .volume-intensity-legend .legend-more {
            background:var(--muscle-set-accent)!important;
            border-color:var(--muscle-set-accent)!important;
        }
        .appearance-muscle-colors {
            display:grid;
            gap:14px;
            margin-top:18px;
            padding:16px;
            border:1px solid var(--card-border,var(--line));
            border-radius:22px;
            background:var(--card);
            box-shadow:var(--shadow);
        }
        .appearance-muscle-colors > header { display:grid; gap:4px; }
        .appearance-muscle-colors > header small {
            color:var(--accent-text,var(--accent));
            font-size:9px;
            font-weight:900;
            letter-spacing:.12em;
            text-transform:uppercase;
        }
        .appearance-muscle-colors > header h3 { margin:0; font-size:18px; }
        .appearance-muscle-colors > header p { margin:0; font-size:11px; line-height:1.45; }
        .appearance-muscle-color-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .appearance-muscle-color-card {
            display:grid;
            gap:11px;
            min-width:0;
            padding:13px;
            border:1px solid var(--line);
            border-radius:18px;
            background:var(--surface-raised);
        }
        .appearance-muscle-color-card > header { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:3px 8px; align-items:start; }
        .appearance-muscle-color-card > header strong { font-size:14px; }
        .appearance-muscle-color-card > header small { grid-column:1 / -1; color:var(--muted); font-size:9px; line-height:1.35; }
        .appearance-muscle-mode {
            padding:3px 6px;
            border-radius:999px;
            background:var(--card);
            color:var(--muted);
            font-size:8px;
            font-weight:850;
            white-space:nowrap;
        }
        .appearance-muscle-preview {
            display:grid;
            grid-template-columns:118px minmax(0,1fr);
            align-items:center;
            gap:10px;
            min-height:132px;
            padding:10px;
            border:1px solid var(--line);
            border-radius:14px;
            background:var(--card);
        }
        .appearance-muscle-preview-bodies { display:grid; grid-template-columns:1fr 1fr; align-items:end; gap:2px; min-width:0; }
        .appearance-muscle-preview-bodies svg { display:block; width:100%; max-width:58px; height:112px; overflow:visible; }
        .appearance-muscle-preview-bodies image { transform:none!important; transform-origin:0 0!important; }
        .appearance-anatomy-muscle {
            fill:var(--preview-color)!important;
            fill-opacity:.92!important;
            stroke:color-mix(in srgb,var(--heading) 55%,transparent)!important;
            stroke-width:1!important;
        }
        .appearance-anatomy-muscle.is-mid { fill-opacity:.55!important; }
        .appearance-anatomy-muscle.is-low { fill-opacity:.24!important; }
        .appearance-muscle-preview-copy { display:grid; gap:6px; min-width:0; }
        .appearance-muscle-preview-copy strong { font-size:11px; }
        .appearance-muscle-preview-copy small { color:var(--muted); font-size:8px; line-height:1.35; }
        .appearance-muscle-preview-scale { height:7px; border-radius:999px; background:var(--preview-scale); }
        .appearance-muscle-swatch-grid { display:flex; flex-wrap:wrap; gap:7px; }
        .appearance-muscle-swatch {
            position:relative;
            width:30px;
            height:30px;
            padding:0;
            border:2px solid transparent;
            border-radius:999px;
            background:var(--swatch-color)!important;
            box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);
        }
        .appearance-muscle-swatch.is-selected {
            border-color:var(--heading);
            box-shadow:0 0 0 2px var(--card),0 0 0 4px var(--swatch-color);
        }
        .appearance-muscle-swatch.is-selected::after {
            content:"✓";
            position:absolute;
            inset:0;
            display:grid;
            place-items:center;
            color:#fff;
            font-size:12px;
            font-weight:950;
            text-shadow:0 1px 3px rgba(0,0,0,.65);
        }
        .appearance-muscle-custom {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            color:var(--text-secondary,var(--muted));
            font-size:10px;
            font-weight:800;
        }
        .appearance-muscle-custom input[type="color"] {
            width:42px;
            height:32px;
            padding:2px!important;
            border:1px solid var(--line)!important;
            border-radius:10px;
            background:var(--card)!important;
        }
        .appearance-muscle-reset {
            justify-self:start;
            padding:8px 11px;
            border:1px solid var(--line);
            border-radius:999px;
            background:var(--surface-raised);
            color:var(--text);
            font-size:10px;
            font-weight:850;
        }
        @media(max-width:620px) {
            .appearance-muscle-color-grid { grid-template-columns:1fr; }
        }
        @media(max-width:380px) {
            .appearance-muscle-preview { grid-template-columns:104px minmax(0,1fr); }
            .appearance-muscle-preview-bodies svg { max-width:51px; height:104px; }
        }
    `;
    document.head.appendChild(style);
}

if (typeof document !== "undefined") {
    applyMuscleMapColors({ announce: false });
    observer = new MutationObserver(queueRenderedSync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("levelup:appearance-change", () => applyMuscleMapColors({ announce: false }));
    window.addEventListener("pageshow", () => applyMuscleMapColors({ announce: false }));
}
