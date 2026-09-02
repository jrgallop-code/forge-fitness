import "../more/install-level-up.js?v=install-success-contrast-1";

const STYLE_ID = "levelup-onboarding-install-help-styles";
let selectedPlatform = detectPlatform();
let dismissed = false;
let refreshQueued = false;

function detectPlatform() {
    const ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return "android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    return "ios";
}

function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .onboarding-install-card{display:grid;gap:12px;margin-top:4px;padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:linear-gradient(180deg,rgba(239,24,31,.07),rgba(255,255,255,.025))}
        .onboarding-install-head{display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px;align-items:start}
        .onboarding-install-icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(239,24,31,.35);border-radius:12px;background:rgba(239,24,31,.09);color:#fff}
        .onboarding-install-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .onboarding-install-copy{display:grid;gap:4px;min-width:0}
        .onboarding-install-copy h3{margin:0!important;font-size:15px!important;line-height:1.2!important;text-transform:none!important;letter-spacing:0!important;color:#fff!important}
        .onboarding-install-copy p{margin:0;color:var(--muted,#a1a1aa);font-size:11px;line-height:1.45}
        .onboarding-install-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px}
        .onboarding-install-tab{min-height:40px;margin:0;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#15151a;color:#f5f5f7;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
        .onboarding-install-tab.selected{border-color:rgba(239,24,31,.72);background:rgba(239,24,31,.12);box-shadow:inset 0 0 0 1px rgba(239,24,31,.12)}
        .onboarding-install-steps{margin:0;padding:0;list-style:none;display:grid;gap:7px}
        .onboarding-install-steps li{display:grid;grid-template-columns:26px minmax(0,1fr);gap:8px;align-items:start;padding:9px 10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#15151a;color:#f2f2f4;font-size:11px;line-height:1.4}
        .onboarding-install-step-number{width:26px;height:26px;display:grid;place-items:center;border-radius:999px;background:rgba(239,24,31,.13);color:#fff;font-size:10px;font-weight:900}
        .onboarding-install-note{margin:0!important;color:var(--muted,#a1a1aa)!important;font-size:10px!important;line-height:1.4!important}
        .onboarding-install-dismiss{width:100%;min-height:38px;margin:0;border:0;background:transparent;color:var(--muted,#a1a1aa);font:inherit;font-size:11px;font-weight:800;cursor:pointer}
        .onboarding-install-installed{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(74,222,128,.26);border-radius:10px;background:rgba(74,222,128,.07);color:#dffbea;font-size:11px;font-weight:800}
        .onboarding-install-installed-dot{width:8px;height:8px;border-radius:999px;background:#4ade80;flex:0 0 auto}
    `;
    document.head.appendChild(style);
}

function renderSteps(platform) {
    if (platform === "android") {
        return `
            <ol class="onboarding-install-steps">
                <li><span class="onboarding-install-step-number">1</span><span>Open Level Up in <strong>Chrome</strong>.</span></li>
                <li><span class="onboarding-install-step-number">2</span><span>Tap the <strong>three-dot menu</strong>, then choose <strong>Add to home screen</strong>.</span></li>
                <li><span class="onboarding-install-step-number">3</span><span>Tap <strong>Install</strong> to add Level Up to your phone.</span></li>
            </ol>
            <p class="onboarding-install-note">Menu wording can vary slightly by Android and Chrome version.</p>
        `;
    }
    return `
        <ol class="onboarding-install-steps">
            <li><span class="onboarding-install-step-number">1</span><span>Open Level Up in <strong>Safari</strong>.</span></li>
            <li><span class="onboarding-install-step-number">2</span><span>Tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</span></li>
            <li><span class="onboarding-install-step-number">3</span><span>If <strong>Open as Web App</strong> appears, turn it on. Then tap <strong>Add</strong>.</span></li>
        </ol>
        <p class="onboarding-install-note">The switch is not shown on every iOS version. You can still tap Add.</p>
    `;
}

function cardMarkup() {
    if (isStandalone()) {
        return `
            <section class="onboarding-install-card" data-onboarding-install-card>
                <div class="onboarding-install-head">
                    <div class="onboarding-install-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M10 18.5h4"/></svg></div>
                    <div class="onboarding-install-copy"><span class="eyebrow">LEVEL UP ON YOUR PHONE</span><h3>Already installed</h3><p>You are already running Level Up from your Home Screen.</p></div>
                </div>
                <div class="onboarding-install-installed"><span class="onboarding-install-installed-dot"></span>Home Screen app detected</div>
            </section>
        `;
    }

    return `
        <section class="onboarding-install-card" data-onboarding-install-card>
            <div class="onboarding-install-head">
                <div class="onboarding-install-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M12 6v8M9 9l3-3 3 3M10 18.5h4"/></svg></div>
                <div class="onboarding-install-copy"><span class="eyebrow">LEVEL UP ON YOUR PHONE</span><h3>Add Level Up to your Home Screen</h3><p>Launch it faster and use Level Up in a more app-like, full-screen experience.</p></div>
            </div>
            <div class="onboarding-install-tabs" role="tablist" aria-label="Home Screen instructions">
                <button class="onboarding-install-tab ${selectedPlatform === "ios" ? "selected" : ""}" type="button" role="tab" aria-selected="${selectedPlatform === "ios"}" data-install-platform="ios">iPhone / iPad</button>
                <button class="onboarding-install-tab ${selectedPlatform === "android" ? "selected" : ""}" type="button" role="tab" aria-selected="${selectedPlatform === "android"}" data-install-platform="android">Android</button>
            </div>
            <div data-install-steps>${renderSteps(selectedPlatform)}</div>
            <button class="onboarding-install-dismiss" type="button" data-install-dismiss>Not Now</button>
        </section>
    `;
}

function enhanceCompletion() {
    if (dismissed) return;
    const completion = document.querySelector(".levelup-onboarding:not(.levelup-nutrition-setup) .onboarding-completion");
    if (!completion || !completion.querySelector("[data-onboarding-finish]")) return;
    if (completion.querySelector("[data-onboarding-install-card]")) return;
    const actions = completion.querySelector(".onboarding-completion-actions");
    if (!actions) return;
    actions.insertAdjacentHTML("beforebegin", cardMarkup());
}

function scheduleEnhance() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        ensureStyles();
        enhanceCompletion();
    });
}

document.addEventListener("click", event => {
    const platformButton = event.target.closest?.("[data-install-platform]");
    if (platformButton) {
        selectedPlatform = platformButton.dataset.installPlatform;
        const card = platformButton.closest("[data-onboarding-install-card]");
        card?.querySelectorAll("[data-install-platform]").forEach(button => {
            const selected = button.dataset.installPlatform === selectedPlatform;
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-selected", String(selected));
        });
        const steps = card?.querySelector("[data-install-steps]");
        if (steps) steps.innerHTML = renderSteps(selectedPlatform);
        return;
    }

    const dismissButton = event.target.closest?.("[data-install-dismiss]");
    if (dismissButton) {
        dismissed = true;
        dismissButton.closest("[data-onboarding-install-card]")?.remove();
    }
});

const observer = new MutationObserver(scheduleEnhance);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener("pageshow", scheduleEnhance);
window.addEventListener("load", scheduleEnhance);
scheduleEnhance();
