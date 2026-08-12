import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";

// High-systemic-fatigue movements should keep their intended rest periods.
// Smart Build may still superset lower-fatigue accessories around them, but never these movements themselves.
const NEVER_SUPERSET_PATTERNS = [
    /\b(back|front|barbell|high bar|low bar|safety bar|hack) squat\b/i,
    /\bsquat\b/i,
    /\b(conventional|sumo|trap bar|romanian|stiff[- ]leg|barbell) deadlift\b/i,
    /\bdeadlift\b/i,
    /\brdl\b/i,
    /\bleg press\b/i,
    /\bbarbell row\b/i,
    /\bpendlay row\b/i,
    /\bbench press\b/i,
    /\bbarbell.*overhead press\b/i,
    /\boverhead press\b/i,
    /\bmilitary press\b/i
];

export function initializeSmartBuildSupersetGuard(root = document) {
    const wizard = root.querySelector?.("[data-smart-build-wizard]");
    if (!wizard || wizard.dataset.supersetGuardBound === "true") return;
    wizard.dataset.supersetGuardBound = "true";

    const observer = new MutationObserver(() => cleanReview(wizard));
    observer.observe(wizard, { childList: true, subtree: true });
    cleanReview(wizard);

    wizard.addEventListener("click", event => {
        if (!event.target.closest("[data-smart-save]")) return;
        // Smart Build writes the plan synchronously; sanitize immediately after its save handler.
        setTimeout(sanitizeLatestSmartBuildPlan, 0);
    });
}

function sanitizeLatestSmartBuildPlan() {
    let plans;
    try {
        plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
    } catch {
        return;
    }
    if (!Array.isArray(plans) || !plans.length) return;

    const exerciseMap = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
    let changed = false;

    for (let p = plans.length - 1; p >= 0; p -= 1) {
        const plan = plans[p];
        if (!plan?.smartBuild || !Array.isArray(plan.days)) continue;

        plan.days.forEach(day => {
            const groups = new Map();
            (day.exercises || []).forEach(item => {
                if (!item.supersetGroup) return;
                if (!groups.has(item.supersetGroup)) groups.set(item.supersetGroup, []);
                groups.get(item.supersetGroup).push(item);
            });

            groups.forEach(items => {
                const containsProtectedMovement = items.some(item => {
                    const name = exerciseMap.get(item.id)?.name || "";
                    return isNeverSuperset(name);
                });
                if (!containsProtectedMovement) return;
                items.forEach(item => { delete item.supersetGroup; });
                changed = true;
            });
        });
        break;
    }

    if (changed) localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
}

function cleanReview(wizard) {
    const rows = [...wizard.querySelectorAll(".smart-review-day p.is-superset")];
    const groups = new Map();
    rows.forEach(row => {
        const group = row.querySelector("em")?.textContent?.trim();
        if (!group) return;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(row);
    });

    groups.forEach(groupRows => {
        if (!groupRows.some(row => isNeverSuperset(row.textContent))) return;
        groupRows.forEach(row => {
            row.classList.remove("is-superset");
            row.querySelector("em")?.remove();
        });
    });
}

function isNeverSuperset(name) {
    return NEVER_SUPERSET_PATTERNS.some(pattern => pattern.test(String(name || "")));
}
