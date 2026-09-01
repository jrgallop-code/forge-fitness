export const APPEARANCE_STORAGE_KEY = "level_up_appearance_settings";

export const APPEARANCE_THEMES = [
    { id: "system", name: "System", description: "Arctic by day · Level Up by night", mode: "system" },
    { id: "level-up", name: "Level Up", description: "Obsidian · Crimson", mode: "dark" },
    { id: "arctic", name: "Arctic", description: "White · Performance blue", mode: "light" },
    { id: "pure", name: "Pure", description: "Warm white · Monochrome", mode: "light" },
    { id: "ocean", name: "Ocean", description: "Pale blue · Cyan", mode: "light" },
    { id: "midnight", name: "Midnight", description: "Ink navy · Electric blue", mode: "dark" },
    { id: "slate", name: "Slate", description: "Graphite · Steel blue", mode: "dark" }
];

const THEME_IDS = new Set(APPEARANCE_THEMES.map(theme => theme.id));
const THEME_COLORS = {
    "level-up": "#09090b",
    arctic: "#f3f7fc",
    pure: "#f4f4f2",
    ocean: "#edf8ff",
    midnight: "#050b17",
    slate: "#0d1117"
};

let mediaQuery;
let mediaListenerBound = false;

export function getAppearanceTheme() {
    try {
        const parsed = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || "null");
        const theme = String(parsed?.theme || parsed || "level-up");
        return THEME_IDS.has(theme) ? theme : "level-up";
    } catch {
        return "level-up";
    }
}

export function resolveAppearanceTheme(theme = getAppearanceTheme()) {
    if (theme !== "system") return theme;
    return getSystemTheme();
}

export function applyAppearanceTheme(theme, { persist = true, announce = true } = {}) {
    const selected = THEME_IDS.has(theme) ? theme : "level-up";
    if (persist) {
        try {
            localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ theme: selected }));
        } catch {
            // Keep the visual change working when browser storage is unavailable.
        }
    }
    const effective = resolveAppearanceTheme(selected);
    const mode = APPEARANCE_THEMES.find(item => item.id === effective)?.mode || "dark";
    const root = document.documentElement;
    root.dataset.themePreference = selected;
    root.dataset.theme = effective;
    root.dataset.themeMode = mode;
    root.style.colorScheme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[effective] || THEME_COLORS["level-up"]);
    if (announce) window.dispatchEvent(new CustomEvent("levelup:appearance-change", { detail: { theme: selected, effective, mode } }));
    return { theme: selected, effective, mode };
}

export function initializeAppearanceTheme() {
    applyAppearanceTheme(getAppearanceTheme(), { persist: false, announce: false });
    if (mediaListenerBound || !window.matchMedia) return;
    mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    mediaQuery.addEventListener?.("change", handleSystemChange);
    mediaListenerBound = true;
}

function getSystemTheme() {
    return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "arctic" : "level-up";
}

function handleSystemChange() {
    if (getAppearanceTheme() === "system") applyAppearanceTheme("system", { persist: false });
}

initializeAppearanceTheme();
