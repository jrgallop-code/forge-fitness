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
        // Keep the current URL if parsing is unavailable.
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

function hideEngineLauncher() {
    document.querySelectorAll(".interactive-workout-tutorial-section").forEach(section => {
        section.hidden = true;
        section.setAttribute("aria-hidden", "true");
        section.style.setProperty("display", "none", "important");
        section.style.setProperty("position", "absolute", "important");
        section.style.setProperty("width", "0", "important");
        section.style.setProperty("height", "0", "important");
        section.style.setProperty("overflow", "hidden", "important");
        section.style.setProperty("pointer-events", "none", "important");
    });
}

function syncEntry() {
    removeLegacyLauncherArtifacts();
    hideEngineLauncher();

    const shell = document.querySelector(".learn-shell");
    if (!shell) return;

    const list = shell.querySelector(".learn-lesson-list");
    if (!list) return;

    let row = document.getElementById(ENTRY_ID);
    if (!row) {
        row = document.createElement("button");
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
                <small>Practice the real workout logger using Full Body Foundation, including warm-ups, plate calculator, working sets, drop sets, Smart Swap, Add Set and Add Exercise.</small>
                <span>11 guided steps · about 4 min</span>
            </span>
            <span class="learn-lesson-state" aria-hidden="true">›</span>`;
        list.insertAdjacentElement("afterbegin", row);
    }
    else if (row.parentElement !== list) {
        list.insertAdjacentElement("afterbegin", row);
    }
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
    hideEngineLauncher();
    const card = document.getElementById(ENGINE_CARD_ID);
    if (card) {
        card.click();
        window.setTimeout(() => {
            if (document.documentElement.classList.contains("interactive-workout-tutorial-active")) {
                launching = false;
                return;
            }
            launching = false;
            const state = document.querySelector(`#${ENTRY_ID} .learn-lesson-state`);
            if (state) state.textContent = "›";
        }, 900);
        return;
    }

    if (attempt >= 60) {
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
        .interactive-workout-tutorial-section{display:none!important;position:absolute!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important;margin:0!important;padding:0!important;border:0!important}
        #${ENTRY_ID}{display:grid!important;grid-template-columns:42px minmax(0,1fr) 24px!important;align-items:center!important;gap:12px!important;width:100%!important;min-width:0!important;min-height:68px!important;padding:13px 14px!important;margin:0!important;border:0!important;border-bottom:1px solid var(--line,rgba(0,0,0,.08))!important;border-radius:0!important;background:transparent!important;color:var(--text)!important;text-align:left!important;box-sizing:border-box!important;cursor:pointer!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;overflow:hidden!important}
        #${ENTRY_ID}>*{min-width:0!important;max-width:100%!important}
        #${ENTRY_ID} .learn-lesson-icon{box-sizing:border-box!important;display:grid!important;place-items:center!important;width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;min-height:42px!important;max-height:42px!important;overflow:hidden!important}
        #${ENTRY_ID} .learn-lesson-icon svg{display:block!important;width:23px!important;height:23px!important;min-width:23px!important;max-width:23px!important;min-height:23px!important;max-height:23px!important;fill:currentColor!important}
        #${ENTRY_ID} .learn-lesson-copy{display:grid!important;gap:3px!important;min-width:0!important;overflow:hidden!important}
        #${ENTRY_ID} .learn-lesson-copy strong{display:block!important;min-width:0!important;font-size:14px!important;line-height:1.25!important;white-space:normal!important;overflow-wrap:anywhere!important}
        #${ENTRY_ID} .learn-lesson-copy small{display:block!important;min-width:0!important;color:var(--muted)!important;font-size:11px!important;line-height:1.3!important;white-space:normal!important;overflow:hidden!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
        #${ENTRY_ID} .learn-lesson-copy>span{display:block!important;color:var(--muted)!important;font-size:9px!important;font-weight:800!important;letter-spacing:.06em!important;text-transform:uppercase!important;white-space:normal!important}
        #${ENTRY_ID} .learn-lesson-state{display:block!important;width:24px!important;min-width:24px!important;max-width:24px!important;font-size:23px!important;line-height:1!important;text-align:right!important;overflow:hidden!important}
        .learn-contextual-row{grid-template-columns:42px minmax(0,1fr) auto!important;align-items:center!important;min-width:0!important}
        .learn-lesson-icon{box-sizing:border-box!important;max-width:42px!important;max-height:42px!important;overflow:hidden!important}
        .learn-lesson-icon svg{max-width:23px!important;max-height:23px!important}
        .learn-contextual-row .learn-lesson-copy,.learn-lesson-row .learn-lesson-copy{min-width:0!important}
        @media(max-width:380px){
            #${ENTRY_ID}{grid-template-columns:38px minmax(0,1fr) 20px!important;padding:11px 12px!important}
            #${ENTRY_ID} .learn-lesson-icon{width:38px!important;height:38px!important;min-width:38px!important;max-width:38px!important;min-height:38px!important;max-height:38px!important}
            .learn-contextual-row{grid-template-columns:38px minmax(0,1fr)!important}
            .learn-lesson-icon{max-width:38px!important;max-height:38px!important}
        }
    `;
    document.head.appendChild(style);
}
