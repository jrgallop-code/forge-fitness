import { initializeWeeklyMuscleVolume } from "./weekly-muscle-volume.js?v=volume-trends-1";

function ensureStyles() {
    if (document.querySelector('link[data-volume-trends-style="true"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/volume-trends.css?v=volume-trends-1";
    link.dataset.volumeTrendsStyle = "true";
    document.head.appendChild(link);
}

function initializeFreshVolumeAnalytics() {
    if (!document.getElementById("lifting-progress")) return;
    ensureStyles();
    initializeWeeklyMuscleVolume();
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => requestAnimationFrame(initializeFreshVolumeAnalytics))
        .observe(content, { childList: true });
}

window.addEventListener("pageshow", initializeFreshVolumeAnalytics);
window.setTimeout(initializeFreshVolumeAnalytics, 0);
