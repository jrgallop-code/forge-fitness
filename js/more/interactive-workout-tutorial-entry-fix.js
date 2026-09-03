const ENTRY_ID = "interactive-workout-tutorial-entry";
const ENGINE_CARD_ID = "interactive-workout-tutorial-card";
const LEGACY_PARAM = "workoutTutorial";
let queued = false;
let launching = false;

install();

function install() {
    removeLegacyLauncherArtifacts();
    removeLegacyUrlFlag();
    ensureCriticalStyles();
    queueSync();
    new MutationObserver(queueSync).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
}

function removeLegacyLauncherArtifacts() {
    document.querySelectorAll(".interactive-workout-native-launch").forEach(node => node.remove());
    document.getElementById("interactive-workout-native-launch-style")?.remove();
}

function removeLegacyUrlFlag() {
    try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has(LEGACY_PARAM)) return;
        url.searchParams.delete(LEGACY_PARAM);
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    catch {
        // Leave the current URL alone if URL parsing is unavailable.
    }
}

function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        syncEntry();
    });
}

function syncEntry() {
    removeLegacyLauncherArtifacts();

    const shell = document.querySelector(".learn-shell");
    if (!shell) return;

    // Keep the interactive tutorial engine mounted, but hide its custom launcher.
    // The user-facing entry now lives in the same list as the other Tutorials rows.
    const engineCard = document.getElementById(ENGINE_CARD_ID);
    const engineSection = engineCard?.closest(".interactive-workout-tutorial-section");
    if (engineSection) {
        engineSection.hidden = true;
        engineSection.setAttribute("aria-hidden", "true");
    }

    if (document.getElementById(ENTRY_ID)) return;
    const list = shell.querySelector(".learn-lesson-list");
    if (!list) return;

    const row = document.createElement("button");
    row.id = ENTRY_ID;
    row.type = "button";
    row.className = "learn-lesson-row interactive-workout-tutorial-list-row";
    row.setAttribute("aria-label", "Start Interactive Workout Logger tutorial");
    row.innerHTML = `
        <span class="learn-lesson-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M2.5 9h2v6h-2V9Zm2.5-2h3v10H5V7Zm3.5 4h7v2h-7v-2ZM16 7h3v10h-3V7Zm3.5 2h2v6h-2V9Z"/></svg>
        </span>
        <span class="learn-lesson-copy">
            <strong>Interactive Workout Logger</strong>
            <small>Practice the real workout logger using Full Body Foundation, including warm-ups, plate calculator, sets, drop sets, swaps, Add Set and Add Exercise.</small>
            <span>11 guided steps · about 4 min</span>
        </span>
        <span class="learn-lesson-state" aria-hidden="true">›</span>`;

    list.insertAdjacentElement("afterbegin", row);
}

function handleClick(event) {
    const entry = event.target.closest?.(`#${ENTRY_ID}`);
    if (!entry || launching) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    launching = true;

    const state = entry.querySelector(".learn-lesson-state");
    if (state) state.textContent = "…";

    launchEngine(0);
}

function launchEngine(attempt) {
    const card = document.getElementById(ENGINE_CARD_ID);
    if (card) {
        card.click();
        window.setTimeout(() => {
            if (!document.documentElement.classList.contains("interactive-workout-tutorial-active")) {
                launching = false;
                const state = document.querySelector(`#${ENTRY_ID} .learn-lesson-state`);
                if (state) state.textContent = "›";
            }
        }, 700);
        return;
    }

    if (attempt >= 40) {
        launching = false;
        const state = document.querySelector(`#${ENTRY_ID} .learn-lesson-state`);
        if (state) state.textContent = "›";
        return;
    }
    window.setTimeout(() => launchEngine(attempt + 1), 50);
}

function ensureCriticalStyles() {
    if (document.getElementById("interactive-workout-tutorial-entry-fix-styles")) return;
    const style = document.createElement("style");
    style.id = "interactive-workout-tutorial-entry-fix-styles";
    style.textContent = `
        .interactive-workout-tutorial-section[hidden]{display:none!important}
        #${ENTRY_ID}{width:100%;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        #${ENTRY_ID} .learn-lesson-copy small{white-space:normal;overflow:visible;text-overflow:clip}
        .learn-contextual-row{grid-template-columns:42px minmax(0,1fr) auto!important;align-items:center!important;min-width:0!important}
        .learn-lesson-icon{box-sizing:border-box!important;display:grid!important;place-items:center!important;width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;min-height:42px!important;max-height:42px!important;overflow:hidden!important}
        .learn-lesson-icon svg{display:block!important;width:23px!important;height:23px!important;min-width:23px!important;max-width:23px!important;min-height:23px!important;max-height:23px!important;fill:currentColor!important}
        .learn-contextual-row .learn-lesson-copy,.learn-lesson-row .learn-lesson-copy{min-width:0!important}
        @media(max-width:380px){
            .learn-contextual-row{grid-template-columns:38px minmax(0,1fr)!important}
            .learn-lesson-icon{width:38px!important;height:38px!important;min-width:38px!important;max-width:38px!important;min-height:38px!important;max-height:38px!important}
        }
    `;
    document.head.appendChild(style);
}
