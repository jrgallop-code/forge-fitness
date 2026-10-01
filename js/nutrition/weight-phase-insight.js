const PACE_NOTICE_LB_PER_WEEK = 0.20;

export function phaseWeightInsight({ phase, rate, loggedCount }) {
    if (loggedCount < 4) return ["More data needed", "Log at least 4 days to create a useful calorie and weight trend."];
    if (!Number.isFinite(rate)) return ["Calories tracked", "Add regular weigh-ins to compare intake with your weight trend."];

    const phaseText = String(phase?.type || phase?.goal || phase?.name || "").toLowerCase();
    const cutting = /cut|loss|lose/.test(phaseText);
    const bulking = /bulk|gain|build/.test(phaseText);
    const target = phase?.targetWeeklyRate === null || phase?.targetWeeklyRate === undefined
        ? null : Number(phase.targetWeeklyRate);
    const actualLabel = `${rate >= 0 ? "+" : "−"}${Math.abs(rate).toFixed(2)}`;

    if ((cutting || bulking) && Number.isFinite(target)) {
        const targetLabel = `${target >= 0 ? "+" : "−"}${Math.abs(target).toFixed(2)}`;
        const paceDifference = (rate - target) * Math.sign(target || (cutting ? -1 : 1));
        if (Math.abs(rate - target) > PACE_NOTICE_LB_PER_WEEK) {
            const direction = paceDifference < 0 ? "below" : "above";
            return [
                `${paceDifference < 0 ? "Below" : "Above"} goal pace`,
                `Your smoothed weight trend is ${actualLabel} lb/week versus a goal of ${targetLabel} lb/week. This is ${direction} your goal pace; if it continues, revisit calorie intake at your next check-in.`
            ];
        }
        return ["Near goal pace", `Your smoothed weight trend is ${actualLabel} lb/week versus a goal of ${targetLabel} lb/week. Keep logging and review it at your next check-in.`];
    }

    return ["Weight trend", `Your current smoothed trend is ${actualLabel} lb/week.`];
}
