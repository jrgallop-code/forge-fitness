import { initializeWeeklyMuscleVolume } from "./weekly-muscle-volume.js?v=volume-trends-1";

function initializeFreshVolumeAnalytics() {
    if (!document.getElementById("lifting-progress")) return;
    initializeWeeklyMuscleVolume();
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => requestAnimationFrame(initializeFreshVolumeAnalytics))
        .observe(content, { childList: true });
}

window.addEventListener("pageshow", initializeFreshVolumeAnalytics);
window.setTimeout(initializeFreshVolumeAnalytics, 0);
