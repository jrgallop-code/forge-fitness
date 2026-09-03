export const TUTORIAL_STATE_KEY = "level_up_tutorial_state_v1";

export const CONTEXTUAL_TUTORIALS = [
    {
        id: "expenditure",
        title: "Understand Your Expenditure",
        summary: "Learn how Level Up combines logged intake with smoothed Trend Weight to update TDEE daily while keeping calorie-target decisions on a weekly review schedule.",
        duration: "2 min",
        page: "progress",
        tab: "nutrition-progress-tab",
        steps: [
            { eyebrow: "THE BASICS", title: "What is expenditure?", body: "Expenditure—also called TDEE—is an estimate of the total energy your body uses each day. It includes basic body functions, daily movement, training and digestion." },
            { eyebrow: "YOUR STARTING POINT", title: "Generic becomes personal", body: "Level Up starts with the generic estimate from your Body Profile. That dashed reference uses age, sex, height, weight and activity. Your calculated TDEE becomes personal as real food and weight data are added." },
            { eyebrow: "THE WEIGHT SIGNAL", title: "TDEE uses your smoothed Weekly Trend", body: "Level Up uses the same smoothed Weekly Trend shown in Weight Progress. Missing days are interpolated only between real weigh-ins, recent data receives more weight, and weekly pace is estimated from up to the latest 20 days of smoothed Trend Weight. This reduces the influence of normal day-to-day scale noise." },
            { eyebrow: "THE CALCULATION", title: "Intake meets weight change", body: "Level Up averages your logged calorie intake through yesterday over its existing 21-day intake window, then adjusts that intake for your smoothed weekly weight-change rate. Conceptually: TDEE = average intake − (weekly weight change × 500). Gaining weight lowers the expenditure estimate relative to intake; losing weight raises it." },
            { eyebrow: "DAILY EXPENDITURE", title: "TDEE can update each day", body: "When enough usable nutrition and weight evidence is available, Level Up recalculates your expenditure each day. The Current Expenditure card and Expenditure Over Time graph show this daily estimate. If a fresh estimate cannot be calculated, the last usable value is shown as Holding instead." },
            { eyebrow: "WEEKLY CALORIE REVIEW", title: "Your calorie target changes less often", body: "Daily TDEE movement does not rewrite your calorie target every day. Level Up keeps calorie-target decisions on the existing weekly review schedule, using your goal, actual intake, Trend Weight and expenditure evidence to recommend whether calories should increase, decrease or stay the same." }
        ]
    },
    {
        id: "trend-weight",
        title: "Understand Trend Weight",
        summary: "See how Level Up smooths scale noise and turns your weigh-ins into a useful weekly rate.",
        duration: "2 min",
        page: "progress",
        tab: "weight-tab",
        steps: [
            { eyebrow: "THE BASICS", title: "Scale weight is noisy", body: "Your scale can move from water, sodium, carbohydrate intake, food volume and training-related inflammation. Trend Weight is designed to show the underlying direction without treating one weigh-in as a true change in body tissue." },
            { eyebrow: "MISSING DAYS", title: "Gaps are filled between weigh-ins", body: "When you miss a day, Level Up estimates the path between two real weigh-ins using linear interpolation. These in-between values are only used for the calculation—they are never shown as weights you actually logged, and Level Up never projects beyond your latest real weigh-in." },
            { eyebrow: "SMOOTHING", title: "Recent data matters more", body: "Level Up applies an exponentially weighted smoother. Each new day contributes 25% to the updated trend while 75% comes from the previous trend. This lets persistent changes move the line while reducing the impact of a single unusually high or low scale reading." },
            { eyebrow: "WEEKLY TREND", title: "The rate comes from the smoothed line", body: "Weekly Trend is calculated from a regression across up to the latest 20 days of smoothed Trend Weight and expressed in pounds per week. The rate therefore reflects the direction of the smoothed trend rather than the difference between two individual scale readings." },
            { eyebrow: "CONFIDENCE", title: "It gets stronger with more weigh-ins", body: "With at least 3 real weigh-ins spanning 5 days, Level Up can show a Preliminary Trend. With at least 6 weigh-ins spanning 14 days, it becomes the standard Weekly Trend. More regular weigh-ins make the estimate steadier, but missing days do not reset it." },
            { eyebrow: "TDEE", title: "The same rate informs daily expenditure", body: "TDEE uses this same smoothed weekly weight-change signal. When enough evidence is available, the expenditure estimate can update daily as intake and Trend Weight evolve. Calorie-target decisions remain on the separate weekly review schedule." }
        ]
    }
];

function readState() {
    try {
        const value = JSON.parse(localStorage.getItem(TUTORIAL_STATE_KEY) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

function writeState(state) {
    try { localStorage.setItem(TUTORIAL_STATE_KEY, JSON.stringify(state)); }
    catch { /* Tutorials remain usable for the current visit if storage is unavailable. */ }
}

function updateTutorial(id, changes) {
    const tutorial = getTutorial(id);
    if (!tutorial) return null;
    const state = readState();
    const current = state[id] && typeof state[id] === "object" ? state[id] : {};
    state[id] = { ...current, ...changes, updatedAt: new Date().toISOString() };
    writeState(state);
    return state[id];
}

export function getTutorial(id) {
    return CONTEXTUAL_TUTORIALS.find(tutorial => tutorial.id === id) || null;
}

export function getTutorialState(id) {
    const tutorial = getTutorial(id);
    const value = readState()[id];
    const status = ["active", "dismissed", "completed"].includes(value?.status) ? value.status : "not-started";
    const maximum = Math.max(0, (tutorial?.steps.length || 1) - 1);
    const step = Math.min(maximum, Math.max(0, Math.floor(Number(value?.step) || 0)));
    return { status, step };
}

export function shouldShowTutorial(id) {
    return ["not-started", "active"].includes(getTutorialState(id).status);
}

export function setTutorialStep(id, step) {
    const tutorial = getTutorial(id);
    if (!tutorial) return null;
    const nextStep = Math.min(tutorial.steps.length - 1, Math.max(0, Math.floor(Number(step) || 0)));
    return updateTutorial(id, { status: "active", step: nextStep });
}

export function restartTutorial(id) {
    return updateTutorial(id, { status: "active", step: 0, restartedAt: new Date().toISOString() });
}

export function dismissTutorial(id, step = 0) {
    return updateTutorial(id, { status: "dismissed", step, dismissedAt: new Date().toISOString() });
}

export function completeTutorial(id) {
    const tutorial = getTutorial(id);
    return updateTutorial(id, { status: "completed", step: Math.max(0, (tutorial?.steps.length || 1) - 1), completedAt: new Date().toISOString() });
}
