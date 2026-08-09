import { getPresetPlan } from "./workout-plans.js";
import { getExerciseById } from "./exercise-library.js";
import { openWorkoutLogger } from "./workout-session.js?v=workout-session-4";

const PLAN_STORAGE_KEY = "forge_workout_plans";
let bypassNextPlanClick = false;

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
    const common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

    if (id === "barbell-bench-press" || id === "dumbbell-bench-press" || id === "incline-dumbbell-press") {
        return `
            <svg viewBox="0 0 64 64" aria-hidden="true" ${common}>
                <path d="M9 46h39M18 42h28M21 42l4-13 12-5 8 7"/>
                <circle cx="31" cy="22" r="4"/>
                <path d="M21 18h28M17 15v6M21 13v10M49 15v6M45 13v10"/>
                <path d="M25 29 20 22M38 27l6-5"/>
            </svg>
        `;
    }

    if (id === "back-squat" || id === "hack-squat" || id === "leg-press") {
        return `
            <svg viewBox="0 0 64 64" aria-hidden="true" ${common}>
                <path d="M12 16h40M8 12v8M12 10v12M56 12v8M52 10v12"/>
                <circle cx="32" cy="24" r="4"/>
                <path d="M24 20h16M27 28l-4 12 8 8M37 28l4 12-8 8"/>
                <path d="M28 29h8M23 40h-8M41 40h8"/>
                <path d="M31 48l-5 8M33 48l5 8"/>
            </svg>
        `;
    }

    if (id === "lat-pulldown" || id === "pull-up" || id === "seated-cable-row") {
        return `
            <svg viewBox="0 0 64 64" aria-hidden="true" ${common}>
                <path d="M13 10h38M15 10l7 13M49 10l-7 13"/>
                <circle cx="32" cy="26" r="4"/>
                <path d="M27 30h10l3 12H24l3-12Z"/>
                <path d="M27 31 21 22M37 31l6-9"/>
                <path d="M27 42l-4 12M37 42l4 12M20 54h8M36 54h8"/>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 64 64" aria-hidden="true" ${common}>
            <path d="M10 28h7v8h-7zM17 24h6v16h-6zM23 30h18M41 24h6v16h-6zM47 28h7v8h-7z"/>
        </svg>
    `;
}

function renderDay(day, index) {
    const exercises = Array.isArray(day?.exercises) ? day.exercises : [];

    return `
        <section class="plan-detail-day">
            <div class="plan-detail-day-heading">
                <div>
                    <span>DAY ${index + 1}</span>
                    <h3>${escapeHtml(day?.name || `Day ${index + 1}`)}</h3>
                </div>
                <strong>${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}</strong>
            </div>

            <div class="plan-detail-exercise-list">
                ${exercises.length ? exercises.map(exercise => `
                    <div class="plan-detail-exercise-row">
                        <span class="plan-detail-exercise-thumb" aria-hidden="true">
                            ${exerciseThumbnail(exercise?.id)}
                        </span>
                        <span class="plan-detail-exercise-copy">
                            <span class="plan-detail-exercise-name">${escapeHtml(exerciseName(exercise?.id))}</span>
                            <span class="plan-detail-exercise-target">
                                ${Number(exercise?.sets) || 0} sets
                                ${exercise?.reps ? ` × ${escapeHtml(exercise.reps)} reps` : ""}
                            </span>
                        </span>
                    </div>
                `).join("") : '<p class="plan-detail-empty">No exercises added.</p>'}
            </div>
        </section>
    `;
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

        <div class="plan-detail-days">
            ${days.map(renderDay).join("")}
        </div>

        <div class="plan-detail-bottom-actions">
            <button id="modify-workout-plan" class="secondary-btn" type="button">Modify Workout</button>
            <button id="start-workout-plan" class="primary-btn" type="button">Start Workout</button>
        </div>
    `;

    page.appendChild(screen);
    page.classList.add("showing-plan-details");

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
