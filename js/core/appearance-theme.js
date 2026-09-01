export const APPEARANCE_STORAGE_KEY = "level_up_appearance_settings";

export const APPEARANCE_THEMES = [
    { id: "system", name: "System", description: "Arctic 7 a.m.–7 p.m. · Level Up overnight", mode: "system" },
    { id: "level-up", name: "Level Up", description: "Obsidian · Crimson", mode: "dark" },
    { id: "arctic", name: "Arctic", description: "White · Performance blue", mode: "light" },
    { id: "pure", name: "Pure", description: "Warm white · Monochrome", mode: "light" },
    { id: "ocean", name: "Ocean", description: "Pale blue · Cyan", mode: "light" },
    { id: "midnight", name: "Midnight", description: "Ink navy · Electric blue", mode: "dark" },
    { id: "slate", name: "Slate", description: "Graphite · Steel blue", mode: "dark" },
    { id: "pulse", name: "Pulse", description: "Deep plum · Hot pink", mode: "dark" }
];

const THEME_IDS = new Set(APPEARANCE_THEMES.map(theme => theme.id));
const THEME_COLORS = {
    "level-up": "#09090b",
    arctic: "#f3f7fc",
    pure: "#f4f4f2",
    ocean: "#edf8ff",
    midnight: "#050b17",
    slate: "#0d1117",
    pulse: "#120912"
};

export const SYSTEM_DAY_START_HOUR = 7;
export const SYSTEM_NIGHT_START_HOUR = 19;

let clockTimer = 0;
let clockListenersBound = false;

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
    if (announce) {
        window.dispatchEvent(new CustomEvent("levelup:appearance-change", { detail: { theme: selected, effective, mode } }));
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
    return { theme: selected, effective, mode };
}

export function initializeAppearanceTheme() {
    applyAppearanceTheme(getAppearanceTheme(), { persist: false, announce: false });
    scheduleClockRefresh();
    if (clockListenersBound) return;
    document.addEventListener("visibilitychange", handleAppResume);
    window.addEventListener("focus", handleAppResume);
    window.addEventListener("pageshow", handleAppResume);
    clockListenersBound = true;
}

export function resolveSystemThemeForHour(hour) {
    const localHour = Number(hour);
    return localHour >= SYSTEM_DAY_START_HOUR && localHour < SYSTEM_NIGHT_START_HOUR ? "arctic" : "level-up";
}

function getSystemTheme(now = new Date()) {
    return resolveSystemThemeForHour(now.getHours());
}

function millisecondsUntilBoundary(now = new Date()) {
    const next = new Date(now);
    const hour = now.getHours();
    if (hour < SYSTEM_DAY_START_HOUR) {
        next.setHours(SYSTEM_DAY_START_HOUR, 0, 0, 0);
    } else if (hour < SYSTEM_NIGHT_START_HOUR) {
        next.setHours(SYSTEM_NIGHT_START_HOUR, 0, 0, 0);
    } else {
        next.setDate(next.getDate() + 1);
        next.setHours(SYSTEM_DAY_START_HOUR, 0, 0, 0);
    }
    return Math.max(1000, next.getTime() - now.getTime() + 1000);
}

function scheduleClockRefresh() {
    if (clockTimer) window.clearTimeout(clockTimer);
    clockTimer = window.setTimeout(handleSystemClockChange, millisecondsUntilBoundary());
}

function handleSystemClockChange() {
    if (getAppearanceTheme() === "system") applyAppearanceTheme("system", { persist: false });
    scheduleClockRefresh();
}

function handleAppResume() {
    if (document.visibilityState === "hidden") return;
    handleSystemClockChange();
}

initializeAppearanceTheme();
