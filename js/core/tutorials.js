export const TUTORIAL_STATE_KEY = "level_up_tutorial_state_v1";

export const CONTEXTUAL_TUTORIALS = [
    {
        id: "expenditure",
        title: "Understand Your Expenditure",
        summary: "Learn how Level Up estimates TDEE, reads your trend and uses it in weekly calorie reviews.",
        duration: "2 min",
        page: "progress",
        tab: "nutrition-progress-tab",
        steps: [
            { eyebrow: "THE BASICS", title: "What is expenditure?", body: "Expenditure—also called TDEE—is an estimate of the total energy your body uses each day. It includes basic body functions, daily movement, training and digestion." },
            { eyebrow: "YOUR STARTING POINT", title: "Generic becomes personal", body: "Level Up starts with the generic estimate from your Body Profile. That dashed reference uses age, sex, height, weight and activity. Your solid TDEE trend becomes personal as real food and weight data are added." },
            { eyebrow: "THE CALCULATION", title: "Intake meets weight trend", body: "Level Up compares your average completed food logs through yesterday with a separate 21-day regression of your weigh-ins. It accounts for the energy implied by gaining or losing weight to estimate the intake that would maintain your current body weight." },
            { eyebrow: "CURRENT STRATEGY", title: "Learning, holding or updating", body: "Learning means there is not enough usable data yet. Holding means a valid estimate is kept steady between weekly reviews—not that your body has stopped changing. Updating means a new estimate is ready for your weekly calorie review." },
            { eyebrow: "THE TREND GRAPH", title: "Read the line, not one day", body: "The solid line connects verified TDEE estimates. Missing data are left out rather than plotted as zero. The dashed line is your generic profile estimate. Tap or drag for a date, then double-tap to close the detail card." },
            { eyebrow: "YOUR CALORIE TARGET", title: "How Level Up uses it", body: "At each weekly review, Level Up combines your current TDEE with your phase goal to calculate an appropriate calorie target. It requires enough recent data and limits early changes, so one meal, weigh-in or unusual day cannot move your target by itself." }
        ]
    },
    {
        id: "trend-weight",
        title: "Understand Trend Weight",
        summary: "See how Level Up smooths scale noise and turns your weigh-ins into a useful weekly trend.",
        duration: "2 min",
        page: "progress",
        tab: "weight-tab",
        steps: [
            { eyebrow: "THE BASICS", title: "Scale weight is noisy", body: "Your scale can move from water, sodium, carbohydrate intake, food volume and training-related inflammation. Trend Weight is designed to show the underlying direction without treating one weigh-in as a true change in body tissue." },
            { eyebrow: "MISSING DAYS", title: "Gaps are filled between weigh-ins", body: "When you miss a day, Level Up estimates the path between two real weigh-ins using linear interpolation. These in-between values are only used for the Trend Weight calculation—they are never shown as weights you actually logged, and Level Up never projects beyond your latest real weigh-in." },
            { eyebrow: "SMOOTHING", title: "Recent data matters more", body: "Level Up applies an exponentially weighted smoother to Trend Weight. Each new day contributes 25% to the updated trend while 75% comes from the previous trend. This lets persistent changes move the line while reducing the impact of a single unusually high or low scale reading." },
            { eyebrow: "WEEKLY TREND", title: "The rate comes from the smoothed line", body: "Weekly Trend is calculated from a regression across up to the latest 20 days of smoothed Trend Weight and expressed as a weekly rate. That means the weekly number reflects the direction of the underlying trend rather than the difference between noisy individual scale readings." },
            { eyebrow: "CONFIDENCE", title: "It gets stronger with more weigh-ins", body: "With at least 3 real weigh-ins spanning 5 days, Level Up can show a Preliminary Trend. With at least 6 weigh-ins spanning 14 days, it becomes the standard Weekly Trend. More regular weigh-ins improve confidence, but missing days do not reset your Trend Weight." },
            { eyebrow: "TDEE", title: "Weight trend can inform expenditure", body: "Your visible Trend Weight and Weekly Trend now use the same smoothed weight signal. Level Up's current TDEE engine still keeps its existing 21-day intake-and-weight regression logic, so changing the visible trend does not yet change TDEE. A future TDEE update can deliberately use the smoothed trend as its weight-change input without changing the calorie-intake side of the calculation." }
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
