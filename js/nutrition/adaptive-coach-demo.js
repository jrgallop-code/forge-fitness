const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const DEMO_BACKUP_KEY = "level_up_weight_entries_before_coach_demo";
const DEMO_ACTIVE_KEY = "level_up_adaptive_coach_demo_active";

export function initializeAdaptiveCoachDemo() {
    cleanupAdaptiveCoachDemo();
}

function cleanupAdaptiveCoachDemo() {
    document.getElementById("adaptive-coach-demo-controls")?.remove();

    const backup = localStorage.getItem(DEMO_BACKUP_KEY);
    const active = localStorage.getItem(DEMO_ACTIVE_KEY) === "true";
    const current = localStorage.getItem(WEIGHT_STORAGE_KEY);

    let hasDemoEntries = false;
    let parsedEntries = [];

    if (current) {
        try {
            const parsed = JSON.parse(current);
            if (Array.isArray(parsed)) {
                parsedEntries = parsed;
                hasDemoEntries = parsed.some(entry => entry?.demo === "adaptive-coach");
            }
        }
        catch {
            parsedEntries = [];
        }
    }

    if (active || hasDemoEntries || backup !== null) {
        if (backup !== null) {
            if (backup === "__NO_WEIGHT_DATA__") {
                localStorage.removeItem(WEIGHT_STORAGE_KEY);
            }
            else {
                localStorage.setItem(WEIGHT_STORAGE_KEY, backup);
            }
        }
        else if (hasDemoEntries) {
            const realEntries = parsedEntries.filter(entry => entry?.demo !== "adaptive-coach");
            if (realEntries.length) {
                localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(realEntries));
            }
            else {
                localStorage.removeItem(WEIGHT_STORAGE_KEY);
            }
        }

        localStorage.removeItem(DEMO_BACKUP_KEY);
        localStorage.removeItem(DEMO_ACTIVE_KEY);

        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
    }
}
