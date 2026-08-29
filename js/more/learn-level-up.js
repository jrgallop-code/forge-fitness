import { navigate } from "../core/router.js?v=deload-workout-preview-1";

const STORAGE_KEY = "level_up_completed_lessons_v1";

function ensureStyles() {
    if (document.querySelector('link[data-learn-level-up-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/learn-level-up.css?v=learn-level-up-1";
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
        summary: "Learn where your daily plan, targets and recent progress live.",
        steps: [
            ["Start on Dashboard", "Your schedule, next workout and today’s nutrition are collected here."],
            ["Use the bottom navigation", "Workout is for planning and logging, Progress is for trends, and Nutrition is for food and goals."],
            ["Look for red actions", "Red buttons are the main next step on each screen. Your entries save on this device and sync when cloud backup is enabled."]
        ]
    },
    {
        id: "build-plan", icon: "plan", title: "Build Your First Workout Plan", duration: "2 min", page: "workout", action: "Open Workout Builder",
        summary: "Choose a coach or template, then tailor the plan to your schedule.",
        steps: [
            ["Choose how to build", "Pick a coach-guided plan, browse the template library, or create one manually."],
            ["Answer the builder questions", "Your goal, experience, schedule, equipment and muscle priorities shape the result."],
            ["Review before saving", "Check every workout day, exercise, sets and rep ranges. You can still customize the plan."],
            ["Save the plan", "The finished plan appears in My Workouts and can be placed on your schedule."]
        ]
    },
    {
        id: "log-workout", icon: "workout", title: "Log a Workout", duration: "2 min", page: "workout", action: "Open My Workouts",
        summary: "Record each working set and finish the session cleanly.",
        steps: [
            ["Start from My Workouts", "Open a saved plan and choose the workout day you are completing."],
            ["Log every working set", "Enter weight and reps after the set. Add RPE when you want effort-based guidance."],
            ["Use the live tools", "Rest timer, warm-ups, exercise swaps, supersets and drop sets are available during the session."],
            ["Complete the workout", "Finishing saves the session to history and updates lifting progress, muscle maps and recommendations."]
        ]
    },
    {
        id: "progressive-overload", icon: "overload", title: "Use Progressive Overload", duration: "2 min", page: "progress", tab: "lifting-tab", action: "View Lifting Progress",
        summary: "Understand when to add reps, weight or keep the load steady.",
        steps: [
            ["Log consistently", "Level Up needs completed sets with weight and reps to compare performance."],
            ["Work inside the target range", "Add reps until you reach the top of the prescribed range with sound technique."],
            ["Follow the next-session prompt", "When performance supports it, Level Up suggests a modest load increase. Otherwise, repeat or adjust."],
            ["Review the trend", "Use Lifting Progress to separate a single good day from a durable strength trend."]
        ]
    },
    {
        id: "log-food", icon: "food", title: "Log Food & Create Meals", duration: "2 min", page: "energy", action: "Open Food Log",
        summary: "Search, scan or paste ingredients, then reuse meals you eat often.",
        steps: [
            ["Choose a meal", "Open Breakfast, Lunch, Dinner or Snacks and tap Add."],
            ["Find the food", "Search the database, scan a barcode, create a food, or paste an ingredient list."],
            ["Set the real amount", "Choose the serving unit and enter the total amount you ate. Review calories and macros before adding."],
            ["Save repeat meals", "Combine frequently used foods under My Meals so you can log them again in a few taps."]
        ]
    },
    {
        id: "nutrition-goals", icon: "target", title: "Set Calorie & Macro Goals", duration: "2 min", page: "energy", tab: "[data-calories-tab='plan']", action: "Open Goals & Plan",
        summary: "Set a target and understand how adaptive nutrition responds to your trend.",
        steps: [
            ["Open Goals & Plan", "Enter your profile, activity and goal to calculate a starting calorie target, or set one manually."],
            ["Set macros", "Protein is anchored to your goal and profile; carbs and fat divide the remaining calories."],
            ["Log food and weigh-ins", "Consistent intake and body-weight data let Level Up compare the expected trend with the observed trend."],
            ["Review adaptive guidance", "The app uses your rolling intake and weight trend to suggest measured changes rather than reacting to one day."]
        ]
    },
    {
        id: "read-progress", icon: "progress", title: "Read Your Progress", duration: "2 min", page: "progress", action: "Open Progress",
        summary: "Use trends, muscle maps and history without overreacting to daily noise.",
        steps: [
            ["Use Weight for the trend", "Daily scale changes are noisy. The rolling average shows the direction more clearly."],
            ["Use Lifting for performance", "Review strength, set volume, exercise trends and weekly muscle stimulus."],
            ["Use Nutrition for adherence", "Compare intake with your current target and see meal patterns over time."],
            ["Use muscle maps for coverage", "Maps summarize logged set stimulus. They support programming decisions; they do not diagnose recovery or injury."]
        ]
    },
    {
        id: "cardio", icon: "cardio", title: "Track Cardio", duration: "1 min", page: "progress", tab: "cardio-progress-tab", action: "Open Cardio Progress",
        summary: "Log duration, distance and effort, then compare weekly trends.",
        steps: [
            ["Add cardio to a workout", "Log the activity with duration and, when relevant, distance."],
            ["Add RPE for load", "Effort makes two sessions of the same length meaningfully different in Cardio Load."],
            ["Review the Cardio tab", "Track weekly minutes, session count, distance, speed and load over the selected date range."]
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
        <header class="learn-header"><button class="nutrition-planner-back" type="button" data-learn-back>← More</button><span class="eyebrow">LEARN LEVEL UP</span><h2>Quick walkthroughs</h2><p>Short, practical guides that take you straight to the real feature when you are ready.</p></header>
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
