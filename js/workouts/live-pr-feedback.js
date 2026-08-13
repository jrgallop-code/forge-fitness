import { getExerciseById } from "./exercise-library.js?v=exercise-library-cardio-3";
import { evaluateLiveWorkoutPrs, initializeWorkoutPrBadges } from "./workout-pr-badges.js?v=workout-pr-badges-4";

const ACTIVE_KEY = "level_up_active_workout";
const SESSION_KEY = "forge_workout_sessions";
const SCORE_EPSILON = 0.01;
let toastTimer = null;

function readJson(key, fallback) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function getActiveSession() {
    const session = readJson(ACTIVE_KEY, null);
    return session && session.status === "in_progress" ? session : null;
}

function getHistoricalSessions() {
    const sessions = readJson(SESSION_KEY, []);
    return Array.isArray(sessions) ? sessions : [];
}

function getStatus() {
    const active = getActiveSession();
    if (!active) return { active: null, status: { count: 0, details: new Map() } };
    return { active, status: evaluateLiveWorkoutPrs(active, getHistoricalSessions()) };
}

function refreshLiveDisplay() {
    if (document.querySelector(".history-session-card, .history-workout-card")) {
        initializeWorkoutPrBadges();
    }

    const logger = document.getElementById("workout-session-logger");
    if (!logger || logger.dataset.editingSessionId) {
        document.querySelector(".live-pr-toast")?.remove();
        return;
    }

    const { status } = getStatus();
    logger.querySelectorAll(".live-pr-exercise-badge").forEach(element => element.remove());
    logger.querySelectorAll(".session-set-row.live-pr-set").forEach(row => row.classList.remove("live-pr-set"));

    let counter = logger.querySelector(".live-pr-workout-count");
    if (status.count > 0) {
        if (!counter) {
            counter = document.createElement("span");
            counter.className = "live-pr-workout-count";
            logger.querySelector(".builder-heading > div")?.appendChild(counter);
        }
        if (counter) counter.innerHTML = `${trophyIcon()}<span>PR · ${status.count}</span>`;
    } else {
        counter?.remove();
    }

    status.details.forEach(detail => {
        const card = [...logger.querySelectorAll(".session-exercise-card")]
            .find(element => String(element.dataset.exerciseId || "") === String(detail.exerciseId));
        if (!card) return;

        const row = card.querySelector(`.session-set-row[data-set-index="${detail.bestSetIndex}"]`);
        row?.classList.add("live-pr-set");

        const badge = document.createElement("div");
        badge.className = "live-pr-exercise-badge";
        badge.innerHTML = `${trophyIcon()}<span>PR achieved</span>`;
        card.querySelector("h4")?.insertAdjacentElement("afterend", badge);
    });
}

function handleCompletedSet(button, beforeStatus) {
    const logger = button.closest("#workout-session-logger");
    if (!logger || logger.dataset.editingSessionId) return;

    const row = button.closest(".session-set-row");
    const card = button.closest(".session-exercise-card");
    const exerciseId = card?.dataset.exerciseId;
    const after = getStatus().status;
    refreshLiveDisplay();

    if (!row?.classList.contains("completed") || !exerciseId) return;
    const afterDetail = after.details.get(exerciseId);
    if (!afterDetail) return;

    const beforeDetail = beforeStatus?.details?.get(exerciseId);
    const newlyEstablished = !beforeDetail;
    const improvedAgain = beforeDetail && afterDetail.score > beforeDetail.score + SCORE_EPSILON;
    if (!newlyEstablished && !improvedAgain) return;
    showPrToast(exerciseId, afterDetail);
}

function showPrToast(exerciseId, detail) {
    document.querySelector(".live-pr-toast")?.remove();
    if (toastTimer) window.clearTimeout(toastTimer);

    const exerciseName = getExerciseById(exerciseId)?.name || "Exercise";
    const toast = document.createElement("div");
    toast.className = "live-pr-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `<div class="live-pr-toast-icon">${trophyIcon()}</div><div><span>CONGRATS! NEW PR!</span><strong>${escapeHtml(exerciseName)}</strong><small>${escapeHtml(formatPrDetail(detail))} · Awesome work!</small></div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));

    toastTimer = window.setTimeout(() => {
        toast.classList.remove("show");
        window.setTimeout(() => toast.remove(), 220);
    }, 3600);
}

function formatPrDetail(detail) {
    const set = detail?.bestSet || {};
    if (detail?.mode === "weighted") {
        const weight = Number(set.weight);
        const reps = Number(set.reps);
        return `${weight} lb × ${reps} · est. 1RM ${Math.round(detail.score)} lb`;
    }
    return `${Number(set.reps) || 0} reps`;
}

function trophyIcon() {
    return `<svg class="workout-pr-trophy" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3.5c0 3.2-1.7 5.5-4 5.5s-4-2.3-4-5.5V4Z"/><path d="M8 6H4.5v1.3c0 2.4 1.5 4.2 3.9 4.5M16 6h3.5v1.3c0 2.4-1.5 4.2-3.9 4.5"/><path d="M12 13v4M8.5 20h7M10 17h4"/></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("click", event => {
    const completeButton = event.target.closest?.(".complete-set-btn");
    if (completeButton) {
        const before = getStatus().status;
        window.setTimeout(() => handleCompletedSet(completeButton, before), 0);
        return;
    }
    window.setTimeout(refreshLiveDisplay, 0);
}, true);

document.addEventListener("change", event => {
    if (event.target?.id === "progress-range") window.setTimeout(refreshLiveDisplay, 0);
});

window.addEventListener("focus", refreshLiveDisplay);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshLiveDisplay(); });
window.setTimeout(refreshLiveDisplay, 0);

if (!document.querySelector('link[data-workout-complete-recap-style]')) {
    const recapStyle = document.createElement("link");
    recapStyle.rel = "stylesheet";
    recapStyle.href = "css/workout-complete-recap.css?v=workout-complete-recap-2";
    recapStyle.dataset.workoutCompleteRecapStyle = "true";
    document.head.appendChild(recapStyle);
}
import("./workout-complete-recap.js?v=workout-complete-recap-2");
import("./workout-complete-recap-preview.js?v=workout-complete-recap-preview-1");
