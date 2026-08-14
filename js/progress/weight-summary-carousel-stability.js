import { initializeWeightProgressCompact } from "./weight-progress-compact.js?v=weight-carousel-position-1";

let queued = false;

function applyWeightCarouselFix() {
    queued = false;
    if (!document.getElementById("weight-progress")) return;
    initializeWeightProgressCompact();
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(applyWeightCarouselFix);
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
}

document.addEventListener("click", event => {
    if (event.target?.closest?.('.nav-btn[data-page="progress"], #weight-tab')) {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 120);
    }
}, true);

window.addEventListener("load", schedule);
schedule();
