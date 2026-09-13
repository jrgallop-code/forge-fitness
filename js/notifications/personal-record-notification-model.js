import { evaluateLiveWorkoutPrs } from "../workouts/workout-pr-badges.js?v=workout-pr-badges-4";

export function buildPersonalRecordNotification(session, history = []) {
    const result = evaluateLiveWorkoutPrs(session, history);
    if (!result.count) return null;
    const names = [...result.details.keys()].map(id => {
        const exercise = (session?.exercises || []).find(item => String(item?.exerciseId || item?.id) === String(id));
        return exercise?.exerciseName || exercise?.name || "Exercise";
    });
    if (result.count === 1) {
        const detail = [...result.details.values()][0];
        const best = detail?.bestSet || {};
        const achievement = detail?.mode === "weighted"
            ? `${Number(best.weight || 0)} × ${Number(best.reps || 0)}`
            : `${Number(best.reps || 0)} reps`;
        return { title: "🏆 New personal record!", body: `${names[0]}: ${achievement}. Tap to view your workout recap.` };
    }
    const listed = names.slice(0, 3).join(", ");
    const remaining = result.count - Math.min(result.count, 3);
    return {
        title: `🏆 ${result.count} new personal records!`,
        body: `${listed}${remaining ? ` + ${remaining} more` : ""}. Tap to view your workout recap.`
    };
}
