let queued = false;

function cleanBreakdown(card) {
    const breakdown = card.querySelector(".calculated-maintenance-breakdown");
    if (!breakdown) return;

    breakdown.querySelectorAll("[data-tdee-live-estimate-row]").forEach(row => row.remove());
    breakdown.querySelectorAll(":scope > small").forEach(note => note.remove());
}

function refresh() {
    queued = false;
    document.querySelectorAll("#calorie-progress .calculated-maintenance-card").forEach(cleanBreakdown);
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:food-log-updated", schedule);
window.addEventListener("levelup:weight-updated", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#nutrition-progress-tab, [data-page='progress']")) window.setTimeout(schedule, 0);
}, true);

schedule();
