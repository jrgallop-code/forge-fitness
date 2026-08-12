import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { initializeManualSupersetBuilder } from "./manual-superset-builder.js?v=manual-superset-builder-1";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const LOWER_BODY_MAJOR = new Set(["Quads", "Hamstrings", "Glutes"]);
const HIGH_FATIGUE_PATTERNS = [
    /\bsquat\b/i,
    /\bdeadlift\b/i,
    /\brdl\b/i,
    /\bleg press\b/i,
    /\bhack squat\b/i,
    /\bbarbell row\b/i,
    /\bpendlay row\b/i,
    /\bbench press\b/i,
    /\boverhead press\b/i,
    /\bmilitary press\b/i
];

export function initializeSmartBuildSupersetGuard(root = document) {
    initializeManualSupersetBuilder(root);

    if (root.dataset.smartBuildSafetyGuardBound === "true") return;
    root.dataset.smartBuildSafetyGuardBound = "true";

    root.addEventListener("click", event => {
        const button = event.target.closest?.("button");
        if (!button) return;

        if (button.matches("[data-smart-next], [data-smart-regenerate], [data-replace-exercise]")) {
            cleanRenderedSmartBuild(root);
            return;
        }

        if (button.matches("[data-smart-save]")) {
            cleanRenderedSmartBuild(root);
            sanitizeLatestSmartBuildPlan();
        }
    });
}

function isProtectedExercise(definition) {
    if (!definition) return false;
    const isMajorLowerBodyCompound = definition.type === "compound" && LOWER_BODY_MAJOR.has(definition.muscleGroup);
    const isNamedHighFatigueMovement = HIGH_FATIGUE_PATTERNS.some(pattern => pattern.test(definition.name || ""));
    return isMajorLowerBodyCompound || isNamedHighFatigueMovement;
}

function cleanRenderedSmartBuild(root) {
    const exerciseMap = new Map(getAllExercises().map(exercise => [exercise.name, exercise]));
    const rows = [...root.querySelectorAll("[data-smart-build-wizard] .smart-review-exercise.is-superset")];
    if (!rows.length) return;

    const groups = new Map();
    rows.forEach(row => {
        const group = row.querySelector("em")?.textContent?.trim();
        if (!group) return;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(row);
    });

    groups.forEach(groupRows => {
        const protectedPair = groupRows.some(row => {
            const name = row.querySelector("strong")?.textContent?.trim() || "";
            const definition = exerciseMap.get(name);
            return isProtectedExercise(definition);
        });
        if (!protectedPair) return;
        groupRows.forEach(row => {
            row.classList.remove("is-superset");
            row.querySelector("em")?.remove();
        });
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
    const plan = [...plans].reverse().find(item => item?.smartBuild && Array.isArray(item.days));
    if (!plan) return;

    let changed = false;
    plan.days.forEach(day => {
        const groups = new Map();
        (day.exercises || []).forEach(item => {
            if (!item.supersetGroup) return;
            if (!groups.has(item.supersetGroup)) groups.set(item.supersetGroup, []);
            groups.get(item.supersetGroup).push(item);
        });

        groups.forEach(items => {
            if (!items.some(item => isProtectedExercise(exerciseMap.get(item.id)))) return;
            items.forEach(item => delete item.supersetGroup);
            changed = true;
        });
    });

    if (changed) localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
}
