function finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function formatRate(value) {
    const number = finite(value);
    if (number === null) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)}`;
}

function visibleAssessment(visibleRate, targetRate, tolerance) {
    const actual = finite(visibleRate);
    const target = finite(targetRate);
    const range = finite(tolerance);
    if (actual === null || target === null || range === null) return "";
    const onTarget = Math.abs(actual - target) <= range;
    return `${onTarget ? "Trend appears on target" : "Current trend"}: ${formatRate(actual)} vs ${formatRate(target)} lb/week`;
}

export function buildPendingCalorieCheckMessage({ metrics, visibleRate = null } = {}) {
    const trend = metrics?.trend || {};
    const phaseDay = finite(trend.phaseDay);
    const checkDay = finite(trend.checkDay);
    const nextCheckDay = finite(trend.nextCheckDay);
    const target = finite(metrics?.targetRateLbPerWeek);
    const tolerance = finite(metrics?.toleranceLbPerWeek);
    const assessment = visibleAssessment(visibleRate, target, tolerance);

    if (phaseDay !== null && phaseDay < 14) {
        return `${assessment ? `${assessment} · ` : ""}First calorie check on Day 14 · currently Day ${Math.round(phaseDay)}`;
    }

    const minimum = Math.max(1, Math.round(finite(trend.minEntriesPerWindow) || 4));
    const previous = Math.max(0, Math.round(finite(trend.previousEntries) || 0));
    const current = Math.max(0, Math.round(finite(trend.currentEntries) || 0));
    if (previous < minimum || current < minimum) {
        return `${assessment ? `${assessment} · ` : ""}Calorie check needs ${minimum} weigh-ins in each 7-day block (${previous}/${minimum} previous · ${current}/${minimum} current)`;
    }

    if (metrics?.status === "AWAITING WEIGH-IN") {
        const pendingDay = checkDay ?? nextCheckDay ?? 14;
        return `${assessment ? `${assessment} · ` : ""}Log a new weigh-in for the Day ${Math.round(pendingDay)} check`;
    }

    const scheduledDay = checkDay ?? nextCheckDay;
    if (scheduledDay !== null) {
        return `${assessment ? `${assessment} · ` : ""}Next scheduled calorie check: Day ${Math.round(scheduledDay)}`;
    }

    return assessment || "Keep logging weight to unlock the next calorie check";
}
