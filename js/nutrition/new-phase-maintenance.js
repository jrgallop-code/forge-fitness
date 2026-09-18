function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

export function currentExpenditureFromEstimate(estimate) {
    return positive(estimate?.liveMaintenanceCalories)
        ?? positive(estimate?.maintenanceCalories)
        ?? positive(estimate?.profileEstimate);
}

export function resolvePhaseMaintenance({ selectedGoalId, activeGoalId, enteredMaintenance, estimate } = {}) {
    const fallback = positive(enteredMaintenance);
    const isChangingPhase = Boolean(selectedGoalId && activeGoalId && selectedGoalId !== activeGoalId);
    if (!isChangingPhase || estimate?.status !== "established") return fallback;

    const expenditure = currentExpenditureFromEstimate(estimate);
    return expenditure === null ? fallback : Math.round(expenditure);
}
