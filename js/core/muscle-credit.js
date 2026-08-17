import { getExerciseById } from "../workouts/exercise-library.js";
import { createGeneratedExerciseGuide } from "../workouts/exercise-guide-generator.js?v=full-library-guides-1";

export const PRIMARY_SET_CREDIT = 1;
export const SECONDARY_SET_CREDIT = 0.5;

export function normalizeMuscleGroup(value) {
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

export function getExerciseMuscleRoles(exercise) {
    const definition = getExerciseById(exercise?.exerciseId || exercise?.id);
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
        const fallback = normalizeMuscleGroup(definition?.muscleGroup || exercise?.muscleGroup);
        return {
            definition,
            primary: fallback ? [fallback] : [],
            secondary: []
        };
    }

    return {
        definition,
        primary: [...new Set(primary.map(normalizeMuscleGroup).filter(Boolean))],
        secondary: [...new Set(secondary.map(normalizeMuscleGroup).filter(Boolean))]
    };
}

export function getExerciseMuscleImpacts(exercise) {
    const roles = getExerciseMuscleRoles(exercise);
    const impacts = new Map();

    roles.secondary.forEach(muscle => {
        impacts.set(muscle, { credit: SECONDARY_SET_CREDIT, role: "secondary" });
    });
    roles.primary.forEach(muscle => {
        impacts.set(muscle, { credit: PRIMARY_SET_CREDIT, role: "primary" });
    });

    return impacts;
}

export function getExerciseMuscleCredits(exercise) {
    return new Map([...getExerciseMuscleImpacts(exercise)].map(([muscle, impact]) => [muscle, impact.credit]));
}

export function getPlannedSetCount(exercise) {
    if (Array.isArray(exercise?.sets)) return exercise.sets.length;
    const count = Number(exercise?.sets ?? exercise?.setCount);
    return Number.isFinite(count) && count > 0 ? count : 0;
}

export function addExerciseCredits(target, exercise, setCount) {
    const sets = Number(setCount);
    if (!(target instanceof Map) || !Number.isFinite(sets) || sets <= 0) return target;

    getExerciseMuscleCredits(exercise).forEach((credit, muscle) => {
        target.set(muscle, (target.get(muscle) || 0) + sets * credit);
    });
    return target;
}
