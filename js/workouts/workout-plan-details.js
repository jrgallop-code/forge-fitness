import { getPresetPlan } from "./workout-plans.js";
import { getExerciseById } from "./exercise-library.js";
import { openWorkoutLogger } from "./workout-session.js?v=workout-session-4";
import { createGeneratedExerciseGuide } from "./exercise-guide-generator.js?v=full-library-guides-1";

const PLAN_STORAGE_KEY = "forge_workout_plans";
let bypassNextPlanClick = false;
const MUSCLE_IMAGE_PATHS = {
    "Chest": "assets/exercise-guides/chest.webp?v=1",
    "Triceps": "assets/exercise-guides/triceps.webp?v=1",
    "Front Delts": "assets/exercise-guides/front-delts.webp?v=1",
    "Quads": "assets/exercise-guides/quads.webp?v=1",
    "Glutes": "assets/exercise-guides/glutes.webp?v=1",
    "Adductors": "assets/exercise-guides/adductors.webp?v=1",
    "Spinal Erectors": "assets/exercise-guides/spinal-erectors.webp?v=1",
    "Lats": "assets/exercise-guides/lats.webp?v=1",
    "Upper Back": "assets/exercise-guides/upper-back.webp?v=1",
    "Rear Delts": "assets/exercise-guides/rear-delts.webp?v=1",
    "Biceps": "assets/exercise-guides/biceps.webp?v=1",
    "Forearms": "assets/exercise-guides/forearms.webp?v=1",
    "Hamstrings": "assets/exercise-guides/hamstrings.webp?v=1",
    "Rectus Abdominis": "assets/exercise-guides/rectus-abdominis.webp?v=1",
    "Obliques": "assets/exercise-guides/obliques.webp?v=1",
    "Deep Core": "assets/exercise-guides/deep-core.webp?v=1",
    "Side Delts": "assets/exercise-guides/side-delts.webp?v=1",
    "Calves": "assets/exercise-guides/calves.webp?v=1"
};

