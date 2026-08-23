const BANNER_ID = "levelup-install-reminder";
const STYLE_ID = "levelup-install-reminder-styles";
const DISMISSED_KEY = "levelup.installReminderIgnored.v1";
let refreshQueued = false;
let hiddenForSession = false;

function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
}

function isIgnored() {
    try { return localStorage.getItem(DISMISSED_KEY) === "true"; }
    catch { return false; }
}

function shouldStayHidden() {
    return hiddenForSession
        || isStandalone()
        || isIgnored()
        || document.documentElement.classList.contains("level-up-login-required")
        || document.body.classList.contains("levelup-onboarding-open")
        || document.body.classList.contains("levelup-workout-mode-active")
        || Boolean(document.querySelector("#level-up-login-gate, .levelup-onboarding, .workout-session-logger"));
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .levelup-install-reminder{position:fixed;z-index:10001;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));width:min(520px,calc(100% - 28px));box-sizing:border-box;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 11px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(18,18,22,.95);box-shadow:0 12px 34px rgba(0,0,0,.42);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transform:translateX(-50%);color:#fff}
        .levelup-install-reminder-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:rgba(239,24,31,.11);color:#f5f5f7}
        .levelup-install-reminder-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .levelup-install-reminder-copy{min-width:0;display:grid;gap:1px}.levelup-install-reminder-copy strong{font-size:12px;line-height:1.25;color:#fff}.levelup-install-reminder-copy span{font-size:10px;line-height:1.35;color:var(--muted,#a1a1aa)}
        .levelup-install-reminder-actions{display:flex;align-items:center;gap:4px}.levelup-install-reminder-actions button{min-height:34px;margin:0;border:0;border-radius:9px;padding:0 9px;font:inherit;font-size:10px;font-weight:850;white-space:nowrap;cursor:pointer}
        .levelup-install-reminder-save{background:rgba(239,24,31,.92);color:#fff}.levelup-install-reminder-ignore{background:transparent;color:var(--muted,#a1a1aa)}
        @media(max-width:390px){.levelup-install-reminder{bottom:calc(84px + env(safe-area-inset-bottom));grid-template-columns:30px minmax(0,1fr) auto;gap:8px;padding:9px}.levelup-install-reminder-icon{width:30px;height:30px}.levelup-install-reminder-copy span{display:none}.levelup-install-reminder-actions button{padding:0 7px}}
        @media(prefers-reduced-motion:no-preference){.levelup-install-reminder{animation:levelupInstallReminderIn .22s ease-out both}@keyframes levelupInstallReminderIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}}
    `;
    document.head.appendChild(style);
}

function removeBanner() { document.getElementById(BANNER_ID)?.remove(); }

function renderBanner() {
    if (shouldStayHidden()) { removeBanner(); return; }
    if (document.getElementById(BANNER_ID) || !document.querySelector(".bottom-nav")) return;
    ensureStyles();
    const banner = document.createElement("aside");
    banner.id = BANNER_ID;
    banner.className = "levelup-install-reminder";
    banner.setAttribute("aria-label", "Save Level Up to your Home Screen");
    banner.innerHTML = `
        <span class="levelup-install-reminder-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M12 6v8M9 9l3-3 3 3M10 18.5h4"/></svg></span>
        <span class="levelup-install-reminder-copy"><strong>Save Level Up to your Home Screen</strong><span>Launch it faster, just like an app.</span></span>
        <span class="levelup-install-reminder-actions"><button class="levelup-install-reminder-save" type="button" data-install-reminder-save>Save App</button><button class="levelup-install-reminder-ignore" type="button" data-install-reminder-ignore>Ignore</button></span>`;
    document.body.appendChild(banner);
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => { refreshQueued = false; renderBanner(); });
}

document.addEventListener("click", event => {
    if (event.target.closest?.("[data-install-reminder-ignore]")) {
        try { localStorage.setItem(DISMISSED_KEY, "true"); } catch {}
        removeBanner();
        return;
    }
    if (event.target.closest?.("[data-install-reminder-save]")) {
        hiddenForSession = true;
        removeBanner();
        window.dispatchEvent(new CustomEvent("levelup:open-install-guide"));
    }
});

window.addEventListener("appinstalled", removeBanner);
window.addEventListener("pageshow", scheduleRefresh);
window.addEventListener("load", () => window.setTimeout(scheduleRefresh, 1800));
new MutationObserver(scheduleRefresh).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
window.setTimeout(scheduleRefresh, 1800);
