const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";
let observer = null;
let repairing = false;

function getActiveWarmupTimer() {
    try {
        const active = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
        const timer = active?.status === "in_progress" ? active.restTimer : null;
        if (!timer || timer.sourceType !== "warmup" || timer.status === "finished") return null;

        let remainingMs = Math.max(0, Number(timer.remainingMs) || 0);
        if (timer.status === "running" && timer.endAt) {
            remainingMs = Math.max(0, new Date(timer.endAt).getTime() - Date.now());
        }
        if (remainingMs <= 0) return null;

        const exerciseIndex = Number.isFinite(Number(timer.exerciseIndex))
            ? Number(timer.exerciseIndex)
            : Number(active.currentExerciseIndex) || 0;
        const warmupIndex = Number.isFinite(Number(timer.warmupIndex))
            ? Number(timer.warmupIndex)
            : 0;

        return { exerciseIndex, warmupIndex, remainingMs, status: timer.status };
    }
    catch {
        return null;
    }
}

function formatSeconds(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function activeWarmupLine(timer) {
    if (!timer) return null;
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return null;
    return logger.querySelector(
        `.inline-rest-timer[data-exercise-index="${timer.exerciseIndex}"][data-source-type="warmup"][data-item-index="${timer.warmupIndex}"]`
    );
}

function stabilizeWarmupTimer() {
    if (repairing) return;
    const timer = getActiveWarmupTimer();
    if (!timer) return;

    const line = activeWarmupLine(timer);
    if (!line) return;

    const desired = `${timer.status === "paused" ? "Paused · " : ""}${formatSeconds(timer.remainingMs)}`;
    if (!line.hidden && line.textContent === desired) return;

    repairing = true;
    try {
        // workout-logger-compact.js still owns the legacy working-set inline timer.
        // Its 500 ms loop clears every .inline-rest-timer before restoring only
        // data-set-index rows. Warm-up timers use source-type/item-index instead,
        // so repair that legacy mutation in the same microtask before Safari paints.
        line.hidden = false;
        if (line.textContent !== desired) line.textContent = desired;
        line.dataset.warmupTimerStable = "true";
    }
    finally {
        repairing = false;
    }
}

function mutationTouchesWarmupTimer(mutation) {
    const target = mutation.target?.nodeType === Node.ELEMENT_NODE
        ? mutation.target
        : mutation.target?.parentElement;
    if (target?.closest?.('.inline-rest-timer[data-source-type="warmup"]')) return true;

    return [...(mutation.addedNodes || [])].some(node =>
        node?.nodeType === Node.ELEMENT_NODE && (
            node.matches?.('.inline-rest-timer[data-source-type="warmup"]') ||
            node.querySelector?.('.inline-rest-timer[data-source-type="warmup"]')
        )
    );
}

function installObserver() {
    observer?.disconnect();
    observer = new MutationObserver(mutations => {
        if (!mutations.some(mutationTouchesWarmupTimer)) return;
        queueMicrotask(stabilizeWarmupTimer);
    });
    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["hidden"]
    });
}

function start() {
    if (!document.body) {
        document.addEventListener("DOMContentLoaded", start, { once: true });
        return;
    }
    installObserver();
    stabilizeWarmupTimer();
}

start();
window.addEventListener("levelup:rest-timer-started", stabilizeWarmupTimer);
window.addEventListener("levelup:rest-timer-finished", stabilizeWarmupTimer);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) stabilizeWarmupTimer();
});