const EXERCISE_GUIDES = {
    "barbell-bench-press": {
        primary: ["Chest"],
        secondary: ["Triceps", "Front Delts"],
        setup: [
            "Set your eyes slightly behind the bar and place both feet firmly.",
            "Use a comfortable grip that lets the forearms approach vertical near the bottom.",
            "Keep the upper back supported and unrack the bar with control."
        ],
        execution: [
            "Lower the bar toward the mid-to-lower chest using a repeatable path.",
            "Keep the wrists stacked over the forearms and press smoothly.",
            "Finish each repetition under control without bouncing the bar."
        ],
        cues: ["Stable feet", "Controlled touch", "Repeatable bar path"],
        mistakes: ["Losing foot pressure", "Letting the wrists fold back excessively", "Changing the touch point between repetitions"]
    },
    "back-squat": {
        primary: ["Quads", "Glutes"],
        secondary: ["Adductors", "Spinal Erectors"],
        setup: [
            "Place the bar securely on the upper back and choose a comfortable stance.",
            "Keep the feet planted and take a breath before beginning the repetition.",
            "Use safety arms or suitable supervision when appropriate."
        ],
        execution: [
            "Bend the knees and hips together while keeping pressure through the whole foot.",
            "Descend only as far as you can control with a consistent position.",
            "Stand by driving the floor away and keeping the hips and shoulders moving together."
        ],
        cues: ["Whole foot planted", "Knees track with feet", "Hips and shoulders rise together"],
        mistakes: ["Rushing the descent", "Allowing the heels to lift", "Turning the final repetitions into a different movement"]
    },
    "conventional-deadlift": {
        primary: ["Glutes", "Hamstrings"],
        secondary: ["Spinal Erectors", "Upper Back", "Forearms"],
        setup: [
            "Position the bar over the middle of the foot and use a stable stance.",
            "Take a secure grip, bring the body close to the bar and brace before lifting.",
            "Use an appropriate starting height if the floor position cannot be reached comfortably."
        ],
        execution: [
            "Push through the floor while keeping the bar close to the body.",
            "Extend the knees and hips smoothly without jerking the bar.",
            "Finish standing tall, then return the bar with control."
        ],
        cues: ["Brace before lifting", "Keep the bar close", "Push the floor away"],
        mistakes: ["Rushing the setup", "Letting the bar drift forward", "Leaning backward at the top"]
    },
    "barbell-row": {
        primary: ["Lats", "Upper Back"],
        secondary: ["Rear Delts", "Biceps", "Spinal Erectors"],
        setup: [
            "Use a stable stance and hinge to a torso angle you can maintain.",
            "Brace before lifting and let the arms begin long.",
            "Choose a load that does not require excessive body movement."
        ],
        execution: [
            "Pull the bar toward the lower ribs using a repeatable path.",
            "Keep the torso controlled while the elbows travel back.",
            "Lower the bar until the arms are long again without losing the setup."
        ],
        cues: ["Stable torso", "Elbows travel back", "Controlled lowering"],
        mistakes: ["Standing taller on every repetition", "Shrugging toward the ears", "Using momentum to shorten the range"]
    },
    "pull-up": {
        primary: ["Lats"],
        secondary: ["Upper Back", "Biceps", "Forearms"],
        setup: [
            "Take a secure, comfortable grip and begin from a controlled hang.",
            "Keep the body organized rather than swinging before the first repetition.",
            "Use assistance when needed to keep the repetitions consistent."
        ],
        execution: [
            "Pull the elbows down while bringing the upper chest toward the bar.",
            "Use a comfortable range without forcing the neck forward.",
            "Lower under control before beginning the next repetition."
        ],
        cues: ["No swinging start", "Elbows down", "Controlled return"],
        mistakes: ["Kicking for momentum", "Shrugging throughout the pull", "Dropping quickly from the top"]
    },
    "plank": {
        primary: ["Deep Core"],
        secondary: ["Rectus Abdominis", "Obliques"],
        setup: ["Place the forearms beneath the shoulders and extend both legs.", "Keep the head, ribcage and pelvis in a comfortable neutral line.", "Brace gently before lifting the knees from the floor."],
        execution: ["Press the forearms and toes into the floor.", "Hold a steady body position while breathing normally.", "End the set when you can no longer maintain the same position."],
        cues: ["Long straight line", "Breathe while braced", "Push the floor away"],
        mistakes: ["Letting the hips sag", "Holding the breath", "Continuing after position changes substantially"]
    },
    "side-plank": {
        primary: ["Obliques"],
        secondary: ["Deep Core"],
        setup: ["Place the elbow beneath the shoulder and stack or stagger the feet.", "Align the head, ribs, hips and legs.", "Use a bent-knee variation if needed for control."],
        execution: ["Lift the hips away from the floor.", "Hold the torso steady without rotating forward or backward.", "Lower with control when the target time is complete."],
        cues: ["Elbow under shoulder", "Hips tall", "Stay square"],
        mistakes: ["Shrugging into the shoulder", "Letting the hips drift down", "Rotating the chest toward the floor"]
    },
    "dead-bug": {
        primary: ["Deep Core"],
        secondary: ["Rectus Abdominis"],
        setup: ["Lie on your back with the hips and knees comfortably bent.", "Reach the arms upward and gently brace the trunk.", "Keep the lower back position steady without forcing it flat."],
        execution: ["Slowly extend the opposite arm and leg.", "Move only as far as the trunk can remain controlled.", "Return to the start and alternate sides."],
        cues: ["Move slowly", "Keep ribs controlled", "Shorten the range if needed"],
        mistakes: ["Arching as the limbs lower", "Rushing between sides", "Using a range that cannot be controlled"]
    },
    "bird-dog": {
        primary: ["Deep Core"],
        secondary: ["Obliques", "Spinal Erectors"],
        setup: ["Begin on hands and knees with hands below shoulders and knees below hips.", "Find a comfortable neutral spine.", "Brace lightly before moving."],
        execution: ["Reach the opposite arm and leg away from the body.", "Keep the pelvis and ribcage facing the floor.", "Return with control and alternate sides."],
        cues: ["Reach long", "Hips stay level", "Slow return"],
        mistakes: ["Rotating the pelvis", "Overarching the back", "Lifting the limbs higher than control allows"]
    },
    "cable-crunch": {
        primary: ["Rectus Abdominis"],
        secondary: ["Obliques"],
        setup: ["Kneel at a cable with the rope held near the sides of the head.", "Choose a stable knee and hip position.", "Begin with enough space for the cable to stay tensioned."],
        execution: ["Bring the ribs toward the pelvis by flexing the trunk.", "Keep the hips relatively steady rather than sitting back.", "Return slowly until the abdominal muscles are lengthened comfortably."],
        cues: ["Ribs toward pelvis", "Hips stay quiet", "Control the return"],
        mistakes: ["Pulling mainly with the arms", "Turning the movement into a hip hinge", "Using momentum to move the stack"]
    },
    "pallof-press": {
        primary: ["Obliques", "Deep Core"],
        secondary: [],
        setup: ["Stand or kneel sideways to a cable with a stable base.", "Hold the handle close to the chest with both hands.", "Move far enough from the stack to create manageable tension."],
        execution: ["Press the handle straight away from the chest.", "Resist being rotated toward the cable.", "Pause briefly, then return the handle under control."],
        cues: ["Stay square", "Press straight out", "Do not rotate"],
        mistakes: ["Choosing tension that pulls the body around", "Leaning away from the cable", "Rushing the return"]
    },
    "hanging-knee-raise": {
        primary: ["Rectus Abdominis"],
        secondary: ["Obliques"],
        setup: ["Take a secure grip and begin from a controlled hang.", "Let the legs settle before starting.", "Use a supported captain's-chair variation if grip is limiting."],
        execution: ["Raise the knees while gently curling the pelvis upward.", "Pause without swinging.", "Lower slowly until the body is steady again."],
        cues: ["Start without swinging", "Curl the pelvis", "Slow lower"],
        mistakes: ["Using momentum", "Only flexing at the hips", "Dropping the legs quickly"]
    },
    "ab-wheel-rollout": {
        primary: ["Rectus Abdominis"],
        secondary: ["Deep Core", "Obliques"],
        setup: ["Kneel with the wheel below the shoulders and hands secure.", "Brace the trunk and begin with a modest range.", "Use a clear, non-slip path for the wheel."],
        execution: ["Roll forward while the hips and shoulders travel together.", "Stop before the lower back position changes.", "Pull the wheel back by maintaining trunk tension."],
        cues: ["Ribs controlled", "Hips and shoulders together", "Own the range"],
        mistakes: ["Allowing the lower back to sag", "Sending the hips back without moving the shoulders", "Rolling farther than can be controlled"]
    }
};

