import { getTrainingPreferences } from "../core/training-preferences.js?v=onboarding-training-days-1";
import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { presetPlans } from "./workout-plans.js?v=proven-template-builder-1";
import { celebrityWorkoutPlans } from "./celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "./bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "./celebrity-expansion-plans.js?v=celebrity-expansion-2";
import { getPlanArtwork } from "./workout-art-manifest.js?v=workout-art-direction-1";
import "./workout-plan-details.js?v=hide-adapted-source-1";

const PLAN_KEY = "forge_workout_plans";
const STYLE_ID = "workout-landing-live-styles";
const STYLE_HREF = "/css/workout-landing-live.css?v=workout-landing-live-1";

const allCataloguePlans = [
    ...presetPlans,
    ...celebrityWorkoutPlans,
    ...bodybuilderWorkoutPlans,
    ...celebrityExpansionPlans
].filter((plan, index, plans) => plans.findIndex(candidate => String(candidate?.id) === String(plan?.id)) === index);

const exerciseMap = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));

export function initializeWorkoutLandingLive(content = document) {
    const page = content.querySelector?.(".workout-page");
    const sourceHome = page?.querySelector?.("[data-workout-home]");
    if (!page || !sourceHome) return false;

    ensureStylesheet();

    content.__workoutLandingAbort?.abort?.();
    content.__workoutLandingObserver?.disconnect?.();

    const controller = new AbortController();
    content.__workoutLandingAbort = controller;

    page.classList.add("workout-live-page");
    sourceHome.classList.add("workout-live-source-home");

    const state = createInitialState();
    const landing = document.createElement("section");
    landing.className = "workout-live-landing";
    landing.dataset.workoutLiveLanding = "";
    page.insertBefore(landing, sourceHome);

    const render = () => renderLanding({ content, page, sourceHome, landing, state });
    render();

    content.addEventListener("click", event => {
        const target = event.target;

        if (target.closest?.(".nav-btn")) {
            closeSheet();
            return;
        }

        if (target.closest?.("[data-schedule-start], #start-workout-plan")) {
            window.setTimeout(() => { landing.hidden = true; }, 0);
            return;
        }

        const detailBack = target.closest?.(".plan-detail-back");
        if (detailBack && !detailBack.classList.contains("exercise-guide-back")) {
            window.setTimeout(() => showLanding({ landing, render }), 70);
            return;
        }

        if (target.closest?.("#close-plan-builder-btn, #save-plan-btn, [data-smart-close], [data-routine-import-close]")) {
            window.setTimeout(() => showLanding({ landing, render }), 100);
        }
    }, { capture: true, signal: controller.signal });

    document.addEventListener("click", event => {
        if (event.target.closest?.(".nav-btn")) closeSheet();
    }, { signal: controller.signal });

    const observer = new MutationObserver(() => {
        mountSchedule({ page, sourceHome, landing });
        maybeRestoreLanding({ page, landing, render });
    });
    observer.observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
    content.__workoutLandingObserver = observer;

    mountSchedule({ page, sourceHome, landing });
    return true;
}

function createInitialState() {
    const preferences = safePreferences();
    return {
        filters: {
            goal: normalizeGoal(preferences.primaryGoal),
            days: Number(preferences.days) || 4,
            level: normalizeLevel(preferences.experience),
            equipment: "Gym"
        },
        showAllPlans: false
    };
}

