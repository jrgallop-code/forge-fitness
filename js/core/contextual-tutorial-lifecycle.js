import { getTutorialState } from "./tutorials.js?v=contextual-lifecycle-1";

const STYLE_ID = "level-up-contextual-tutorial-lifecycle";
const CONFIG = {
    "trend-weight": {
        launchers: ["#weight-progress [data-trend-tutorial-launch]"],
        shells: [],
        cards: ["#weight-progress [data-trend-weight-tutorial]", "#weight-progress [data-trend-weight-tutorial-inline-v2]"]
    },
    expenditure: {
        launchers: ["#calorie-progress [data-tdee-tutorial-launch]"],
        shells: ["#calorie-progress [data-tdee-tutorial-launch-shell]"],
        cards: ["#calorie-progress [data-tdee-tutorial-owned='1']", "#calorie-progress [data-expenditure-tutorial]"]
    }
};
let queued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        [data-trend-tutorial-launch][hidden],
        [data-tdee-tutorial-launch][hidden],
        [data-tdee-tutorial-launch-shell][hidden] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

function setHidden(selector, hidden) {
    document.querySelectorAll(selector).forEach(node => {
        if (node.hidden !== hidden) node.hidden = hidden;
    });
}

function syncTutorial(id, config) {
    const status = getTutorialState(id).status;
    const hidden = status === "dismissed" || status === "completed";
    config.launchers.forEach(selector => setHidden(selector, hidden));
    config.shells.forEach(selector => setHidden(selector, hidden));
    if (hidden) config.cards.forEach(selector => setHidden(selector, true));
}

function refresh() {
    queued = false;
    ensureStyles();
    Object.entries(CONFIG).forEach(([id, config]) => syncTutorial(id, config));
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:tutorial-restarted", schedule);

document.addEventListener("click", event => {
    if (event.target.closest?.(
        "[data-trend-tutorial-dismiss], [data-trend-tutorial-next], [data-tdee-tutorial-close], [data-tdee-tutorial-next], [data-expenditure-tutorial-dismiss], [data-expenditure-tutorial-next]"
    )) {
        window.setTimeout(schedule, 0);
    }
}, true);

schedule();
