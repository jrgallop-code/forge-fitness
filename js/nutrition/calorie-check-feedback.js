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

function visibleAssessment(visibleRate, targetRate, tolerance, { provisional = false } = {}) {
    const actual = finite(visibleRate);
    const target = finite(targetRate);
    const range = finite(tolerance);
    if (actual === null || target === null || range === null) return "";
    const onTarget = Math.abs(actual - target) <= range;
    const label = provisional ? "Provisional pace" : onTarget ? "On-target pace" : "Current pace";
    return `${label}: ${formatRate(actual)} vs ${formatRate(target)} lb/week`;
}

export function buildPendingCalorieCheckMessage({ metrics, visibleRate = null, foodLoggedDays = null } = {}) {
    const trend = metrics?.trend || {};
    const phaseDay = finite(trend.phaseDay);
    const checkDay = finite(trend.checkDay);
    const nextCheckDay = finite(trend.nextCheckDay);
    const target = finite(metrics?.targetRateLbPerWeek);
    const tolerance = finite(metrics?.toleranceLbPerWeek);
    const assessment = visibleAssessment(visibleRate, target, tolerance, { provisional: true });
    const foodDays = finite(foodLoggedDays);
    const foodMinimum = 4;
    const completedFoodDays = foodDays === null ? null : Math.max(0, Math.round(foodDays));
    const missingFoodDays = completedFoodDays === null ? 0 : Math.max(0, foodMinimum - completedFoodDays);

    if (phaseDay !== null && phaseDay < 14) {
        return `${assessment ? `${assessment} · ` : ""}First calorie check on Day 14 · currently Day ${Math.round(phaseDay)}`;
    }

    const minimum = Math.max(1, Math.round(finite(trend.minEntriesPerWindow) || 4));
    const previous = Math.max(0, Math.round(finite(trend.previousEntries) || 0));
    const current = Math.max(0, Math.round(finite(trend.currentEntries) || 0));
    if (previous < minimum || current < minimum) {
        const missing = [];
        if (previous < minimum) missing.push(`${minimum - previous} more weigh-in${minimum - previous === 1 ? "" : "s"} in the previous 7-day block`);
        if (current < minimum) missing.push(`${minimum - current} more weigh-in${minimum - current === 1 ? "" : "s"} in the current 7-day block`);
        if (missingFoodDays) missing.push(`${missingFoodDays} more complete food day${missingFoodDays === 1 ? "" : "s"} in the current 7-day window`);
        const foodProgress = completedFoodDays === null ? "" : ` · ${Math.min(completedFoodDays, foodMinimum)}/${foodMinimum} food days`;
        const progress = `${Math.min(previous, minimum)}/${minimum} previous weigh-ins · ${Math.min(current, minimum)}/${minimum} current weigh-ins${foodProgress}`;
        return `No calorie recommendation yet · Add ${missing.join(" and ")} (${progress})${assessment ? ` · ${assessment}` : ""}`;
    }

    if (missingFoodDays) {
        return `No calorie recommendation yet · Add ${missingFoodDays} more complete food day${missingFoodDays === 1 ? "" : "s"} in the current 7-day window (${Math.min(completedFoodDays, foodMinimum)}/${foodMinimum} food days)${assessment ? ` · ${assessment}` : ""}`;
    }

    if (metrics?.status === "AWAITING WEIGH-IN") {
        const pendingDay = checkDay ?? nextCheckDay ?? 14;
        return `${assessment ? `${assessment} · ` : ""}Log a new weigh-in for the Day ${Math.round(pendingDay)} check`;
    }

    const scheduledDay = checkDay ?? nextCheckDay;
    if (scheduledDay !== null) {
        return `${assessment ? `${assessment} · ` : ""}Next scheduled calorie check: Day ${Math.round(scheduledDay)}`;
    }

    return assessment ? `No calorie recommendation yet · ${assessment}` : "No calorie recommendation yet · Keep logging weight to unlock the next check";
}