function renderLanding({ content, page, sourceHome, landing, state }) {
    const existingSchedule = landing.querySelector(".workout-schedule-shell");
    if (existingSchedule) sourceHome.prepend(existingSchedule);

    const matches = filteredPlans(state.filters);
    const recommended = selectRecommended(matches, state.filters, 5);
    const saved = readSavedPlans();
    const sourceRows = [
        ...saved.map(plan => ({ ...plan, isSavedPlan: true })),
        ...(state.showAllPlans ? allCataloguePlans : matches)
    ];
    const rows = sourceRows
        .filter((plan, index, plans) => plans.findIndex(candidate => String(candidate.id) === String(plan.id)) === index)
        .slice(0, state.showAllPlans ? undefined : 14);

    landing.innerHTML = `
        <section class="workout-live-schedule-section" data-workout-live-schedule>
            <div class="workout-live-schedule-heading">
                <div><h2>This Week</h2><p>Your workout schedule at a glance.</p></div>
            </div>
            <div class="workout-live-schedule-slot" data-workout-live-schedule-slot>
                <div class="workout-live-schedule-loading">Loading your schedule…</div>
            </div>
        </section>

        <header class="workout-live-hero">
            <div>
                <span class="workout-live-kicker">TRAINING</span>
                <h1>Workout Plans</h1>
                <p>Structured programs. Real progress.</p>
            </div>
            <button class="workout-live-new-plan" type="button" data-workout-live-new-plan>+ New Plan</button>
        </header>

        <div class="workout-live-filter-strip" aria-label="Program filters">
            ${allPlansButton(state.showAllPlans)}
            ${filterButton("goal", "Goal", state.filters.goal, targetIcon())}
            ${filterButton("days", "Days / week", `${state.filters.days} days`, calendarIcon())}
            ${filterButton("level", "Level", state.filters.level, barsIcon())}
            ${filterButton("equipment", "Equipment", state.filters.equipment, dumbbellIcon())}
        </div>

        <section class="workout-live-section">
            <div class="workout-live-section-heading">
                <div><h2>Recommended for You</h2><p>Based on your current plan preferences.</p></div>
                <button type="button" data-workout-live-see-all>See All</button>
            </div>
            <div class="workout-live-recommended" aria-label="Recommended workout plans">
                ${recommended.map((plan, index) => renderRecommendedCard(plan, index)).join("") || renderNoMatches()}
            </div>
        </section>

        <section class="workout-live-section" data-workout-live-all-plans>
            <div class="workout-live-section-heading">
                <div>
                    <h2>${state.showAllPlans ? "All Workout Plans" : "Workout Plans"}</h2>
                    <p>${state.showAllPlans
                        ? `${allCataloguePlans.length} Level Up routines${saved.length ? ` · ${saved.length} saved plan${saved.length === 1 ? "" : "s"} shown first` : ""}`
                        : `${saved.length ? `${saved.length} saved plan${saved.length === 1 ? "" : "s"} shown first · ` : ""}${matches.length} matching programs`
                    }</p>
                </div>
                ${state.showAllPlans
                    ? '<button type="button" data-workout-live-show-matches>Show Matches</button>'
                    : '<button type="button" data-workout-live-filter="goal">Filter</button>'
                }
            </div>
            <div class="workout-live-plan-list">
                ${rows.map((plan, index) => renderPlanRow(plan, index)).join("") || renderNoMatches()}
            </div>
        </section>
    `;

    bindLandingActions({ content, page, sourceHome, landing, state, render: () => renderLanding({ content, page, sourceHome, landing, state }) });
    mountSchedule({ page, sourceHome, landing });
}

