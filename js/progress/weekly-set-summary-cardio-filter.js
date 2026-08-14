let refreshQueued = false;

export function removeCardioFromWeeklySetSummary() {
    const heatmap = document.querySelector("#weekly-muscle-volume .volume-heatmap");
    if (!heatmap) return;

    const cardioRows = [...heatmap.querySelectorAll(".volume-muscle-label")]
        .filter(label => label.textContent?.trim().toLowerCase() === "cardio");

    cardioRows.forEach(label => {
        let current = label;

        while (current) {
            const next = current.nextElementSibling;
            current.remove();

            if (!next || next.classList.contains("volume-muscle-label")) break;
            current = next;
        }
    });
}

function scheduleFilter() {
    if (refreshQueued) return;
    refreshQueued = true;

    requestAnimationFrame(() => {
        refreshQueued = false;
        removeCardioFromWeeklySetSummary();
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(scheduleFilter).observe(content, {
        childList: true,
        subtree: true
    });
}

document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#lifting-tab, .training-progress-tab[data-view="training"], #load-training-demo, #remove-training-demo')) {
        requestAnimationFrame(() => requestAnimationFrame(scheduleFilter));
    }
});

scheduleFilter();
