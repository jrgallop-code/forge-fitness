const STYLE_ID = "weight-history-neutral-trend-style";
let queued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress .weight-history-trend,
        #weight-progress .weight-history-trend.is-up,
        #weight-progress .weight-history-trend.is-down,
        #weight-progress .weight-history-trend.is-flat,
        #weight-progress .weight-history-trend.is-goal-on-track,
        #weight-progress .weight-history-trend.is-goal-off-track,
        #weight-progress .weight-history-trend.is-goal-neutral {
            color: var(--text, var(--heading, #0f1f3a)) !important;
            background: var(--surface-raised, rgba(148, 163, 184, .12)) !important;
            border-color: var(--line, rgba(148, 163, 184, .22)) !important;
        }
    `;
    document.head.appendChild(style);
}

export function applyGoalAwareWeightHistoryColors() {
    ensureStyles();
    const list = document.getElementById("weight-history-list");
    if (!list) return;

    list.querySelectorAll(".weight-history-trend").forEach(trend => {
        trend.classList.remove(
            "is-up",
            "is-down",
            "is-flat",
            "is-goal-on-track",
            "is-goal-off-track"
        );
        trend.classList.add("is-goal-neutral");
        trend.removeAttribute("title");
    });
}

function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        applyGoalAwareWeightHistoryColors();
    });
}

const observer = new MutationObserver(records => {
    if (records.some(record =>
        record.addedNodes.length ||
        record.removedNodes.length ||
        record.target?.closest?.("#weight-history-list")
    )) queueApply();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("click", event => {
    if (event.target.closest?.("#weight-tab, .edit-weight-entry, .remove-weight-entry, #save-weight-btn")) {
        setTimeout(queueApply, 0);
        setTimeout(queueApply, 120);
    }
}, true);

queueApply();
