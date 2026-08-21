function removePhaseCheckIn() {
    document.getElementById("goal-check-in-card")?.remove();
}

let queued = false;
function scheduleRemoval() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
        queued = false;
        removePhaseCheckIn();
    });
}

removePhaseCheckIn();

const content = document.getElementById("content");
if (content) {
    new MutationObserver(scheduleRemoval).observe(content, {
        childList: true,
        subtree: true
    });
}

window.addEventListener("levelup:nutrition-updated", scheduleRemoval);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRemoval);
window.addEventListener("pageshow", scheduleRemoval);
