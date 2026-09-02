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
            {
                eyebrow: "THE BASICS",
                title: "What is expenditure?",
                body: "Expenditure—also called TDEE—is an estimate of the total energy your body uses each day. It includes basic body functions, daily movement, training and digestion."
            },
            {
                eyebrow: "YOUR STARTING POINT",
                title: "Generic becomes personal",
                body: "Level Up starts with the generic estimate from your Body Profile. That dashed reference uses age, sex, height, weight and activity. Your solid TDEE trend becomes personal as real food and weight data are added."
            },
            {
                eyebrow: "THE CALCULATION",
                title: "Intake meets weight trend",
                body: "Level Up compares your average completed food logs through yesterday with your smoothed 21-day weight trend. It accounts for the energy implied by gaining or losing weight to estimate the intake that would maintain your current trend weight."
            },
            {
                eyebrow: "CURRENT STRATEGY",
                title: "Learning, holding or updating",
                body: "Learning means there is not enough usable data yet. Holding means a valid estimate is kept steady between weekly reviews—not that your body has stopped changing. Updating means a new estimate is ready for your weekly calorie review."
            },
            {
                eyebrow: "THE TREND GRAPH",
                title: "Read the line, not one day",
                body: "The solid line connects verified TDEE estimates. Missing data are left out rather than plotted as zero. The dashed line is your generic profile estimate. Tap or drag for a date, then double-tap to close the detail card."
            },
            {
                eyebrow: "YOUR CALORIE TARGET",
                title: "How Level Up uses it",
                body: "At each weekly review, Level Up combines your current TDEE with your phase goal to calculate an appropriate calorie target. It requires enough recent data and limits early changes, so one meal, weigh-in or unusual day cannot move your target by itself."
            }
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
