import "./plate-calculator.js?v=unit-system-1";
import "./starting-weight-calibration.js?v=starting-weight-1";

const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";

function readActiveWorkout() {
    try {
        const active = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
        return active?.status === "in_progress" ? active : null;
    }
    catch {
        return null;
    }
}

function humanizeExerciseId(value) {
    const text = String(value || "").trim();
    if (!text) return "Exercise";

    return text
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map(word => word ? word[0].toUpperCase() + word.slice(1) : word)
        .join(" ");
}

function getPlannedExercise(active, card) {
    const exerciseIndex = Number(card?.dataset?.exerciseIndex);
    if (!active || !Number.isInteger(exerciseIndex)) return null;

    const dayIndex = Number(active.trainingDayIndex) || 0;
    return active.planSnapshot?.days?.[dayIndex]?.exercises?.[exerciseIndex] || null;
}

function resolveCardExerciseName(active, card) {
    const planned = getPlannedExercise(active, card);
    const savedName = planned?.name || planned?.exerciseName || planned?.title || null;
    if (savedName) return String(savedName).trim();

    const exerciseIndex = Number(card?.dataset?.exerciseIndex);
    const state = Number.isInteger(exerciseIndex) ? active?.exercises?.[exerciseIndex] : null;
    const id = planned?.id || card?.dataset?.exerciseId || state?.exerciseId || "";

    return humanizeExerciseId(id);
}

function isGenericHeading(value) {
    const text = String(value || "").trim();
    return !text || /^(exercise|cardio)$/i.test(text);
}

function repairLoggerExerciseNames() {
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return;

    const active = readActiveWorkout();
    if (!active) return;

    const cards = [...logger.querySelectorAll(".session-exercise-card")];
    cards.forEach((card, index) => {
        const heading = card.querySelector("h4");
        if (!heading) return;

        const resolvedName = resolveCardExerciseName(active, card);
        if (!resolvedName || resolvedName === "Exercise") return;

        if (isGenericHeading(heading.textContent)) {
            heading.textContent = resolvedName;
        }

        const stripButton = logger.querySelector(`.logger-exercise-strip button[data-exercise-tab-index="${index}"] strong`);
        if (stripButton && (isGenericHeading(stripButton.textContent) || stripButton.textContent.trim() !== heading.textContent.trim())) {
            stripButton.textContent = heading.textContent.trim();
        }
    });

    const strip = logger.querySelector(".logger-exercise-strip");
    if (strip) {
        strip.dataset.signature = cards
            .map(card => card.querySelector("h4")?.textContent?.trim() || "Exercise")
            .join("|");
    }
}

let repairQueued = false;
function queueRepair() {
    if (repairQueued) return;
    repairQueued = true;
    requestAnimationFrame(() => {
        repairQueued = false;
        repairLoggerExerciseNames();
        setTimeout(repairLoggerExerciseNames, 60);
    });
}

const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation =>
        [...mutation.addedNodes].some(node =>
            node.nodeType === 1 && (
                node.id === "workout-session-logger" ||
                node.matches?.(".session-exercise-card, .logger-exercise-strip") ||
                node.querySelector?.("#workout-session-logger, .session-exercise-card, .logger-exercise-strip")
            )
        )
    );

    if (relevant) queueRepair();
});

observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener("focus", queueRepair);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) queueRepair();
});

queueRepair();
