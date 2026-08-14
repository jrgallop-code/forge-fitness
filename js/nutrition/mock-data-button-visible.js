const BUTTON_ID = "coach-mock-data-button";
const PANEL_ID = "coach-target-sample-lab";
let retryCount = 0;
let retryTimer = null;
let refreshQueued = false;

function ensureStyles() {
    if (document.getElementById("coach-mock-data-button-styles")) return;
    const style = document.createElement("style");
    style.id = "coach-mock-data-button-styles";
    style.textContent = `
        #${BUTTON_ID}{width:100%;min-height:44px;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:800}
        #${BUTTON_ID} .mock-data-chevron{font-size:12px;transition:transform .16s ease}
        #${BUTTON_ID}[aria-expanded="true"] .mock-data-chevron{transform:rotate(180deg)}
        #${PANEL_ID}>summary{display:none}
        #${PANEL_ID}{margin-top:8px!important;border-top:0!important;padding-top:0!important}
    `;
    document.head.appendChild(style);
}

function nudgeSampleModule() {
    const host = document.getElementById("goal-check-in-card");
    if (!host) return;
    const marker = document.createElement("span");
    marker.hidden = true;
    marker.dataset.mockDataMountNudge = "1";
    host.appendChild(marker);
    marker.remove();
}

function ensureButton() {
    ensureStyles();
    const card = document.querySelector('#goal-check-in-card[data-weekly-coach="1"], #goal-check-in-card');
    if (!card) {
        scheduleRetry();
        return;
    }

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
        nudgeSampleModule();
        scheduleRetry();
        return;
    }

    retryCount = 0;
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }

    let button = document.getElementById(BUTTON_ID);
    if (!button) {
        button = document.createElement("button");
        button.id = BUTTON_ID;
        button.type = "button";
        button.className = "secondary-btn";
        button.setAttribute("aria-controls", PANEL_ID);
        button.setAttribute("aria-expanded", panel.open ? "true" : "false");
        button.innerHTML = `<span>Mock Data Scenarios</span><span class="mock-data-chevron" aria-hidden="true">⌄</span>`;
        panel.insertAdjacentElement("beforebegin", button);

        button.addEventListener("click", () => {
            const target = document.getElementById(PANEL_ID);
            if (!target) return;
            target.open = !target.open;
            button.setAttribute("aria-expanded", target.open ? "true" : "false");
            if (target.open) {
                window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "nearest" }), 40);
            }
        });
    }

    button.setAttribute("aria-expanded", panel.open ? "true" : "false");
}

function scheduleRetry() {
    if (retryCount >= 12 || retryTimer) return;
    retryCount += 1;
    retryTimer = window.setTimeout(() => {
        retryTimer = null;
        ensureButton();
    }, retryCount < 4 ? 80 : 180);
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        ensureButton();
    });
}

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", scheduleRefresh);
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
document.addEventListener("click", event => {
    if (event.target.closest?.('[data-page="energy"], [data-nav="energy"]')) {
        window.setTimeout(scheduleRefresh, 50);
        window.setTimeout(scheduleRefresh, 180);
    }
}, true);

scheduleRefresh();
window.setTimeout(scheduleRefresh, 120);
window.setTimeout(scheduleRefresh, 350);
