// Local calendar dates make the first-seven-days window match the user's month.
export function chooseMonthlyReportPrompt({ now, current, previous, previousHasData, currentHasData, previousDismissed, currentDismissed }) {
    if (previousHasData && !previousDismissed) return now.getDate() <= 7 ? previous : null;
    return currentHasData && !currentDismissed ? current : null;
}