function getSavedPlans() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

function getPlanFromCard(card) {
    if (card.dataset.planId) {
        const plan = getPresetPlan(card.dataset.planId);
        return plan ? { plan, type: "template", card } : null;
    }

    if (card.dataset.customPlanId) {
        const plan = getSavedPlans().find(item => item?.id === card.dataset.customPlanId);
        return plan ? { plan, type: "custom", card } : null;
    }

    return null;
}

function getPlanStats(plan) {
    const days = Array.isArray(plan?.days) ? plan.days : [];
    const exercises = days.flatMap(day => Array.isArray(day?.exercises) ? day.exercises : []);
    const workingSets = exercises.reduce((total, exercise) => total + (Number(exercise?.sets) || 0), 0);

    return {
        days: days.length,
        exercises: exercises.length,
        workingSets
    };
}

function exerciseName(id) {
    return getExerciseById(id)?.name || String(id || "Exercise")
        .split("-")
        .map(word => word ? word[0].toUpperCase() + word.slice(1) : word)
        .join(" ");
}

function exerciseThumbnail(id) {
    const exercise = getExerciseById(id);
    const isCardio =
        exercise?.muscleGroup === "Cardio" ||
        exercise?.trackingType === "notes";

    if (isCardio) {
        return `
            <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M32 52S10 39 10 23c0-7 5-12 12-12 5 0 8 3 10 7 2-4 5-7 10-7 7 0 12 5 12 12 0 16-22 29-22 29Z"/>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 27h7v10H9V27Zm7-5h7v20h-7V22Zm7 10h18M41 22h7v20h-7V22Zm7 5h7v10h-7V27Z"/>
        </svg>
    `;
}



function muscleCropClass(muscle) {
    if (["Rectus Abdominis", "Obliques", "Deep Core", "Calves"].includes(muscle)) return "crop-core";
    if (["Quads", "Adductors", "Hamstrings"].includes(muscle)) return "crop-lower";
    if (["Glutes", "Spinal Erectors"].includes(muscle)) return "crop-mid";
    return "crop-upper";
}

function getExerciseGuide(exerciseId) {
    return EXERCISE_GUIDES[exerciseId] || createGeneratedExerciseGuide(getExerciseById(exerciseId));
}

function renderMuscleCards(guide) {
    return [
        ...guide.primary.map(muscle => ({ muscle, role: "primary" })),
        ...guide.secondary.map(muscle => ({ muscle, role: "secondary" }))
    ].map(item => `
        <article class="exercise-muscle-card">
            <div class="exercise-muscle-image-frame ${muscleCropClass(item.muscle)}">\n                <img class="exercise-muscle-figure" src="${escapeHtml(MUSCLE_IMAGE_PATHS[item.muscle])}" alt="${escapeHtml(item.muscle)} highlighted" loading="lazy">\n            </div>
            <strong>${escapeHtml(item.muscle)}</strong>
            <span class="${item.role}">${item.role}</span>
        </article>
    `).join("");
}

function showExerciseGuide(planScreen, exerciseId, options = {}) {
    const guide = getExerciseGuide(exerciseId);
    const page = planScreen.closest(".workout-page");
    if (!guide || !page) return;

    const previousScrollY = window.scrollY;
    page.querySelector(".exercise-guide-screen")?.remove();

    const screen = document.createElement("section");
    screen.className = "exercise-guide-screen";
    screen.innerHTML = `
        <button class="plan-detail-back exercise-guide-back" type="button">${escapeHtml(options.backLabel || "← Workout Plan")}</button>
        <header class="exercise-guide-header">
            <span class="eyebrow">EXERCISE GUIDE</span>
            <h2>${escapeHtml(exerciseName(exerciseId))}</h2>
            <p>Use these instructions as general technique guidance. Choose a comfortable range of motion and stop if an exercise causes pain.</p>
        </header>
        <section class="exercise-guide-section">
            <h3>Muscles Used</h3>
            <div class="exercise-muscle-grid">${renderMuscleCards(guide)}</div>
        </section>
        <section class="exercise-guide-section">
            <h3>Setup</h3>
            <ol>${guide.setup.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section">
            <h3>How to Perform It</h3>
            <ol>${guide.execution.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section exercise-cue-section">
            <h3>Key Cues</h3>
            <div class="exercise-cue-list">${guide.cues.map(cue => `<span>${escapeHtml(cue)}</span>`).join("")}</div>
        </section>
        <section class="exercise-guide-section">
            <h3>Common Mistakes</h3>
            <ul>${guide.mistakes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
    `;

    planScreen.hidden = true;

    if (options.preserveViewport) {
        planScreen.insertAdjacentElement("beforebegin", screen);
    }
    else {
        page.appendChild(screen);
    }

    screen.querySelector(".exercise-guide-back")?.addEventListener("click", () => {
        screen.remove();
        planScreen.hidden = false;

        requestAnimationFrame(() => {
            window.scrollTo({
                top: options.restoreScroll ? previousScrollY : 0,
                behavior: options.preserveViewport ? "auto" : "smooth"
            });
        });
    });

    if (options.focusGuideStart) {
        requestAnimationFrame(() => {
            screen.scrollIntoView({
                behavior: "auto",
                block: "start"
            });
        });
    }
    else if (options.preserveViewport) {
        requestAnimationFrame(() => {
            window.scrollTo({
                top: previousScrollY,
                behavior: "auto"
            });
        });
    }
    else {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

document.addEventListener("levelup:open-exercise-guide", event => {
    const exerciseId = event.detail?.exerciseId;
    const sourceScreen = document.querySelector(event.detail?.sourceSelector || "#plan-builder");
    if (!exerciseId || !sourceScreen) return;
    showExerciseGuide(sourceScreen, exerciseId, {
        backLabel: event.detail?.backLabel || "← Plan Builder",
        restoreScroll: true,
        preserveViewport: true,
        focusGuideStart: Boolean(event.detail?.focusGuideStart)
    });
});

function renderDay(day, index) {
    const exercises = Array.isArray(day?.exercises) ? day.exercises : [];

    return `
        <section class="plan-detail-day" data-plan-day-index="${index}">
            <div class="plan-detail-day-heading">
                <div>
                    <span>DAY ${index + 1}</span>
                    <h3>${escapeHtml(day?.name || `Day ${index + 1}`)}</h3>
                </div>
                <strong>${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}</strong>
            </div>

            <div class="plan-detail-exercise-list">
                ${exercises.length ? exercises.map(exercise => {
                    const hasGuide = Boolean(getExerciseGuide(exercise?.id));
                    const tag = hasGuide ? "button" : "div";
                    return `
                    <${tag} class="plan-detail-exercise-row ${hasGuide ? "has-exercise-guide" : ""}" ${hasGuide ? `type="button" data-exercise-guide="${escapeHtml(exercise.id)}" aria-label="Open ${escapeHtml(exerciseName(exercise.id))} exercise guide"` : ""}>
                        <span class="plan-detail-exercise-thumb" aria-hidden="true">
                            ${exerciseThumbnail(exercise?.id)}
                        </span>
                        <span class="plan-detail-exercise-copy">
                            <span class="plan-detail-exercise-name">${escapeHtml(exerciseName(exercise?.id))}${hasGuide ? '<span class="exercise-guide-label">Form guide</span>' : ""}</span>
                            <span class="plan-detail-exercise-target">
                                ${Number(exercise?.sets) || 0} sets
                                ${exercise?.reps ? ` × ${escapeHtml(exercise.reps)} reps` : ""}
                            </span>
                        </span>
                    </${tag}>
                `;
                }).join("") : '<p class="plan-detail-empty">No exercises added.</p>'}
            </div>
        </section>
    `;
}

function initializeDayCarousel(screen, dayCount) {
    const scroller = screen.querySelector(".plan-detail-days");
    const dots = [...screen.querySelectorAll("[data-plan-day-dot]")];
    const counter = screen.querySelector("[data-plan-day-counter]");
    if (!scroller || dayCount <= 1) return;

    const updateIndicator = () => {
        const width = scroller.clientWidth || 1;
        const index = Math.max(0, Math.min(dayCount - 1, Math.round(scroller.scrollLeft / width)));
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === index);
            dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
        });
        if (counter) counter.textContent = `Day ${index + 1} of ${dayCount}`;
    };

    scroller.addEventListener("scroll", () => requestAnimationFrame(updateIndicator), { passive: true });
    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            scroller.scrollTo({ left: scroller.clientWidth * index, behavior: "smooth" });
        });
    });
    updateIndicator();
}

