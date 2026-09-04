const LAUNCHER_ID = "interactive-workout-tutorial-standalone";
const ENGINE_CARD_ID = "interactive-workout-tutorial-card";
const OLD_ENTRY_ID = "interactive-workout-tutorial-entry";
let queued = false;
let launching = false;

install();

function install() {
    ensureStyles();
    cleanupLegacyVisibleLaunchers();
    queueSync();
    new MutationObserver(queueSync).observe(document.documentElement, { childList: true, subtree: true });
}

function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        syncLauncher();
    });
}

function cleanupLegacyVisibleLaunchers() {
    document.getElementById(OLD_ENTRY_ID)?.remove();
    document.querySelectorAll(".interactive-workout-native-launch").forEach(node => node.remove());
    document.getElementById("interactive-workout-native-launch-style")?.remove();

    // The engine still creates its original internal launcher. Keep it mounted so
    // we can trigger the proven tutorial flow, but never show it to the user.
    document.querySelectorAll(".interactive-workout-tutorial-section").forEach(section => {
        section.setAttribute("data-interactive-engine-launcher", "1");
        section.setAttribute("aria-hidden", "true");
    });
}

function syncLauncher() {
    cleanupLegacyVisibleLaunchers();

    const shell = document.querySelector(".learn-shell");
    if (!shell || document.getElementById(LAUNCHER_ID)) return;

    const section = document.createElement("section");
    section.id = LAUNCHER_ID;
    section.className = "interactive-workout-standalone-section";
    section.innerHTML = `
        <header class="interactive-workout-standalone-heading">
            <div>
                <small>INTERACTIVE PRACTICE</small>
                <h3>Learn by doing</h3>
            </div>
            <p>Practice the actual workout logger with a real Level Up plan and follow the controls on screen.</p>
        </header>
        <button class="interactive-workout-standalone-card" type="button" aria-label="Start Interactive Workout Logger tutorial">
            <span class="interactive-workout-standalone-icon" aria-hidden="true">☝️</span>
            <span class="interactive-workout-standalone-copy">
                <strong>Interactive Workout Logger</strong>
                <small>Full Body Foundation · Day 1 – Full Body A</small>
                <span>Form guide · warm-ups · plate calculator · working sets · drop sets · Smart Swap · Add Set · Add Exercise</span>
            </span>
            <span class="interactive-workout-standalone-action">Start →</span>
        </button>`;

    const button = section.querySelector(".interactive-workout-standalone-card");
    const launch = event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        if (launching) return;
        launching = true;
        const action = button?.querySelector(".interactive-workout-standalone-action");
        if (action) action.textContent = "Opening…";
        launchEngine(0, button);
    };
    button?.addEventListener("pointerup", launch, { capture: true });
    button?.addEventListener("click", launch, { capture: true });

    const libraryHeading = shell.querySelector(".learn-library-heading");
    if (libraryHeading) libraryHeading.insertAdjacentElement("beforebegin", section);
    else shell.appendChild(section);
}

function launchEngine(attempt, button) {
    const engineCard = document.getElementById(ENGINE_CARD_ID);
    if (engineCard) {
        engineCard.click();
        window.setTimeout(() => {
            if (!document.documentElement.classList.contains("interactive-workout-tutorial-active")) {
                launching = false;
                const action = button?.querySelector(".interactive-workout-standalone-action");
                if (action) action.textContent = "Start →";
            }
        }, 900);
        return;
    }

    if (attempt >= 80) {
        launching = false;
        const action = button?.querySelector(".interactive-workout-standalone-action");
        if (action) action.textContent = "Try again →";
        return;
    }
    window.setTimeout(() => launchEngine(attempt + 1, button), 50);
}

function ensureStyles() {
    if (document.getElementById("interactive-workout-standalone-styles")) return;
    const style = document.createElement("style");
    style.id = "interactive-workout-standalone-styles";
    style.textContent = `
        .interactive-workout-tutorial-section[data-interactive-engine-launcher="1"]{display:none!important}
        #${OLD_ENTRY_ID}{display:none!important}
        .interactive-workout-standalone-section{position:relative;isolation:isolate;z-index:30;display:grid;gap:9px;margin:10px 0 4px;min-width:0;pointer-events:auto!important}
        .interactive-workout-standalone-heading{display:grid;gap:3px;padding:0 2px}
        .interactive-workout-standalone-heading>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
        .interactive-workout-standalone-heading small{color:var(--accent-text,var(--accent));font-size:9px;font-weight:900;letter-spacing:.1em}
        .interactive-workout-standalone-heading h3{margin:0;color:var(--text);font-size:18px}
        .interactive-workout-standalone-heading p{margin:0;color:var(--muted);font-size:11px;line-height:1.4}
        button.interactive-workout-standalone-card{box-sizing:border-box!important;position:relative!important;z-index:31!important;display:grid!important;grid-template-columns:46px minmax(0,1fr) auto!important;align-items:center!important;align-content:center!important;justify-content:stretch!important;gap:12px!important;width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:14px 15px!important;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border))!important;border-radius:18px!important;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 11%,var(--card)),var(--card))!important;color:var(--text)!important;box-shadow:var(--shadow)!important;text-align:left!important;cursor:pointer!important;pointer-events:auto!important;touch-action:manipulation!important;overflow:visible!important;-webkit-tap-highlight-color:transparent}
        button.interactive-workout-standalone-card::before,button.interactive-workout-standalone-card::after{content:none!important;display:none!important}
        button.interactive-workout-standalone-card>*{pointer-events:none!important}
        button.interactive-workout-standalone-card:active{transform:scale(.995)}
        .interactive-workout-standalone-icon{grid-column:1;display:grid!important;place-items:center;width:46px;height:46px;border-radius:14px;background:var(--accent-soft);font-size:25px;line-height:1}
        .interactive-workout-standalone-copy{grid-column:2;display:grid!important;gap:3px;min-width:0!important;width:auto!important;max-width:none!important;white-space:normal!important}
        .interactive-workout-standalone-copy strong,.interactive-workout-standalone-copy small,.interactive-workout-standalone-copy span{display:block!important;min-width:0!important;white-space:normal!important}
        .interactive-workout-standalone-copy strong{font-size:14px;line-height:1.22}
        .interactive-workout-standalone-copy small{color:var(--muted);font-size:10px;line-height:1.35}
        .interactive-workout-standalone-copy span{color:var(--muted);font-size:9px;line-height:1.35}
        .interactive-workout-standalone-action{grid-column:3;color:var(--accent-text,var(--accent));font-size:10px;font-weight:900;white-space:nowrap!important}
        @media(max-width:430px){
            button.interactive-workout-standalone-card{grid-template-columns:48px minmax(0,1fr)!important;grid-template-rows:auto auto!important;gap:10px 12px!important;padding:14px!important}
            .interactive-workout-standalone-icon{grid-column:1!important;grid-row:1 / span 2!important;width:46px;height:46px;align-self:start}
            .interactive-workout-standalone-copy{grid-column:2!important;grid-row:1!important}
            .interactive-workout-standalone-action{grid-column:2!important;grid-row:2!important;justify-self:start!important;margin-top:2px}
        }
    `;
    document.head.appendChild(style);
}
