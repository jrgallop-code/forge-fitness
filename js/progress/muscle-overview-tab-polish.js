const STYLE_ID = "muscle-overview-tab-polish-style";

const ICONS = {
    volume: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="11" width="4" height="9" rx="1.2" fill="currentColor"></rect>
            <rect x="10" y="7" width="4" height="13" rx="1.2" fill="currentColor"></rect>
            <rect x="17" y="4" width="4" height="16" rx="1.2" fill="currentColor"></rect>
        </svg>
    `,
    recovery: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M20 7v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M18.2 16.3A7.5 7.5 0 1 1 19.8 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>
        </svg>
    `
};

let queued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .muscle-overview-toggle button {
            display:flex;
            align-items:center;
            justify-content:center;
            gap:8px;
        }

        .muscle-overview-tab-icon {
            display:inline-flex;
            align-items:center;
            justify-content:center;
            width:21px;
            height:21px;
            flex:0 0 21px;
            color:currentColor;
        }

        .muscle-overview-tab-icon svg {
            display:block;
            width:100%;
            height:100%;
        }

        .muscle-overview-tab-label {
            line-height:1;
        }
    `;
    document.head.appendChild(style);
}

function polishButton(button, mode, label) {
    if (!button || button.dataset.tabPolishLabel === label) return;

    button.innerHTML = `
        <span class="muscle-overview-tab-icon">${ICONS[mode]}</span>
        <span class="muscle-overview-tab-label">${label}</span>
    `;
    button.setAttribute("aria-label", label);
    button.dataset.tabPolishLabel = label;
}

function polishMuscleOverviewTabs() {
    ensureStyles();

    const toggle = document.querySelector(".muscle-overview-toggle");
    if (!toggle) return;

    polishButton(toggle.querySelector('[data-muscle-overview-mode="volume"]'), "volume", "Volume");
    polishButton(toggle.querySelector('[data-muscle-overview-mode="recovery"]'), "recovery", "Recovery");
}

function queuePolish() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        polishMuscleOverviewTabs();
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queuePolish).observe(content, { childList: true, subtree: true });
}

document.addEventListener("click", event => {
    if (
        event.target.closest?.("#lifting-tab") ||
        event.target.closest?.('.training-progress-tab[data-view="training"]') ||
        event.target.closest?.("[data-muscle-overview-mode]")
    ) {
        window.setTimeout(queuePolish, 0);
    }
});

queuePolish();