function showPlanDetails({ plan, type, card }) {
    const page = document.querySelector(".workout-page");
    if (!page) return;

    page.querySelector("#workout-plan-detail-screen")?.remove();

    const stats = getPlanStats(plan);
    const days = Array.isArray(plan?.days) ? plan.days : [];
    const screen = document.createElement("section");
    screen.id = "workout-plan-detail-screen";
    screen.className = "workout-plan-detail-screen";

    screen.innerHTML = `
        <button class="plan-detail-back" type="button" aria-label="Back to workout plans">← Workout Plans</button>

        <div class="plan-detail-header">
            <span class="eyebrow">${type === "template" ? "LEVEL UP TEMPLATE" : "WORKOUT PLAN"}</span>
            <h2>${escapeHtml(plan?.name || "Workout Plan")}</h2>
            ${plan?.description ? `<p>${escapeHtml(plan.description)}</p>` : ""}
        </div>

        <div class="plan-detail-stats">
            <div><strong>${stats.days}</strong><span>Days / week</span></div>
            <div><strong>${stats.exercises}</strong><span>Exercises</span></div>
            <div><strong>${stats.workingSets}</strong><span>Working sets</span></div>
        </div>

        <div class="plan-detail-days" aria-label="Workout days">
            ${days.map(renderDay).join("")}
        </div>

        ${days.length > 1 ? `
            <div class="plan-day-swipe-guide">
                <div class="plan-day-dots" aria-label="Workout day navigation">
                    ${days.map((_, index) => `<button type="button" data-plan-day-dot="${index}" aria-label="Show day ${index + 1}" class="${index === 0 ? "active" : ""}"></button>`).join("")}
                </div>
                <span data-plan-day-counter>Day 1 of ${days.length}</span>
                <strong>Swipe left or right to view each day</strong>
            </div>
        ` : ""}

        <div class="plan-detail-bottom-actions">
            <button id="modify-workout-plan" class="secondary-btn" type="button">Modify Workout</button>
            <button id="start-workout-plan" class="primary-btn" type="button">Start Workout</button>
        </div>
    `;

    page.appendChild(screen);
    page.classList.add("showing-plan-details");

    initializeDayCarousel(screen, days.length);

    screen.addEventListener("click", event => {
        const trigger = event.target.closest("[data-exercise-guide]");
        if (trigger) showExerciseGuide(screen, trigger.dataset.exerciseGuide);
    });

    screen.querySelector(".plan-detail-back")?.addEventListener("click", closePlanDetails);

    screen.querySelector("#start-workout-plan")?.addEventListener("click", () => {
        closePlanDetails();
        requestAnimationFrame(() => openWorkoutLogger(plan));
    });

    screen.querySelector("#modify-workout-plan")?.addEventListener("click", () => {
        closePlanDetails();

        if (type === "custom") {
            const editButton = [...card.querySelectorAll("button")]
                .find(button => /edit plan/i.test(button.textContent || ""));
            editButton?.click();
            return;
        }

        bypassNextPlanClick = true;
        card.click();
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function closePlanDetails() {
    document.getElementById("workout-plan-detail-screen")?.remove();
    document.querySelector(".workout-page")?.classList.remove("showing-plan-details");
}

function handlePlanClick(event) {
    const card = event.target.closest?.(".preset-plan-card");
    if (!card || !card.closest(".workout-page")) return;

    if (bypassNextPlanClick) {
        bypassNextPlanClick = false;
        return;
    }

    if (event.target.closest("button") && card.dataset.customPlanId) return;

    const planInfo = getPlanFromCard(card);
    if (!planInfo) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showPlanDetails(planInfo);
}

document.addEventListener("click", handlePlanClick, true);

document.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest?.(".preset-plan-card");
    if (!card || !card.closest(".workout-page")) return;
    const planInfo = getPlanFromCard(card);
    if (!planInfo) return;
    event.preventDefault();
    showPlanDetails(planInfo);
});

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
