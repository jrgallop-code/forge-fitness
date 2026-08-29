import { navigate } from "../core/router.js?v=deload-workout-preview-1";

const STORAGE_KEY = "level_up_completed_lessons_v1";

function ensureStyles() {
    if (document.querySelector('link[data-learn-level-up-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/learn-level-up.css?v=learn-level-up-2";
    link.dataset.learnLevelUpStyles = "";
    document.head.appendChild(link);
}

const ICONS = {
    start: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V5h14v14H5Zm2-2h10V7H7v10Zm2-8h6v2H9V9Zm0 4h4v2H9v-2Z"/></svg>',
    plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h3V3h2v2h6V3h2v2h3v16H4V5Zm2 5h12V7H6v3Zm0 9h12v-7H6v7Zm2-5h3v3H8v-3Z"/></svg>',
    workout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9h2v6h-2V9Zm2.5-2h3v10H5V7Zm3.5 4h7v2h-7v-2ZM16 7h3v10h-3V7Zm3.5 2h2v6h-2V9Z"/></svg>',
    overload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5h2v10.6l4.2-4.2 3 2.6L19 7.6V11h2V4h-7v2h3.5l-4.7 5.3-2.7-2.4L6 13V19H4Z"/></svg>',
    food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v5M8 3v5M11 3v5M5 8c0 1.7 1.3 3 3 3s3-1.3 3-3M8 11v10M18 3v18M18 3c-2.3 2.4-3.5 5-3.5 8H18"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>',
    progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5h2v12h14v2H4Zm3-3v-4h2v4H7Zm4 0V8h2v8h-2Zm4 0v-6h2v6h-2Z"/></svg>',
    cardio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h3l2-5 3.2 9 2.2-6H20v2h-4.2l-3.6 9-3.4-9.5L8.4 15H4v-2Z"/></svg>'
};

const LESSONS = [
    {
        id: "getting-started", icon: "start", title: "Getting Started", duration: "1 min", page: "home", action: "Open Dashboard",
        summary: "Learn exactly where your daily plan, targets and recent progress live.",
        steps: [
            ["Start on Dashboard", "This is the app’s daily overview. Scroll here to see today’s schedule, your next workout, nutrition progress and recent trends.", "Bottom bar → Dashboard (far-left button)"],
            ["Open the main areas", "The five buttons stay at the bottom of every main screen: Dashboard, Workout, Progress, Nutrition and More.", "Bottom bar → choose a labelled icon"],
            ["Use the primary action", "Bright red buttons are the main next step on a screen, such as starting a workout, logging food or saving changes.", "Inside a screen or card → bright red button"],
            ["Find help again", "Return here whenever you need a refresher. Opening a guide never changes your saved workout or nutrition data.", "Bottom bar → More (far right) → Learn Level Up"]
        ]
    },
    {
        id: "build-plan", icon: "plan", title: "Build Your First Workout Plan", duration: "2 min", page: "workout", action: "Open Workout Builder",
        summary: "Choose a coach or template, then tailor the plan to your schedule.",
        steps: [
            ["Open the plan builder", "Scroll to Build With a Coach. Tap a coach’s card to use that coaching style, or use one of the two buttons immediately below the coach cards.", "Bottom bar → Workout → Build With a Coach"],
            ["Choose a starting route", "Browse Library opens ready-made plans. Create Manually starts from scratch. A coach card opens the guided builder.", "Below the coach cards → Browse Library or Create Manually"],
            ["Answer the builder questions", "Move through goal, experience, training days, session length, equipment and muscle priorities. Use the red Continue button at the bottom of each question.", "Coach builder → answer card → Continue (bottom)"],
            ["Review the generated plan", "Check each workout day and its exercises, sets and rep ranges. Use Edit Answers to change requirements, or New Exercises to swap the exercise selection.", "Program result → Workout days → Edit Answers / New Exercises"],
            ["Save the plan", "Scroll to the bottom of the program result and tap Save Plan. The saved plan then appears under My Workouts on the Workout screen.", "Program result → bottom → Save Plan"]
        ]
    },
    {
        id: "log-workout", icon: "workout", title: "Log a Workout", duration: "2 min", page: "workout", action: "Open My Workouts",
        summary: "Record each working set and finish the session cleanly.",
        steps: [
            ["Open a saved plan", "Scroll to My Workouts and tap the plan you want. Use Log a Workout on its card to choose a workout day.", "Bottom bar → Workout → My Workouts → Log a Workout"],
            ["Start the correct day", "Choose the workout day you are completing, review its exercise list, then tap the red Start Workout button.", "Plan details → select workout day → Start Workout"],
            ["Log every working set", "Inside each exercise card, enter the weight and reps in that set’s row after you perform it. Add RPE when you want effort-based guidance.", "Workout logger → exercise card → set row → Weight / Reps / RPE"],
            ["Use the exercise tools", "Open the controls on an exercise card when you need a warm-up, exercise swap, superset or drop set. The rest timer appears during the active session.", "Workout logger → exercise card → exercise controls"],
            ["Complete the workout", "After the final set, scroll to the bottom and finish the session. This saves it to history and updates lifting progress and muscle stimulus.", "Workout logger → bottom of session → Complete Workout"]
        ]
    },
    {
        id: "progressive-overload", icon: "overload", title: "Use Progressive Overload", duration: "2 min", page: "progress", tab: "lifting-tab", action: "View Lifting Progress",
        summary: "Understand when to add reps, weight or keep the load steady.",
        steps: [
            ["Start a saved workout", "Progressive overload guidance is based on completed set history, so start the workout from a saved plan rather than recording it only in notes.", "Bottom bar → Workout → My Workouts → Log a Workout"],
            ["Record complete set data", "Enter both weight and reps for every working set. Add RPE when available so the app can distinguish a comfortable set from a limit set.", "Workout logger → exercise card → each set row"],
            ["Work inside the rep range", "Keep the same load while adding clean reps toward the top of the prescribed range. Increase weight only when the prompt supports it and technique remains sound.", "Workout logger → beneath exercise name → prescribed rep range"],
            ["Follow the next-session prompt", "On your next occurrence of that exercise, compare the suggested weight and rep target with the prior result before starting the set.", "Next workout → exercise card → suggestion above the set rows"],
            ["Review the longer trend", "Use the exercise chart to check whether estimated strength and session volume are improving across multiple workouts.", "Bottom bar → Progress → Lifting → Exercises"]
        ]
    },
    {
        id: "log-food", icon: "food", title: "Log Food & Create Meals", duration: "2 min", page: "energy", action: "Open Food Log",
        summary: "Search, scan or paste ingredients, then reuse meals you eat often.",
        steps: [
            ["Open the Food Log", "Nutrition opens on the Food Log. To add from anywhere on this screen, use + Log Food in the upper-right; to preselect a meal, tap + Add to Breakfast, Lunch, Dinner or Snacks.", "Bottom bar → Nutrition → Food Log → + Log Food (top right)"],
            ["Choose the meal", "At the top of the Log Food sheet, tap the Breakfast, Lunch, Dinner or Snacks chip under Log to.", "Log Food sheet → top → Log to meal chips"],
            ["Search or scan", "Type a food in Search foods and tap Search. For packaged food, tap the barcode icon immediately to the right of the search box.", "Log Food sheet → Search foods → barcode button on the right"],
            ["Set the amount", "Tap a search result, select the serving unit, and enter the total quantity you ate. Review the calorie and macro preview before adding it to the log.", "Search result → portion panel → Serving size and Number of servings"],
            ["Create reusable meals", "Open My Meals to build a meal food-by-food, or paste one ingredient per line and let the app match the list before you review and save it.", "Log Food sheet → My Meals → + Create a Meal or Paste Ingredients"],
            ["Paste an ingredient list", "Tap Paste Ingredients, enter one ingredient and amount per line, then tap Analyze Ingredients. Review every match and quantity before saving the meal.", "My Meals → Paste Ingredients → Analyze Ingredients"]
        ]
    },
    {
        id: "nutrition-goals", icon: "target", title: "Set Calorie & Macro Goals", duration: "2 min", page: "energy", tab: "[data-calories-tab='plan']", action: "Open Goals & Plan",
        summary: "Set a target and understand how adaptive nutrition responds to your trend.",
        steps: [
            ["Open Goals & Plan", "Use the tab beside Food Log at the top of Nutrition. This screen contains the profile, calorie target, macros and active phase settings.", "Bottom bar → Nutrition → Goals & Plan (top tab)"],
            ["Calculate energy needs", "Open Body Profile, enter age, sex, height, weight and activity level, then tap Save Profile & Calculate at the bottom of that form.", "Goals & Plan → Body Profile → Save Profile & Calculate"],
            ["Choose the calorie goal", "Open Goals & Calories, select your goal, review the recommended calories and tap Save Nutrition Goal.", "Goals & Plan → Goals & Calories → Save Nutrition Goal"],
            ["Choose macro targets", "Open Protein & Macros, pick a macro style, review the gram targets and tap Save Macro Preference.", "Goals & Plan → Protein & Macros → Save Macro Preference"],
            ["Start a nutrition phase", "Use Set Your Phase to define the current goal period. Logging food and weigh-ins during the phase gives adaptive guidance enough data to compare intake with the weight trend.", "Goals & Plan → Set Your Phase → Start Phase"],
            ["Review adaptive guidance", "Scroll below the active plan to the adaptive check-in. Treat suggestions as trend-based adjustments, not reactions to one isolated day.", "Goals & Plan → active phase → adaptive check-in below"]
        ]
    },
    {
        id: "read-progress", icon: "progress", title: "Read Your Progress", duration: "2 min", page: "progress", action: "Open Progress",
        summary: "Use trends, muscle maps and history without overreacting to daily noise.",
        steps: [
            ["Read the weight trend", "Weight is the first tab. Tap + Add Weight to enter a new measurement, then use Weight Trend below to focus on direction rather than one-day changes.", "Bottom bar → Progress → Weight → + Add Weight"],
            ["Review overall training", "Open Lifting, then Overview to see workout frequency, recent sessions and estimated strength improvements.", "Progress → Lifting → Overview"],
            ["Inspect one exercise", "Open Exercises, choose an exercise from the selector, then switch between Session Volume and Estimated 1RM above the chart.", "Progress → Lifting → Exercises → Exercise selector"],
            ["Check muscle coverage", "Open Muscles to view weekly set stimulus and the muscle map. These views summarize logged training; they do not diagnose recovery or injury.", "Progress → Lifting → Muscles"],
            ["Review nutrition adherence", "Open Nutrition to compare logged calories with the active target and review meal patterns across the selected period.", "Progress → Nutrition"],
            ["Change the time window", "Use the range controls at the top of a progress view before interpreting a chart so the date window matches the question you are asking.", "Progress tab → range buttons above the charts"]
        ]
    },
    {
        id: "cardio", icon: "cardio", title: "Track Cardio", duration: "1 min", page: "progress", tab: "cardio-progress-tab", action: "Open Cardio Progress",
        summary: "Log duration, distance and effort, then compare weekly trends.",
        steps: [
            ["Add or open a cardio exercise", "Start a scheduled workout containing cardio, or use the workout editor to add a cardio activity to the appropriate day.", "Bottom bar → Workout → saved plan → workout day"],
            ["Enter the cardio result", "In the cardio exercise card, record duration and, when relevant, distance. Use the same units consistently so speed comparisons remain meaningful.", "Workout logger → cardio exercise card → Duration / Distance"],
            ["Add RPE for cardio load", "Record effort after the session. Cardio Load uses duration and RPE, so two equally long sessions can receive different loads.", "Cardio exercise card → RPE field"],
            ["Open Cardio Progress", "The Cardio tab is in the top row of Progress, between Nutrition and Photo Log.", "Bottom bar → Progress → Cardio (top tab)"],
            ["Choose the date range", "Use 7D, 4W, 12W or All above the summary cards, then review weekly minutes, sessions, distance, speed and cardio load.", "Cardio Progress → 7D / 4W / 12W / All"]
        ]
    }
];

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function readCompleted() {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return new Set(Array.isArray(value) ? value.filter(Boolean) : []);
    } catch {
        return new Set();
    }
}

function saveCompleted(completed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
}

function lessonCard(lesson, completed) {
    return `<button class="learn-lesson-row ${completed.has(lesson.id) ? "is-complete" : ""}" type="button" data-lesson-id="${lesson.id}">
        <span class="learn-lesson-icon">${ICONS[lesson.icon]}</span>
        <span class="learn-lesson-copy"><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.summary)}</small><span>${escapeHtml(lesson.duration)} · ${lesson.steps.length} steps</span></span>
        <span class="learn-lesson-state" aria-label="${completed.has(lesson.id) ? "Completed" : "Not completed"}">${completed.has(lesson.id) ? "✓" : "›"}</span>
    </button>`;
}

export function renderLessonLibrary() {
    const completed = readCompleted();
    const total = LESSONS.length;
    const done = LESSONS.filter(lesson => completed.has(lesson.id)).length;
    const percent = Math.round((done / total) * 100);
    return `<section class="learn-shell">
        <header class="learn-header"><button class="nutrition-planner-back" type="button" data-learn-back>← More</button><span class="eyebrow">LEARN LEVEL UP</span><h2>Step-by-step walkthroughs</h2><p>Each guide names the exact tab, button and screen location, then takes you straight to the feature when you are ready.</p></header>
        <section class="learn-progress-card" aria-label="Lesson progress"><div><strong>${done} of ${total} complete</strong><span>${done === total ? "You know your way around Level Up." : "Choose only the guide you need."}</span></div><b>${percent}%</b><div class="learn-progress-track"><i style="width:${percent}%"></i></div></section>
        <section class="learn-lesson-list" aria-label="Level Up lessons">${LESSONS.map(lesson => lessonCard(lesson, completed)).join("")}</section>
    </section>`;
}

function renderLessonDetail(lesson, stepIndex = 0) {
    const step = lesson.steps[stepIndex];
    const last = stepIndex === lesson.steps.length - 1;
    return `<section class="learn-shell learn-detail" data-active-lesson="${lesson.id}" data-step="${stepIndex}">
        <header class="learn-header"><button class="nutrition-planner-back" type="button" data-lessons-back>← Walkthroughs</button><span class="eyebrow">${escapeHtml(lesson.duration)} GUIDE</span><h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.summary)}</p></header>
        <div class="learn-step-dots" aria-label="Step ${stepIndex + 1} of ${lesson.steps.length}">${lesson.steps.map((_, index) => `<i class="${index <= stepIndex ? "active" : ""}"></i>`).join("")}</div>
        <article class="learn-step-card">
            <span class="learn-step-number">STEP ${stepIndex + 1} OF ${lesson.steps.length}</span>
            <div class="learn-step-visual">${ICONS[lesson.icon]}</div>
            <h3>${escapeHtml(step[0])}</h3>
            <div class="learn-step-location"><span>WHERE TO FIND IT</span><strong>${escapeHtml(step[2])}</strong></div>
            <p>${escapeHtml(step[1])}</p>
        </article>
        <div class="learn-step-actions">
            <button class="secondary-btn" type="button" data-lesson-previous ${stepIndex === 0 ? "disabled" : ""}>Back</button>
            <button class="primary-btn" type="button" data-lesson-next>${last ? "Finish Guide" : "Next"}</button>
        </div>
        ${last ? `<button class="learn-open-feature" type="button" data-open-lesson-feature>${escapeHtml(lesson.action)} →</button>` : ""}
    </section>`;
}

function returnToMore() {
    const more = document.querySelector('.bottom-nav .nav-btn[data-page="more"]');
    if (more) more.click();
    else navigate("more");
}

function showLibrary(content) {
    content.innerHTML = renderLessonLibrary();
    bindLibrary(content);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLesson(content, lesson, stepIndex = 0) {
    content.innerHTML = renderLessonDetail(lesson, stepIndex);
    content.querySelector("[data-lessons-back]")?.addEventListener("click", () => showLibrary(content));
    content.querySelector("[data-lesson-previous]")?.addEventListener("click", () => showLesson(content, lesson, Math.max(0, stepIndex - 1)));
    content.querySelector("[data-lesson-next]")?.addEventListener("click", () => {
        if (stepIndex < lesson.steps.length - 1) {
            showLesson(content, lesson, stepIndex + 1);
            return;
        }
        const completed = readCompleted();
        completed.add(lesson.id);
        saveCompleted(completed);
        showLibrary(content);
    });
    content.querySelector("[data-open-lesson-feature]")?.addEventListener("click", () => openFeature(lesson));
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindLibrary(content) {
    content.querySelector("[data-learn-back]")?.addEventListener("click", returnToMore);
    content.querySelectorAll("[data-lesson-id]").forEach(button => button.addEventListener("click", () => {
        const lesson = LESSONS.find(item => item.id === button.dataset.lessonId);
        if (lesson) showLesson(content, lesson);
    }));
}

function openFeature(lesson) {
    const completed = readCompleted();
    completed.add(lesson.id);
    saveCompleted(completed);

    const navButton = document.querySelector(`.bottom-nav .nav-btn[data-page="${lesson.page}"]`);
    if (navButton) navButton.click();
    else navigate(lesson.page);

    if (!lesson.tab) return;
    window.setTimeout(() => {
        const selector = lesson.tab.startsWith("[") ? lesson.tab : `#${lesson.tab}`;
        document.querySelector(selector)?.click();
    }, 80);
}

export function openLessonLibrary() {
    const content = document.getElementById("content");
    if (!content) return;
    ensureStyles();
    showLibrary(content);
}
