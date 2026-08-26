import { getExerciseById } from "./exercise-library.js";
import {
    endDeloadWorkoutPreview,
    getAdaptiveGuidanceSettings,
    getDeloadPreviewRequest
} from "../more/adaptive-guidance-settings.js?v=deload-workout-preview-1";
import {
    buildAdaptiveRecommendations,
    calculateDeloadTarget,
    completedSets,
    countAccumulationWeeks,
    getTrainedMuscles
} from "./adaptive-guidance-engine.js?v=discomfort-caution-1";

const ACTIVE_WORKOUT_KEY = "level_up_active_workout";
const SESSION_KEY = "forge_workout_sessions";
const PLAN_KEY = "forge_workout_plans";
const STATE_KEY = "level_up_adaptive_guidance_state";

function readJson(key, fallback) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed ?? fallback;
    }
    catch {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function readActive() {
    const active = readJson(ACTIVE_WORKOUT_KEY, null);
    return active?.status === "in_progress" ? active : null;
}

function readSessions() {
    const sessions = readJson(SESSION_KEY, []);
    return Array.isArray(sessions) ? sessions : [];
}

function readPlans() {
    const plans = readJson(PLAN_KEY, []);
    return Array.isArray(plans) ? plans : [];
}

function readState() {
    const state = readJson(STATE_KEY, {});
    return {
        cycleStarts: state?.cycleStarts && typeof state.cycleStarts === "object" ? state.cycleStarts : {},
        pendingDeload: state?.pendingDeload || null
    };
}

function saveState(state) {
    writeJson(STATE_KEY, state);
}

function guidanceEnabled() {
    return getAdaptiveGuidanceSettings().enabled;
}

function dispatchSessionGuidance(logger, value) {
    logger.dispatchEvent(new CustomEvent("levelup:adaptive-guidance-changed", {
        bubbles: false,
        detail: { kind: "session-guidance", value }
    }));
}

function dispatchRir(logger, exerciseIndex, setIndex, value) {
    logger.dispatchEvent(new CustomEvent("levelup:adaptive-guidance-changed", {
        bubbles: false,
        detail: { kind: "set-rir", exerciseIndex, setIndex, value }
    }));
}

function ensureCycle(active) {
    if (!active?.planId) return;
    const state = readState();
    if (state.cycleStarts[active.planId]) return;
    state.cycleStarts[active.planId] = active.startedAt || new Date().toISOString();
    saveState(state);
}

function findPreviousMuscleSession(active, muscle) {
    return [...readSessions()]
        .filter(session => session?.planId === active?.planId && !session?.adaptiveGuidance?.isDeload)
        .sort((a, b) => String(b?.completedAt || b?.date || "").localeCompare(String(a?.completedAt || a?.date || "")))
        .find(session => getTrainedMuscles(session, getExerciseById).includes(muscle)) || null;
}

function getTodayMuscles(active) {
    const day = active?.planSnapshot?.days?.[active?.trainingDayIndex];
    return [...new Set((day?.exercises || [])
        .map(item => getExerciseById(item.id))
        .filter(exercise => exercise && exercise.trackingType !== "notes" && exercise.muscleGroup !== "Cardio")
        .map(exercise => exercise.muscleGroup)
        .filter(Boolean))];
}

function renderRecoveryCheck(logger, active) {
    if (active?.adaptiveGuidance?.recoveryCompleted || active?.adaptiveGuidance?.isDeload) return;
    if (document.querySelector(".adaptive-recovery-flow")) return;
    const muscles = getTodayMuscles(active);
    if (!muscles.length) return;
    const recorded = active?.adaptiveGuidance?.recovery || {};
    const overlay = document.createElement("div");
    overlay.className = "adaptive-flow-overlay adaptive-recovery-flow";
    overlay.innerHTML = `
        <section class="adaptive-flow-screen" role="dialog" aria-modal="true" aria-labelledby="adaptive-recovery-title">
            <div class="adaptive-flow-kicker">BEFORE YOUR WORKOUT</div>
            <h2 id="adaptive-recovery-title">Recovery Check</h2>
            <p class="adaptive-flow-intro">Think about how each muscle feels now compared with the last time you trained it. Answer any or all, or skip. This helps guide future volume—it will not change today's workout.</p>
            <div class="adaptive-recovery-legend" aria-label="Recovery rating guide">
                <div><strong>Fatigued</strong><span>Still sore, weak or heavy from your last workout.</span></div>
                <div><strong>Ready</strong><span>Recovered enough to repeat your normal workout.</span></div>
                <div><strong>Fresh</strong><span>Completely recovered with no lingering soreness or heaviness.</span></div>
            </div>
            <div class="adaptive-muscle-questions">
                <p class="adaptive-question-label">How does each muscle feel?</p>
                <div class="adaptive-muscle-rows">
                    ${muscles.map(muscle => `
                        <div class="adaptive-muscle-row" data-adaptive-muscle="${escapeHtml(muscle)}">
                            <strong>${escapeHtml(muscle)}</strong>
                            ${["fatigued", "ready", "fresh"].map(status => `
                                <button class="adaptive-choice ${recorded?.[muscle]?.status === status ? "selected" : ""}" type="button" data-recovery-status="${status}">${capitalize(status)}</button>
                            `).join("")}
                        </div>
                    `).join("")}
                </div>
            </div>
            <div class="adaptive-flow-actions">
                <button class="primary-btn" type="button" data-adaptive-start-workout>Start workout</button>
                <button class="adaptive-text-button" type="button" data-adaptive-skip="recovery">Skip for now</button>
            </div>
        </section>
    `;
    document.body.appendChild(overlay);
}

function renderRirTracker(card, active) {
    if (card.dataset.trackingType !== "reps") return;
    const exerciseIndex = Number(card.dataset.exerciseIndex);
    const sets = active?.exercises?.[exerciseIndex]?.sets || [];
    if (!sets.length) return;
    const existing = card.querySelector(".adaptive-rir-control");
    if (existing && existing.querySelectorAll("[data-rir-set-index]").length === sets.length) {
        existing.querySelectorAll("[data-rir-set-index]").forEach((row, setIndex) => {
            row.querySelectorAll("[data-rir-value]").forEach(button => {
                const rir = sets[setIndex]?.rir;
                button.classList.toggle("selected", rir !== null && rir !== "" && rir !== undefined && Number(rir) === Number(button.dataset.rirValue));
            });
        });
        updateRirToggle(existing, sets);
        return;
    }
    const wasOpen = existing?.querySelector(".adaptive-rir-panel")?.hidden === false;
    existing?.remove();
    const control = document.createElement("div");
    control.className = "adaptive-rir-control";
    control.innerHTML = `
        <button class="adaptive-rir-toggle" type="button" aria-expanded="false">RIR <span>Optional</span></button>
        <button class="adaptive-info-button" type="button" data-adaptive-rir-info aria-label="What is RIR?">i</button>
        <div class="adaptive-rir-panel" hidden>
            ${sets.map((set, setIndex) => `
                <div class="adaptive-rir-row" data-rir-set-index="${setIndex}">
                    <strong>Set ${setIndex + 1}</strong>
                    ${[0,1,2,3,4].map(value => `
                        <button class="adaptive-rir-choice ${set.rir !== null && set.rir !== "" && set.rir !== undefined && Number(set.rir) === value ? "selected" : ""}" type="button" data-rir-value="${value}">${value === 4 ? "4+" : value}</button>
                    `).join("")}
                </div>
            `).join("")}
        </div>
    `;
    const anchor = card.querySelector(".compact-add-set-btn") || card.querySelector(".edit-session-exercise-actions");
    if (anchor) anchor.insertAdjacentElement("beforebegin", control);
    else card.appendChild(control);
    if (wasOpen) {
        const panel = control.querySelector(".adaptive-rir-panel");
        if (panel) panel.hidden = false;
        control.querySelector(".adaptive-rir-toggle")?.setAttribute("aria-expanded", "true");
    }
    updateRirToggle(control, sets);
}

function updateRirToggle(control, sets) {
    const count = (sets || []).filter(set => set.rir !== null && set.rir !== "" && set.rir !== undefined).length;
    const toggle = control.querySelector(".adaptive-rir-toggle");
    if (!toggle) return;
    const detail = toggle.querySelector("span");
    const label = count ? `${count} ${count === 1 ? "set" : "sets"} logged` : "Optional";
    if (detail?.firstChild) detail.firstChild.nodeValue = label;
}

function renderPostCheck(logger, active) {
    if (document.querySelector(".adaptive-post-flow")) return;
    const guidance = active?.adaptiveGuidance || {};
    const exerciseOptions = (active?.exercises || []).map((item, index) => {
        const exercise = getExerciseById(item.exerciseId);
        return exercise ? `<option value="${escapeHtml(item.exerciseId)}" ${guidance.discomfortExerciseId === item.exerciseId ? "selected" : ""}>${escapeHtml(exercise.name)}</option>` : "";
    }).join("");
    const overlay = document.createElement("div");
    overlay.className = "adaptive-flow-overlay adaptive-post-flow";
    overlay.innerHTML = `
        <section class="adaptive-flow-screen" role="dialog" aria-modal="true" aria-labelledby="adaptive-post-title">
            <div class="adaptive-flow-kicker">WORKOUT COMPLETE</div>
            <h2 id="adaptive-post-title">How did it feel?</h2>
            <p class="adaptive-flow-intro">Optional. Your answers add context to your performance and help make future suggestions more useful.</p>
            <div class="adaptive-post-options">
            <div class="adaptive-post-question">
                <strong>Workout difficulty</strong>
                <div class="adaptive-option-row">
                    ${[["easy","Easy"],["right","Right"],["too-hard","Too hard"]].map(([value,label]) => `<button class="adaptive-choice ${guidance.difficulty === value ? "selected" : ""}" type="button" data-adaptive-difficulty="${value}">${label}</button>`).join("")}
                </div>
            </div>
            <div class="adaptive-post-question">
                <strong>Any discomfort?</strong>
                <div class="adaptive-option-row">
                    ${[["none","None"],["minor","Minor"],["significant","Significant"]].map(([value,label]) => `<button class="adaptive-choice ${guidance.discomfort === value ? "selected" : ""}" type="button" data-adaptive-discomfort="${value}">${label}</button>`).join("")}
                </div>
                <label class="adaptive-discomfort-exercise" ${guidance.discomfort && guidance.discomfort !== "none" ? "" : "hidden"}>
                    <select data-adaptive-discomfort-exercise>
                        <option value="">Choose exercise (optional)</option>
                        ${exerciseOptions}
                    </select>
                </label>
            </div>
            </div>
            <div class="adaptive-flow-actions">
                <button class="primary-btn" type="button" data-adaptive-finish-workout>Finish workout</button>
                <button class="adaptive-text-button" type="button" data-adaptive-skip="post">Skip and finish</button>
                <button class="adaptive-text-button adaptive-return-button" type="button" data-adaptive-return-workout>Return to workout</button>
            </div>
        </section>
    `;
    document.body.appendChild(overlay);
}

function enhanceLogger(logger) {
    if (!logger || logger.dataset.editingSessionId) return;
    const preview = getDeloadPreviewRequest();
    renderPreviewNavigationNotice();
    if (!guidanceEnabled() && !preview) {
        logger.classList.remove("adaptive-guidance-on", "adaptive-deload-active");
        logger.querySelectorAll(".adaptive-rir-control,.adaptive-deload-banner").forEach(node => node.remove());
        document.querySelectorAll(".adaptive-recovery-flow,.adaptive-post-flow").forEach(node => node.remove());
        return;
    }
    const active = readActive();
    if (!active) {
        if (preview) renderPreviewWaitingBanner(logger);
        return;
    }
    if (!preview) ensureCycle(active);
    logger.classList.add("adaptive-guidance-on");
    applyDeloadMode(logger, active, preview);
    if (!preview) renderRecoveryCheck(logger, readActive() || active);
    else document.querySelector(".adaptive-recovery-flow")?.remove();
    logger.querySelectorAll(".session-exercise-card").forEach(card => renderRirTracker(card, readActive() || active));
}

function applyDeloadMode(logger, active, preview = getDeloadPreviewRequest()) {
    const state = readState();
    const pending = preview
        ? { planId: active.planId, startedAt: preview.requestedAt, dayCount: active?.planSnapshot?.days?.length || 1 }
        : state.pendingDeload;
    if (!pending || pending.planId !== active.planId) return;
    logger.classList.add("adaptive-deload-active");
    logger.classList.toggle("adaptive-deload-preview-active", Boolean(preview));
    logger.dataset.adaptiveDeloadPreview = preview ? "true" : "";
    const dayCount = Math.max(1, active?.planSnapshot?.days?.length || pending.dayCount || 1);
    const earlyWeek = Number(active.trainingDayIndex) < Math.ceil(dayCount / 2);
    const weightRatio = earlyWeek ? 0.85 : 0.67;
    const setRatio = 0.67;
    const repRatio = 0.67;
    if (!preview) {
        dispatchSessionGuidance(logger, {
            isDeload: true,
            deload: { weightRatio, setRatio, repRatio, startedAt: pending.startedAt }
        });
    }

    let banner = logger.querySelector(".adaptive-deload-banner");
    if (!banner) {
        banner = document.createElement("section");
        banner.className = "adaptive-deload-banner";
        banner.innerHTML = `
            ${preview ? '<span class="adaptive-preview-label">PREVIEW · NOT SAVED</span>' : ""}
            <strong>${preview ? "Recovery week preview" : "Recovery week"}</strong>
            <p>Reduced sets, reps and load · keep at least 5 RIR. Normal progression prompts are paused.</p>
            <button class="secondary-btn" type="button" ${preview ? "data-adaptive-exit-deload-preview" : "data-adaptive-end-deload"}>${preview ? "Exit preview" : "End recovery week"}</button>
        `;
        logger.querySelector("#session-exercises")?.prepend(banner);
    }

    logger.querySelectorAll(".session-exercise-card[data-tracking-type='reps']").forEach(card => {
        const exerciseIndex = Number(card.dataset.exerciseIndex);
        const exerciseId = card.dataset.exerciseId;
        const rows = [...card.querySelectorAll(".session-set-row")];
        const keepCount = Math.max(1, Math.floor(rows.length * setRatio));
        const previous = findPreviousExercisePerformance(active.planId, exerciseId);
        const priorSets = completedSets(previous);
        const increment = getPracticalIncrement(exerciseId);
        rows.forEach((row, index) => {
            const hidden = index >= keepCount;
            row.classList.toggle("adaptive-deload-hidden", hidden);
            if (hidden) return;
            const sourceSet = priorSets[index] || priorSets[priorSets.length - 1];
            const target = calculateDeloadTarget(sourceSet, weightRatio, repRatio, increment);
            const weight = row.querySelector(".session-weight");
            const reps = row.querySelector(".session-reps");
            if (weight && !weight.value && Number.isFinite(target.weight)) weight.placeholder = formatNumber(target.weight);
            if (reps && !reps.value && Number.isFinite(target.reps)) reps.placeholder = String(target.reps);
        });
        const target = card.querySelector(".session-target,.compact-target");
        if (target) target.textContent = `Recovery target: ${keepCount} ${keepCount === 1 ? "set" : "sets"} · ~${Math.round(weightRatio * 100)}% load · ~⅔ reps · 5+ RIR`;
    });

    if (preview) {
        const complete = logger.querySelector("#save-session-btn");
        if (complete) {
            complete.textContent = "Exit Preview";
            complete.dataset.adaptiveExitDeloadPreview = "";
        }
    }
}

function renderPreviewWaitingBanner(logger) {
    if (logger.querySelector(".adaptive-deload-preview-waiting")) return;
    const banner = document.createElement("section");
    banner.className = "adaptive-deload-banner adaptive-deload-preview-waiting";
    banner.innerHTML = `
        <span class="adaptive-preview-label">PREVIEW · NOT SAVED</span>
        <strong>Recovery-week preview ready</strong>
        <p>Choose a training day and begin. The adjustments will appear in their real workout positions.</p>
        <button class="secondary-btn" type="button" data-adaptive-exit-deload-preview>Exit preview</button>`;
    logger.querySelector("#session-exercises")?.prepend(banner);
}

function renderPreviewNavigationNotice() {
    const page = document.querySelector(".workout-page");
    if (!page || !getDeloadPreviewRequest() || page.querySelector(".adaptive-deload-preview-navigation")) return;
    const notice = document.createElement("section");
    notice.className = "adaptive-deload-banner adaptive-deload-preview-navigation";
    notice.innerHTML = `
        <span class="adaptive-preview-label">PREVIEW · NOT SAVED</span>
        <strong>Recovery-week preview ready</strong>
        <p>Open any weightlifting plan and start a workout to see the reduced targets in place.</p>
        <button class="secondary-btn" type="button" data-adaptive-exit-deload-preview>Exit preview</button>`;
    page.querySelector(".workout-page-title")?.insertAdjacentElement("afterend", notice);
}

function exitDeloadPreview() {
    endDeloadWorkoutPreview({ restoreWorkout: true });
    document.querySelectorAll(".adaptive-deload-preview-navigation,.adaptive-recovery-flow,.adaptive-post-flow").forEach(node => node.remove());
    document.querySelector('.nav-btn[data-page="workout"]')?.click();
}

function findPreviousExercisePerformance(planId, exerciseId) {
    for (const session of [...readSessions()].sort((a,b) => String(b?.completedAt || b?.date || "").localeCompare(String(a?.completedAt || a?.date || "")))) {
        if (session?.planId !== planId || session?.adaptiveGuidance?.isDeload) continue;
        const performance = (session.exercises || []).find(item => item.exerciseId === exerciseId);
        if (completedSets(performance).length) return performance;
    }
    return null;
}

function getPracticalIncrement(exerciseId) {
    const equipment = String(getExerciseById(exerciseId)?.equipment || "").toLowerCase();
    return equipment.includes("cable") ? 2.5 : 5;
}

function setRecoveryChoice(button) {
    const logger = button.closest("#workout-session-logger") || document.getElementById("workout-session-logger");
    const row = button.closest("[data-adaptive-muscle]");
    const active = readActive();
    if (!logger || !row || !active) return;
    const muscle = row.dataset.adaptiveMuscle;
    const status = button.dataset.recoveryStatus;
    const previous = findPreviousMuscleSession(active, muscle);
    const recovery = { ...(active.adaptiveGuidance?.recovery || {}) };
    recovery[muscle] = { status, previousSessionId: previous?.id || null, recordedAt: new Date().toISOString() };
    dispatchSessionGuidance(logger, { recovery, recoverySkipped: false });
    row.querySelectorAll("[data-recovery-status]").forEach(option => option.classList.toggle("selected", option === button));
}

function setPostChoice(button, key, value) {
    const logger = button.closest("#workout-session-logger") || document.getElementById("workout-session-logger");
    if (!logger) return;
    dispatchSessionGuidance(logger, { [key]: value, postSkipped: false });
    button.parentElement?.querySelectorAll(".adaptive-choice").forEach(option => option.classList.toggle("selected", option === button));
    if (key === "discomfort") {
        const select = document.querySelector(".adaptive-post-flow .adaptive-discomfort-exercise");
        if (select) select.hidden = value === "none";
        if (value === "none") dispatchSessionGuidance(logger, { discomfortExerciseId: null });
    }
}

function startWorkoutFromRecovery({ skipped = false } = {}) {
    const logger = document.getElementById("workout-session-logger");
    if (logger) dispatchSessionGuidance(logger, { recoveryCompleted: true, recoverySkipped: skipped });
    document.querySelector(".adaptive-recovery-flow")?.remove();
}

function finishWorkoutFromCheckIn({ skipped = false } = {}) {
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return;
    dispatchSessionGuidance(logger, { postCompleted: true, postSkipped: skipped });
    document.querySelector(".adaptive-post-flow")?.remove();
    logger.dispatchEvent(new CustomEvent("levelup:complete-workout-requested"));
}

function handleRirChoice(button) {
    const logger = button.closest("#workout-session-logger");
    const card = button.closest(".session-exercise-card");
    const row = button.closest("[data-rir-set-index]");
    if (!logger || !card || !row) return;
    const exerciseIndex = Number(card.dataset.exerciseIndex);
    const setIndex = Number(row.dataset.rirSetIndex);
    const selectedValue = Number(button.dataset.rirValue);
    const currentValue = readActive()?.exercises?.[exerciseIndex]?.sets?.[setIndex]?.rir;
    const value = currentValue !== null && currentValue !== "" && currentValue !== undefined && Number(currentValue) === selectedValue
        ? null
        : selectedValue;
    dispatchRir(logger, exerciseIndex, setIndex, value);
    row.querySelectorAll(".adaptive-rir-choice").forEach(option => option.classList.toggle("selected", value !== null && option === button));
    updateRirToggle(card.querySelector(".adaptive-rir-control"), readActive()?.exercises?.[exerciseIndex]?.sets || []);
}

function showRirInfo() {
    document.querySelector(".adaptive-info-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "adaptive-info-overlay";
    overlay.innerHTML = `
        <section class="adaptive-info-sheet" role="dialog" aria-modal="true" aria-label="Reps in Reserve information">
            <h3>Reps in Reserve</h3>
            <p>How many more good-form reps you could have completed.</p>
            <div class="adaptive-info-scale">
                <div><strong>0</strong><span>No reps left</span></div>
                <div><strong>1</strong><span>One rep left</span></div>
                <div><strong>2</strong><span>Two reps left</span></div>
                <div><strong>3</strong><span>Three reps left</span></div>
                <div><strong>4+</strong><span>Four or more</span></div>
            </div>
            <p><b>Tracking RIR is optional.</b> It improves guidance, but you can leave it blank.</p>
            <button class="primary-btn" type="button" data-adaptive-close-info>Done</button>
        </section>
    `;
    document.body.appendChild(overlay);
}

function handleWorkoutCompleted(event) {
    if (!guidanceEnabled()) return;
    const sessions = readSessions();
    const index = sessions.findIndex(item => item.id === event.detail?.sessionId);
    if (index < 0) return;
    const session = sessions[index];
    const state = readState();

    if (session?.adaptiveGuidance?.isDeload) {
        const pending = state.pendingDeload;
        if (pending?.planId === session.planId) {
            pending.completedDays = [...new Set([...(pending.completedDays || []), Number(session.trainingDayIndex)])];
            if (pending.completedDays.length >= Math.max(1, Number(pending.dayCount) || session.planSnapshot?.days?.length || 1)) {
                state.pendingDeload = null;
                state.cycleStarts[session.planId] = session.completedAt || new Date().toISOString();
            }
            saveState(state);
        }
        else {
            state.cycleStarts[session.planId] = session.completedAt || new Date().toISOString();
            saveState(state);
        }
        sessions[index].adaptiveGuidance = {
            ...(sessions[index].adaptiveGuidance || {}),
            recommendations: [{ id: `${session.id}:deload-complete`, type: "status", title: "Recovery workout complete", reason: "Progression was paused for this workout." }],
            analyzedAt: new Date().toISOString()
        };
        writeJson(SESSION_KEY, sessions);
        showCoachSummaryForSession(session.id);
        return;
    }

    const plan = readPlans().find(item => item.id === session.planId) || session.planSnapshot;
    const weeks = countAccumulationWeeks(sessions, session.planId, state.cycleStarts[session.planId]);
    const recommendations = buildAdaptiveRecommendations({
        session,
        sessions,
        plan,
        getExercise: getExerciseById,
        accumulationWeeks: weeks
    });
    sessions[index].adaptiveGuidance = {
        ...(sessions[index].adaptiveGuidance || {}),
        recommendations,
        accumulationWeeks: weeks,
        analyzedAt: new Date().toISOString()
    };
    writeJson(SESSION_KEY, sessions);
    showCoachSummaryForSession(session.id);
}

function showCoachSummaryForSession(sessionId) {
    window.setTimeout(() => {
        const recap = [...document.querySelectorAll(".workout-complete-recap")]
            .find(item => item.dataset.recapSessionId === sessionId);
        if (recap) renderCoachSummary(recap, sessionId);
    }, 0);
}

function renderCoachSummary(recap, sessionId = recap?.dataset.recapSessionId) {
    if (!recap || !guidanceEnabled() || recap.querySelector(".adaptive-coach-summary")) return;
    const completed = readSessions().find(item => item.id === sessionId);
    const recommendations = completed?.adaptiveGuidance?.recommendations || [];
    if (!recommendations.length) return;
    const hasPlanChange = recommendations.some(item => item.type === "volume" || item.type === "deload");
    const section = document.createElement("section");
    section.className = "adaptive-coach-summary";
    section.dataset.adaptiveSessionId = latest.id;
    section.innerHTML = `
        <h3>Coach Summary</h3>
        <p>${hasPlanChange ? "Suggestions only—nothing changes unless you apply it." : "Based on this workout and your feedback."}</p>
        <div class="adaptive-recommendation-list">
            ${recommendations.map(recommendation => renderRecommendation(recommendation)).join("")}
        </div>
    `;
    const header = recap.querySelector(".workout-complete-recap__header");
    const insight = recap.querySelector(".workout-complete-recap__insight");
    if (header) header.insertAdjacentElement("afterend", section);
    else if (insight) insight.insertAdjacentElement("beforebegin", section);
}

function renderRecommendation(recommendation) {
    if (recommendation.status) {
        const status = recommendation.status === "applied" ? "Applied" : recommendation.type === "hold" ? "Acknowledged" : "Kept current";
        return `<article class="adaptive-recommendation"><strong>${escapeHtml(recommendation.title)}</strong><p class="adaptive-recommendation-status">${escapeHtml(status)}</p></article>`;
    }
    const primaryAction = recommendation.type === "volume"
        ? `<button class="primary-btn" type="button" data-adaptive-action="apply-volume" data-recommendation-id="${escapeHtml(recommendation.id)}">Apply</button>`
        : recommendation.type === "deload"
            ? `<button class="primary-btn" type="button" data-adaptive-action="start-deload" data-recommendation-id="${escapeHtml(recommendation.id)}">Start deload</button>`
            : "";
    if (recommendation.type === "status") {
        return `<article class="adaptive-recommendation"><strong>${escapeHtml(recommendation.title)}</strong><p>${escapeHtml(recommendation.reason)}</p></article>`;
    }
    return `
        <article class="adaptive-recommendation">
            <strong>${escapeHtml(recommendation.title)}</strong>
            <p>${escapeHtml(recommendation.reason)}</p>
            <div class="adaptive-recommendation-actions">
                ${primaryAction}
                <button class="secondary-btn" type="button" data-adaptive-action="dismiss" data-recommendation-id="${escapeHtml(recommendation.id)}">${recommendation.type === "hold" ? "Got it" : "Keep current"}</button>
            </div>
        </article>
    `;
}

function findRecommendation(sessionId, recommendationId) {
    const sessions = readSessions();
    const sessionIndex = sessions.findIndex(item => item.id === sessionId);
    const recommendation = sessions[sessionIndex]?.adaptiveGuidance?.recommendations?.find(item => item.id === recommendationId);
    return { sessions, sessionIndex, recommendation };
}

function markRecommendation(sessionId, recommendationId, status) {
    const result = findRecommendation(sessionId, recommendationId);
    if (result.sessionIndex < 0 || !result.recommendation) return false;
    result.recommendation.status = status;
    result.recommendation.decidedAt = new Date().toISOString();
    writeJson(SESSION_KEY, result.sessions);
    return true;
}

function applyVolumeRecommendation(sessionId, recommendationId) {
    const result = findRecommendation(sessionId, recommendationId);
    const recommendation = result.recommendation;
    if (!recommendation || recommendation.type !== "volume") return false;
    const plans = readPlans();
    const session = result.sessions[result.sessionIndex];
    const plan = plans.find(item => item.id === session?.planId);
    const exercise = plan?.days?.[recommendation.targetDayIndex]?.exercises?.find(item => item.id === recommendation.targetExerciseId);
    if (!exercise) return false;
    exercise.sets = Math.max(1, (Number(exercise.sets) || 1) + Number(recommendation.delta || 0));
    plan.updatedAt = new Date().toISOString();
    writeJson(PLAN_KEY, plans);
    recommendation.status = "applied";
    recommendation.appliedSets = exercise.sets;
    recommendation.decidedAt = new Date().toISOString();
    writeJson(SESSION_KEY, result.sessions);
    return true;
}

function startDeload(sessionId, recommendationId) {
    const result = findRecommendation(sessionId, recommendationId);
    const session = result.sessions[result.sessionIndex];
    if (!result.recommendation || !session) return false;
    const state = readState();
    state.pendingDeload = {
        planId: session.planId,
        startedAt: new Date().toISOString(),
        dayCount: Math.max(1, session.planSnapshot?.days?.length || 1),
        completedDays: []
    };
    saveState(state);
    result.recommendation.status = "applied";
    result.recommendation.decidedAt = new Date().toISOString();
    writeJson(SESSION_KEY, result.sessions);
    return true;
}

function refreshCoachSummary(button) {
    const recap = button.closest(".workout-complete-recap");
    const existing = recap?.querySelector(".adaptive-coach-summary");
    if (!recap || !existing) return;
    existing.remove();
    renderCoachSummary(recap);
}

window.addEventListener("click", event => {
    const completeButton = event.target.closest?.("#save-session-btn");
    if (!completeButton) return;
    const logger = completeButton.closest("#workout-session-logger");
    if (logger?.dataset.adaptiveDeloadPreview === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        exitDeloadPreview();
        return;
    }
    const active = readActive();
    if (!logger || logger.dataset.editingSessionId || !guidanceEnabled() || !active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderPostCheck(logger, active);
}, true);

document.addEventListener("click", event => {
    if (event.target.closest?.("[data-adaptive-exit-deload-preview]")) {
        exitDeloadPreview();
        return;
    }
    const recovery = event.target.closest?.("[data-recovery-status]");
    if (recovery) return setRecoveryChoice(recovery);

    const difficulty = event.target.closest?.("[data-adaptive-difficulty]");
    if (difficulty) return setPostChoice(difficulty, "difficulty", difficulty.dataset.adaptiveDifficulty);

    const discomfort = event.target.closest?.("[data-adaptive-discomfort]");
    if (discomfort) return setPostChoice(discomfort, "discomfort", discomfort.dataset.adaptiveDiscomfort);

    const rir = event.target.closest?.("[data-rir-value]");
    if (rir) return handleRirChoice(rir);

    const toggle = event.target.closest?.(".adaptive-rir-toggle");
    if (toggle) {
        const panel = toggle.closest(".adaptive-rir-control")?.querySelector(".adaptive-rir-panel");
        if (panel) {
            panel.hidden = !panel.hidden;
            toggle.setAttribute("aria-expanded", String(!panel.hidden));
        }
        return;
    }

    if (event.target.closest?.("[data-adaptive-rir-info]")) return showRirInfo();
    if (event.target.closest?.("[data-adaptive-close-info]") || event.target.classList?.contains("adaptive-info-overlay")) {
        document.querySelector(".adaptive-info-overlay")?.remove();
        return;
    }

    if (event.target.closest?.("[data-adaptive-start-workout]")) {
        startWorkoutFromRecovery();
        return;
    }

    if (event.target.closest?.("[data-adaptive-finish-workout]")) {
        finishWorkoutFromCheckIn();
        return;
    }

    if (event.target.closest?.("[data-adaptive-return-workout]")) {
        document.querySelector(".adaptive-post-flow")?.remove();
        return;
    }

    const skip = event.target.closest?.("[data-adaptive-skip]");
    if (skip) {
        if (skip.dataset.adaptiveSkip === "recovery") startWorkoutFromRecovery({ skipped: true });
        else finishWorkoutFromCheckIn({ skipped: true });
        return;
    }

    if (event.target.closest?.("[data-adaptive-end-deload]")) {
        const state = readState();
        state.pendingDeload = null;
        saveState(state);
        event.target.textContent = "Ends after this workout";
        event.target.disabled = true;
        return;
    }

    const action = event.target.closest?.("[data-adaptive-action]");
    if (action) {
        const summary = action.closest(".adaptive-coach-summary");
        const sessionId = summary?.dataset.adaptiveSessionId;
        const recommendationId = action.dataset.recommendationId;
        let changed = false;
        if (action.dataset.adaptiveAction === "apply-volume") changed = applyVolumeRecommendation(sessionId, recommendationId);
        if (action.dataset.adaptiveAction === "start-deload") changed = startDeload(sessionId, recommendationId);
        if (action.dataset.adaptiveAction === "dismiss") changed = markRecommendation(sessionId, recommendationId, "dismissed");
        if (changed) refreshCoachSummary(action);
    }
});

document.addEventListener("change", event => {
    const select = event.target.closest?.("[data-adaptive-discomfort-exercise]");
    if (!select) return;
    const logger = select.closest("#workout-session-logger") || document.getElementById("workout-session-logger");
    if (logger) dispatchSessionGuidance(logger, { discomfortExerciseId: select.value || null });
});

window.addEventListener("levelup:workout-completed", handleWorkoutCompleted);
window.addEventListener("levelup:adaptive-settings-changed", () => enhanceLogger(document.getElementById("workout-session-logger")));
window.addEventListener("levelup:deload-preview-requested", () => window.setTimeout(() => {
    renderPreviewNavigationNotice();
    enhanceLogger(document.getElementById("workout-session-logger"));
}, 0));

const observer = new MutationObserver(mutations => {
    let loggerChanged = false;
    let recap = null;
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.id === "workout-session-logger" || node.matches?.(".session-exercise-card,.logger-exercise-strip") || node.querySelector?.("#workout-session-logger,.session-exercise-card,.logger-exercise-strip")) loggerChanged = true;
        if (node.matches?.(".workout-complete-recap")) recap = node;
        else recap ||= node.querySelector?.(".workout-complete-recap");
    }));
    if (loggerChanged) window.setTimeout(() => enhanceLogger(document.getElementById("workout-session-logger")), 30);
    if (getDeloadPreviewRequest()) window.setTimeout(renderPreviewNavigationNotice, 30);
    if (recap) window.setTimeout(() => renderCoachSummary(recap), 20);
});

observer.observe(document.body, { childList: true, subtree: true });
enhanceLogger(document.getElementById("workout-session-logger"));

function capitalize(value) {
    return value ? value[0].toUpperCase() + value.slice(1) : "";
}

function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}
