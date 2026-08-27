import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { createGeneratedExerciseGuide } from "./exercise-guide-generator.js?v=full-library-guides-1";

export const SECONDARY_SET_CREDIT = 0.5;

function normalizeRecoveryGroup(value) {
    const text = String(value || "").trim();
    if (!text || /cardio|other/i.test(text)) return "";

    const aliases = {
        Quadriceps: "Quads",
        Hamstring: "Hamstrings",
        Shoulder: "Shoulders",
        Glute: "Glutes",
        Calf: "Calves",
        Forearm: "Forearms",
        "Front Delts": "Shoulders",
        "Side Delts": "Shoulders",
        Lats: "Back",
        "Upper Back": "Back",
        "Spinal Erectors": "Back",
        "Rectus Abdominis": "Core",
        Obliques: "Core",
        "Deep Core": "Core",
        Abs: "Core",
        Abdominals: "Core"
    };

    return aliases[text] || text;
}

function getSetCount(exercise) {
    if (Array.isArray(exercise?.sets)) return exercise.sets.length;
    const count = Number(exercise?.sets);
    return Number.isFinite(count) && count > 0 ? count : 0;
}

function getExerciseImpacts(exercise) {
    const definition = getExerciseById(exercise?.id || exercise?.exerciseId);
    let primary = [];
    let secondary = [];

    try {
        const guide = definition ? createGeneratedExerciseGuide(definition) : null;
        primary = Array.isArray(guide?.primary) ? guide.primary : [];
        secondary = Array.isArray(guide?.secondary) ? guide.secondary : [];
    }
    catch {
        primary = [];
        secondary = [];
    }

    if (!primary.length && !secondary.length) {
        const fallback = normalizeRecoveryGroup(definition?.muscleGroup || exercise?.muscleGroup);
        return fallback ? new Map([[fallback, 1]]) : new Map();
    }

    // Collapse detailed muscles into the Recovery groups before crediting sets.
    // This prevents, for example, Front + Side Delts from double-counting one set.
    const impacts = new Map();
    secondary.forEach(muscle => {
        const group = normalizeRecoveryGroup(muscle);
        if (group) impacts.set(group, SECONDARY_SET_CREDIT);
    });
    primary.forEach(muscle => {
        const group = normalizeRecoveryGroup(muscle);
        if (group) impacts.set(group, 1);
    });
    return impacts;
}

export function getWeeklyPlanVolume(plan) {
    const volume = new Map();
    const days = Array.isArray(plan?.days) ? plan.days : [];

    days.forEach(day => {
        const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
        exercises.forEach(exercise => {
            const sets = getSetCount(exercise);
            if (!sets) return;

            getExerciseImpacts(exercise).forEach((credit, group) => {
                volume.set(group, (volume.get(group) || 0) + sets * credit);
            });
        });
    });

    return volume;
}

export function formatSetCredits(value) {
    const sets = Math.round(Number(value) * 10) / 10;
    return `${sets} ${sets === 1 ? "set" : "sets"}`;
}
