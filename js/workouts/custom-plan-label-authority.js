const LABEL = "+ Custom Plan";
let queued = false;

function apply(root = document) {
    const buttons = root.querySelectorAll?.("[data-workout-live-new-plan], .workout-live-new-plan") || [];
    buttons.forEach(button => {
        if (String(button.textContent || "").trim() !== LABEL) button.textContent = LABEL;
        button.setAttribute("aria-label", "Create a custom workout plan");
    });
}

function queue(root = document) {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        apply(root);
    });
}

const observer = new MutationObserver(records => {
    for (const record of records) {
        if (record.target?.matches?.("[data-workout-live-new-plan], .workout-live-new-plan")) {
            queue();
            return;
        }
        for (const node of record.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches?.("[data-workout-live-new-plan], .workout-live-new-plan") ||
                node.querySelector?.("[data-workout-live-new-plan], .workout-live-new-plan")) {
                queue();
                return;
            }
        }
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
window.addEventListener("pageshow", () => queue());
document.addEventListener("click", event => {
    if (event.target.closest?.("#close-plan-builder-btn, .plan-detail-back, [data-workout-live-create-action], [data-workout-live-new-plan]")) {
        setTimeout(() => queue(), 0);
        setTimeout(() => queue(), 80);
    }
}, true);

apply();