function bindLandingActions({ content, page, sourceHome, landing, state, render }) {
    landing.querySelector("[data-workout-live-new-plan]")?.addEventListener("click", () => openNewPlanSheet({ content, landing }));

    landing.querySelector("[data-workout-live-see-all]")?.addEventListener("click", () => {
        state.showAllPlans = true;
        render();
        requestAnimationFrame(() => landing.querySelector("[data-workout-live-all-plans]")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });

    landing.querySelector("[data-workout-live-show-matches]")?.addEventListener("click", () => {
        state.showAllPlans = false;
        render();
        requestAnimationFrame(() => landing.querySelector("[data-workout-live-all-plans]")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });

    landing.querySelector("[data-workout-live-all-control]")?.addEventListener("click", () => {
        state.showAllPlans = true;
        render();
        requestAnimationFrame(() => landing.querySelector("[data-workout-live-all-plans]")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });

    landing.querySelectorAll("[data-workout-live-filter]").forEach(button => {
        button.addEventListener("click", () => openFilterSheet({ key: button.dataset.workoutLiveFilter, state, render }));
    });

    landing.querySelectorAll("[data-workout-live-plan-card]").forEach(card => {
        const open = () => openCataloguePlan({ content, landing, planId: card.dataset.workoutLivePlanCard });
        card.addEventListener("click", open);
        card.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            open();
        });
    });

    landing.querySelectorAll("[data-workout-live-catalogue-plan]").forEach(button => {
        button.addEventListener("click", () => openCataloguePlan({ content, landing, planId: button.dataset.workoutLiveCataloguePlan }));
    });

    landing.querySelectorAll("[data-workout-live-saved-plan]").forEach(button => {
        button.addEventListener("click", () => openSavedPlan({ content, landing, planId: button.dataset.workoutLiveSavedPlan }));
    });
}

function renderRecommendedCard(plan, index) {
    const stats = planStats(plan);
    const artwork = getPlanArtwork(plan, index);
    const badge = index === 0 ? "BEST MATCH" : index === 1 ? "POPULAR" : index === 2 ? "TRENDING" : "FOR YOU";
    return `
        <article class="workout-live-program-card" data-workout-live-plan-card="${escapeHtml(plan.id)}" data-art-family="${escapeHtml(artwork.family)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(plan.name)}">
            <img src="${escapeHtml(artwork.src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1745329532593-53a9ec306787?auto=format&fit=crop&w=1200&q=82'">
            <div class="workout-live-program-shade"></div>
            <span class="workout-live-program-badge">${badge}</span>
            <div class="workout-live-program-copy">
                <h3>${escapeHtml(plan.name)}</h3>
                <p>${escapeHtml(shortDescription(plan.description))}</p>
                <div class="workout-live-program-meta">
                    <span>${calendarIcon()} ${stats.days} days/week</span>
                    <span>${barsIcon()} ${escapeHtml(shortLevel(plan.level))}</span>
                </div>
            </div>
        </article>
    `;
}

function renderPlanRow(plan, index) {
    const stats = planStats(plan);
    const isSaved = Boolean(plan.isSavedPlan);
    const artwork = getPlanArtwork(plan, index + 9);
    const next = plan.days?.[0]?.name?.replace(/^Day\s*\d+\s*[-–:]?\s*/i, "") || "Workout A";
    const attr = isSaved ? "data-workout-live-saved-plan" : "data-workout-live-catalogue-plan";
    return `
        <article class="workout-live-plan-row${isSaved ? " is-saved" : ""}" data-art-family="${escapeHtml(artwork.family)}">
            <button class="workout-live-row-main" type="button" ${attr}="${escapeHtml(plan.id)}">
                <img src="${escapeHtml(artwork.src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1745329532593-53a9ec306787?auto=format&fit=crop&w=1200&q=82'">
                <span class="workout-live-row-copy">
                    <small>${isSaved ? "YOUR PLAN" : escapeHtml(plan.sourceLabel || "LEVEL UP")}</small>
                    <strong>${escapeHtml(plan.name || "Workout Plan")}</strong>
                    <em>${escapeHtml(shortDescription(plan.description || "Your saved workout plan."))}</em>
                    <span class="workout-live-row-meta">
                        <b>${calendarIcon()} ${stats.days}d/wk</b>
                        <b>${dumbbellIcon()} ${stats.exercises} exercises</b>
                        <b>${documentIcon()} Next: ${escapeHtml(next)}</b>
                    </span>
                </span>
            </button>
            <button class="workout-live-row-action" type="button" ${attr}="${escapeHtml(plan.id)}">${isSaved ? "Open" : "View"}</button>
        </article>
    `;
}

function allPlansButton(active) {
    return `
        <button class="workout-live-filter is-all${active ? " active" : ""}" type="button" data-workout-live-all-control>
            <span class="workout-live-filter-icon">${gridIcon()}</span>
            <span><small>Browse</small><strong>All Plans</strong></span>
            <i>›</i>
        </button>
    `;
}

function filterButton(key, label, value, icon) {
    return `
        <button class="workout-live-filter" type="button" data-workout-live-filter="${key}">
            <span class="workout-live-filter-icon">${icon}</span>
            <span><small>${label}</small><strong>${escapeHtml(value)}</strong></span>
            <i>⌄</i>
        </button>
    `;
}

function openFilterSheet({ key, state, render }) {
    const options = {
        goal: ["Hypertrophy", "Hybrid", "Cardio", "Any goal"],
        days: [2, 3, 4, 5, 6],
        level: ["Beginner", "Intermediate", "Advanced", "Any level"],
        equipment: ["Gym", "Dumbbells", "Barbell", "Machines & Cables", "Bodyweight"]
    }[key] || [];
    const current = state.filters[key];

    openSheet({
        eyebrow: "PROGRAM FILTER",
        title: ({ goal: "Training goal", days: "Days per week", level: "Experience level", equipment: "Equipment" })[key] || "Filter",
        body: `<div class="workout-live-sheet-options">${options.map(option => {
            const value = String(option);
            const selected = value === String(current);
            return `<button type="button" data-workout-live-filter-value="${escapeHtml(value)}" class="${selected ? "selected" : ""}"><span>${escapeHtml(value)}</span><b>${selected ? "✓" : ""}</b></button>`;
        }).join("")}</div>`,
        onReady(sheet) {
            sheet.querySelectorAll("[data-workout-live-filter-value]").forEach(button => {
                button.addEventListener("click", () => {
                    state.filters[key] = key === "days" ? Number(button.dataset.workoutLiveFilterValue) : button.dataset.workoutLiveFilterValue;
                    state.showAllPlans = false;
                    closeSheet();
                    render();
                });
            });
        }
    });
}

function openNewPlanSheet({ content, landing }) {
    openSheet({
        eyebrow: "NEW PLAN",
        title: "How do you want to build it?",
        body: `
            <div class="workout-live-action-list">
                ${actionRow("smart", "Smart Build", "Build a personalized program from your goals, schedule, equipment and priorities.", sparkIcon())}
                ${actionRow("manual", "Create Manually", "Choose your own training days, exercises, sets and rep targets.", pencilIcon())}
                ${actionRow("import", "Import Routine", "Paste an existing routine from Notes, Reddit, ChatGPT or anywhere else.", importIcon())}
            </div>
        `,
        onReady(sheet) {
            sheet.querySelectorAll("[data-workout-live-create-action]").forEach(button => {
                button.addEventListener("click", () => {
                    closeSheet();
                    launchExistingFlow({ content, landing, action: button.dataset.workoutLiveCreateAction });
                });
            });
        }
    });
}

function actionRow(action, title, copy, icon) {
    return `
        <button type="button" class="workout-live-action-row" data-workout-live-create-action="${action}">
            <span class="workout-live-action-icon">${icon}</span>
            <span><strong>${title}</strong><small>${copy}</small></span>
            <i>›</i>
        </button>
    `;
}

function launchExistingFlow({ content, landing, action }) {
    const selector = {
        smart: "[data-smart-build]",
        manual: "#new-plan-btn",
        import: "[data-routine-import-open]"
    }[action];

    const button = selector ? content.querySelector(selector) : null;
    if (!button) {
        showToast("That option is still loading. Try again.");
        return;
    }

    landing.hidden = true;
    button.click();

    window.setTimeout(() => {
        const surface = content.querySelector("#plan-builder:not([hidden]), [data-smart-build-wizard]:not([hidden]), [data-routine-import-wizard]:not([hidden])");
        if (surface) surface.scrollIntoView({ behavior: "smooth", block: "start" });
        else if (!content.querySelector("#workout-plan-detail-screen, #workout-session-logger")) {
            landing.hidden = false;
            showToast("That option could not open. Please try again.");
        }
    }, 60);
}

function openCataloguePlan({ content, landing, planId }) {
    const card = content.querySelector(`.catalogue-plan-card[data-plan-id="${cssEscape(planId)}"]`);
    if (!card) {
        showToast("That plan could not be opened.");
        return;
    }
    landing.hidden = true;
    card.click();
    verifyDestination(landing);
}

function openSavedPlan({ content, landing, planId }) {
    const card = content.querySelector(`[data-custom-plan-id="${cssEscape(planId)}"]`);
    if (!card) {
        showToast("That saved plan could not be opened.");
        return;
    }
    landing.hidden = true;
    card.click();
    verifyDestination(landing);
}

function verifyDestination(landing) {
    window.setTimeout(() => {
        const page = landing.closest(".workout-page");
        const hasDestination = page?.querySelector("#workout-plan-detail-screen, #plan-builder:not([hidden]), #workout-session-logger");
        if (!hasDestination) {
            landing.hidden = false;
            showToast("That plan could not be opened. Please try again.");
        }
    }, 80);
}

function mountSchedule({ page, sourceHome, landing }) {
    const slot = landing.querySelector("[data-workout-live-schedule-slot]");
    if (!slot) return;

    const shell = page.querySelector(".workout-schedule-shell");
    if (!shell) return;

    slot.querySelector(".workout-live-schedule-loading")?.remove();
    if (shell.parentElement !== slot) slot.appendChild(shell);
    shapeSchedule(shell);
}

function shapeSchedule(shell) {
    if (!shell.classList.contains("schedule-banner")) return;

    const top = shell.querySelector(".schedule-banner-top");
    const actions = shell.querySelector(".schedule-banner-actions");
    if (top && actions && !shell.querySelector(".workout-live-today-card")) {
        const todayCard = document.createElement("div");
        todayCard.className = "workout-live-today-card";
        const editor = shell.querySelector(".schedule-editor");
        shell.insertBefore(todayCard, editor || null);
        todayCard.append(top, actions);
    }

    const eyebrow = shell.querySelector(".workout-live-today-card .eyebrow");
    if (eyebrow && eyebrow.textContent.trim() !== "TODAY") eyebrow.textContent = "TODAY";
}

function maybeRestoreLanding({ page, landing, render }) {
    if (!landing.hidden) return;
    if (page.classList.contains("showing-plan-details")) return;
    if (page.querySelector("#workout-session-logger")) return;

    const activeSurface = [
        page.querySelector("#plan-builder"),
        page.querySelector("[data-smart-build-wizard]"),
        page.querySelector("[data-routine-import-wizard]")
    ].some(element => element && !element.hidden);

    if (!activeSurface) showLanding({ landing, render });
}

function showLanding({ landing, render }) {
    render?.();
    landing.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function filteredPlans(filters) {
    return allCataloguePlans.filter(plan => {
        const type = String(plan.trainingType || "Hypertrophy").toLowerCase();
        const goalMatch = filters.goal === "Any goal"
            || (filters.goal === "Hypertrophy" && type.includes("hypertrophy"))
            || (filters.goal === "Hybrid" && type.includes("hybrid"))
            || (filters.goal === "Cardio" && type.includes("cardio"));
        const daysMatch = !filters.days || Number(plan.daysPerWeek || plan.days?.length) === Number(filters.days);
        const levelText = String(plan.level || "").toLowerCase();
        const levelMatch = filters.level === "Any level" || levelText.includes(String(filters.level).toLowerCase());
        return goalMatch && daysMatch && levelMatch && matchesEquipment(plan, filters.equipment);
    });
}

function matchesEquipment(plan, equipment) {
    if (!equipment || equipment === "Gym") return true;
    const values = new Set((plan.days || []).flatMap(day => (day.exercises || []).map(item => String(exerciseMap.get(item.id)?.equipment || ""))));
    if (equipment === "Dumbbells") return [...values].every(value => !value || /dumbbell|bodyweight/i.test(value));
    if (equipment === "Barbell") return [...values].some(value => /barbell/i.test(value));
    if (equipment === "Machines & Cables") return [...values].some(value => /machine|cable/i.test(value));
    if (equipment === "Bodyweight") return [...values].every(value => !value || /bodyweight/i.test(value));
    return true;
}

function selectRecommended(plans, filters, count) {
    const preferred = [...plans].sort((a, b) => recommendationScore(b, filters) - recommendationScore(a, filters));
    if (preferred.length >= count) return preferred.slice(0, count);
    const fallback = allCataloguePlans.filter(plan => !preferred.some(item => item.id === plan.id)).slice(0, count - preferred.length);
    return [...preferred, ...fallback];
}

function recommendationScore(plan, filters) {
    let score = 0;
    if (Number(plan.daysPerWeek) === Number(filters.days)) score += 4;
    if (String(plan.level || "").toLowerCase().includes(String(filters.level).toLowerCase())) score += 3;
    if (filters.goal === "Any goal" || String(plan.trainingType || "").toLowerCase().includes(filters.goal.toLowerCase())) score += 3;
    if (matchesEquipment(plan, filters.equipment)) score += 2;
    if (plan.sourceLabel) score += .25;
    return score;
}

function planStats(plan) {
    const days = Array.isArray(plan.days) ? plan.days : [];
    return {
        days: Number(plan.daysPerWeek) || days.length || 1,
        exercises: days.reduce((sum, day) => sum + (day.exercises?.length || 0), 0)
    };
}

function readSavedPlans() {
    try {
        const value = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
        return Array.isArray(value) ? value.filter(plan => plan?.id && Array.isArray(plan.days)) : [];
    }
    catch {
        return [];
    }
}

function safePreferences() {
    try { return getTrainingPreferences() || {}; }
    catch { return {}; }
}

function normalizeGoal(value) {
    return value === "track_training" ? "Any goal" : value === "build_strength" ? "Hybrid" : "Hypertrophy";
}

function normalizeLevel(value) {
    return ({ new: "Beginner", intermediate: "Intermediate", experienced: "Intermediate", advanced: "Advanced" })[value] || "Intermediate";
}

function shortLevel(value) {
    const text = String(value || "All levels");
    return text.includes("/") ? text.split("/")[0].trim() : text;
}

function shortDescription(value) {
    const text = String(value || "A structured Level Up training plan.").replace(/\s+/g, " ").trim();
    return text.length > 78 ? `${text.slice(0, 75).trim()}…` : text;
}

function renderNoMatches() {
    return `<div class="workout-live-empty"><strong>No exact matches</strong><span>Change a filter above or tap All Plans.</span></div>`;
}

function openSheet({ eyebrow, title, body, onReady }) {
    closeSheet();
    const overlay = document.createElement("div");
    overlay.className = "workout-live-sheet-overlay";
    overlay.dataset.workoutLiveSheet = "";
    overlay.innerHTML = `
        <button class="workout-live-sheet-scrim" type="button" aria-label="Close"></button>
        <section class="workout-live-sheet" role="dialog" aria-modal="true">
            <div class="workout-live-sheet-grabber"></div>
            <div class="workout-live-sheet-head">
                <div><span>${escapeHtml(eyebrow)}</span><h2>${escapeHtml(title)}</h2></div>
                <button type="button" data-workout-live-sheet-close>Done</button>
            </div>
            ${body}
        </section>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector(".workout-live-sheet-scrim")?.addEventListener("click", closeSheet);
    overlay.querySelector("[data-workout-live-sheet-close]")?.addEventListener("click", closeSheet);
    onReady?.(overlay.querySelector(".workout-live-sheet"));
}

function closeSheet() {
    document.querySelector("[data-workout-live-sheet]")?.remove();
}

function showToast(message) {
    let toast = document.querySelector(".workout-live-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "workout-live-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast?.classList.remove("show"), 2600);
}

function ensureStylesheet() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.appendChild(link);
}

function cssEscape(value) {
    return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function svg(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}
function targetIcon() { return svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M20 12h-3"/>'); }
function calendarIcon() { return svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/>'); }
function barsIcon() { return svg('<path d="M5 19v-5M12 19V9M19 19V4"/>'); }
function dumbbellIcon() { return svg('<path d="M3 9v6M6 7v10M6 12h12M18 7v10M21 9v6"/>'); }
function documentIcon() { return svg('<path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v5h5M10 12h5M10 16h5"/>'); }
function gridIcon() { return svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'); }
function sparkIcon() { return svg('<path d="m12 3 1.4 4.5L18 9l-4.6 1.5L12 15l-1.4-4.5L6 9l4.6-1.5L12 3Z"/><path d="m19 15 .6 1.8 1.8.6-1.8.6L19 20l-.6-2-1.8-.6 1.8-.6L19 15Z"/>'); }
function pencilIcon() { return svg('<path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"/><path d="m14.5 6.5 3 3"/>'); }
function importIcon() { return svg('<path d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6"/>'); }
