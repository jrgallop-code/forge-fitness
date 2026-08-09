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
