const ENGINE_CARD_ID = "interactive-workout-tutorial-card";
const OLD_STANDALONE_ID = "interactive-workout-tutorial-standalone";
const OLD_ENTRY_ID = "interactive-workout-tutorial-entry";
let queued = false;

install();

function install() {
    ensureStyles();
    cleanupProxyLaunchers();
    queueSync();
    new MutationObserver(queueSync).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "aria-hidden", "data-interactive-engine-launcher"]
    });
}

function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        syncRealLauncher();
    });
}

function cleanupProxyLaunchers() {
    document.getElementById(OLD_STANDALONE_ID)?.remove();
    document.getElementById(OLD_ENTRY_ID)?.remove();
    document.querySelectorAll(".interactive-workout-native-launch").forEach(node => node.remove());
    document.getElementById("interactive-workout-native-launch-style")?.remove();
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function syncRealLauncher() {
    cleanupProxyLaunchers();

    const section = document.querySelector(".interactive-workout-tutorial-section");
    const card = section?.querySelector(`#${ENGINE_CARD_ID}`);
    if (!section || !card) return;

    // The previous standalone launcher hid this real engine card and then tried to
    // programmatically click it. That proxy path was unreliable on iOS. Keep the
    // real tutorial button visible and let its own startTutorial handler receive
    // the user's tap directly.
    if (section.hasAttribute("data-interactive-engine-launcher")) {
        section.removeAttribute("data-interactive-engine-launcher");
    }
    if (section.hasAttribute("aria-hidden")) section.removeAttribute("aria-hidden");
    card.removeAttribute("aria-hidden");
    card.setAttribute("aria-label", "Start Interactive Workout Logger tutorial");

    // Remove any icon injected by older/global button decoration rules. The
    // tutorial's own pointing-hand badge is a span, so hiding SVG descendants is
    // safe here and prevents the stray weightlifter artwork from returning.
    section.querySelectorAll("svg").forEach(svg => svg.remove());

    const header = section.querySelector("header");
    setText(header?.querySelector("small"), "INTERACTIVE PRACTICE");
    setText(header?.querySelector("h3"), "Learn by doing");
    setText(header?.querySelector("p"), "Practice the actual workout logger with a real Level Up plan and follow the controls on screen.");

    const copy = card.querySelector(".interactive-workout-tutorial-copy");
    setText(copy?.querySelector("strong"), "Interactive Workout Logger");
    setText(copy?.querySelector("small"), "Full Body Foundation · Day 1 – Full Body A");
    setText(copy?.querySelector("span"), "Form guide · warm-ups · plate calculator · working sets · drop sets · Smart Swap · Add Set · Add Exercise");
}

function ensureStyles() {
    let style = document.getElementById("interactive-workout-standalone-styles");
    if (!style) {
        style = document.createElement("style");
        style.id = "interactive-workout-standalone-styles";
        document.head.appendChild(style);
    }

    style.textContent = `
        #${OLD_STANDALONE_ID},#${OLD_ENTRY_ID},.interactive-workout-native-launch{display:none!important}
        .interactive-workout-tutorial-section[data-interactive-engine-launcher="1"]{display:grid!important}
        .interactive-workout-tutorial-section{box-sizing:border-box!important;position:relative!important;isolation:isolate!important;z-index:30!important;display:grid!important;gap:9px!important;margin:10px 0 4px!important;min-width:0!important;pointer-events:auto!important}
        .interactive-workout-tutorial-section::before,.interactive-workout-tutorial-section::after{content:none!important;display:none!important;background:none!important;background-image:none!important}
        .interactive-workout-tutorial-section>svg,.interactive-workout-tutorial-section button svg{display:none!important}
        .interactive-workout-tutorial-section>header{display:grid!important;gap:3px!important;margin:0!important;padding:0 2px!important}
        .interactive-workout-tutorial-section>header>div{display:flex!important;align-items:baseline!important;justify-content:space-between!important;gap:10px!important}
        .interactive-workout-tutorial-section>header small{color:var(--accent-text,var(--accent))!important;font-size:9px!important;font-weight:900!important;letter-spacing:.1em!important}
        .interactive-workout-tutorial-section>header h3{margin:0!important;color:var(--text)!important;font-size:18px!important;line-height:1.2!important}
        .interactive-workout-tutorial-section>header p{margin:0!important;color:var(--muted)!important;font-size:11px!important;line-height:1.4!important}
        button#${ENGINE_CARD_ID}{box-sizing:border-box!important;position:relative!important;z-index:31!important;display:grid!important;grid-template-columns:46px minmax(0,1fr) auto!important;grid-template-rows:auto!important;align-items:center!important;align-content:center!important;justify-content:stretch!important;gap:12px!important;width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:14px 15px!important;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333))!important;border-radius:18px!important;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 11%,var(--card)),var(--card))!important;color:var(--text)!important;box-shadow:var(--shadow)!important;text-align:left!important;cursor:pointer!important;pointer-events:auto!important;touch-action:manipulation!important;overflow:hidden!important;-webkit-tap-highlight-color:transparent!important}
        button#${ENGINE_CARD_ID}::before,button#${ENGINE_CARD_ID}::after,button#${ENGINE_CARD_ID}>*::before,button#${ENGINE_CARD_ID}>*::after{content:none!important;display:none!important;background:none!important;background-image:none!important;mask:none!important;-webkit-mask:none!important}
        button#${ENGINE_CARD_ID}>*{pointer-events:none!important}
        button#${ENGINE_CARD_ID}:active{transform:scale(.995)!important}
        button#${ENGINE_CARD_ID} .interactive-workout-tutorial-icon{grid-column:1!important;display:grid!important;place-items:center!important;width:46px!important;height:46px!important;border-radius:14px!important;background:var(--accent-soft)!important;font-size:25px!important;line-height:1!important}
        button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy{grid-column:2!important;display:grid!important;gap:3px!important;min-width:0!important;width:auto!important;max-width:none!important;white-space:normal!important}
        button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy strong,button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy small,button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy span{display:block!important;min-width:0!important;white-space:normal!important}
        button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy strong{font-size:14px!important;line-height:1.22!important;color:var(--text)!important}
        button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy small{margin:0!important;color:var(--muted)!important;font-size:10px!important;line-height:1.35!important}
        button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy span{margin:0!important;color:var(--muted)!important;font-size:9px!important;line-height:1.35!important;font-weight:500!important}
        button#${ENGINE_CARD_ID} .interactive-workout-tutorial-state{grid-column:3!important;color:var(--accent-text,var(--accent))!important;font-size:10px!important;font-weight:900!important;white-space:nowrap!important}
        @media(max-width:430px){
            button#${ENGINE_CARD_ID}{grid-template-columns:48px minmax(0,1fr)!important;grid-template-rows:auto auto!important;gap:10px 12px!important;padding:14px!important}
            button#${ENGINE_CARD_ID} .interactive-workout-tutorial-icon{grid-column:1!important;grid-row:1 / span 2!important;width:46px!important;height:46px!important;align-self:start!important}
            button#${ENGINE_CARD_ID} .interactive-workout-tutorial-copy{grid-column:2!important;grid-row:1!important}
            button#${ENGINE_CARD_ID} .interactive-workout-tutorial-state{grid-column:2!important;grid-row:2!important;justify-self:start!important;margin-top:2px!important}
        }
    `;
}
