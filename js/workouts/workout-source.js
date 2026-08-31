export const WORKOUT_SOURCES = Object.freeze({
    COACH_BUILDER: "coach_builder",
    MANUAL_BUILDER: "manual_builder",
    TEMPLATE_LIBRARY: "template_library",
    IMPORTED_ROUTINE: "imported_routine",
    ONE_OFF: "one_off"
});

export function classifyWorkoutSource(plan) {
    const id = String(plan?.id || "").toLowerCase();
    if (plan?.isOneOff || id.startsWith("one-off-")) return WORKOUT_SOURCES.ONE_OFF;
    if (plan?.smartBuild || id.startsWith("smart-")) return WORKOUT_SOURCES.COACH_BUILDER;
    if (plan?.importedRoutine || id.startsWith("import-")) return WORKOUT_SOURCES.IMPORTED_ROUTINE;
    if (
        plan?.catalogueCategory ||
        plan?.sourceLabel ||
        plan?.daysPerWeek ||
        plan?.estimatedMinutes ||
        plan?.trainingType
    ) return WORKOUT_SOURCES.TEMPLATE_LIBRARY;
    return WORKOUT_SOURCES.MANUAL_BUILDER;
}
