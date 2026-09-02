const STYLE_ID = "levelup-more-install-styles";
let selectedPlatform = detectPlatform();
let enhanceQueued = false;

const PHONE_ICON = `<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v16h10V4H7Zm3 13h4v1.5h-4V17Zm2-11v7.2l2.2-2.2 1.4 1.4L12 16l-3.6-3.6 1.4-1.4 2.2 2.2V6h2Z"/></svg>`;

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
        .more-install-page{display:grid;gap:14px;margin-top:14px;padding:16px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:linear-gradient(180deg,rgba(239,24,31,.07),rgba(255,255,255,.022))}
        .more-install-page-head{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;align-items:start}
        .more-install-page-icon{width:48px;height:48px;display:grid;place-items:center;border:1px solid rgba(239,24,31,.36);border-radius:14px;background:rgba(239,24,31,.10);color:#fff}
        .more-install-page-icon svg{width:27px;height:27px;fill:currentColor}
        .more-install-page-copy{display:grid;gap:5px;min-width:0}
        .more-install-page-copy h3{margin:0;font-size:20px;line-height:1.15;color:#fff}
        .more-install-page-copy p{margin:0;color:var(--muted,#a1a1aa);font-size:13px;line-height:1.5}
        .more-install-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .more-install-tab{min-height:44px;margin:0;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:#15151a;color:#f5f5f7;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
        .more-install-tab.selected{border-color:rgba(239,24,31,.75);background:rgba(239,24,31,.13);box-shadow:inset 0 0 0 1px rgba(239,24,31,.14)}
        .more-install-steps{display:grid;gap:8px;margin:0;padding:0;list-style:none}
        .more-install-steps li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:start;padding:11px 12px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:#15151a;color:#f4f4f5;font-size:13px;line-height:1.45}
        .more-install-step-number{width:30px;height:30px;display:grid;place-items:center;border-radius:999px;background:rgba(239,24,31,.14);color:#fff;font-size:11px;font-weight:900}
        .more-install-note{margin:0;color:var(--muted,#a1a1aa);font-size:11px;line-height:1.45}
        .more-install-installed{display:flex;align-items:center;gap:9px;padding:12px;border:1px solid color-mix(in srgb,var(--success,#4ade80) 36%,var(--line,transparent));border-radius:12px;background:color-mix(in srgb,var(--success,#4ade80) 9%,var(--card,#15151a));color:var(--success-text,#147a3c);-webkit-text-fill-color:var(--success-text,#147a3c);font-size:13px;font-weight:800}
        .more-install-installed-dot{width:9px;height:9px;border-radius:999px;background:#4ade80;flex:0 0 auto}
        .more-install-back{margin-bottom:10px}
        @media(max-width:520px){.more-install-page{padding:14px}.more-install-page-copy h3{font-size:18px}.more-install-steps li{font-size:12px}}
    `;
    document.head.appendChild(style);
}

function menuCardMarkup() {
    const installed = isStandalone();
    return `<button class="more-menu-card" type="button" data-install-level-up-entry><span class="more-menu-icon">${PHONE_ICON}</span><span><strong>${installed ? "Level Up is Installed" : "Install Level Up"}</strong><small>${installed ? "View Home Screen app information." : "Add Level Up to your Home Screen for faster, app-like access."}</small></span></button>`;
}

function renderSteps(platform) {
    if (platform === "android") {
        return `<ol class="more-install-steps">
            <li><span class="more-install-step-number">1</span><span>Open Level Up in <strong>Chrome</strong>.</span></li>
            <li><span class="more-install-step-number">2</span><span>Tap the <strong>three-dot menu</strong>, then choose <strong>Add to home screen</strong>.</span></li>
            <li><span class="more-install-step-number">3</span><span>Tap <strong>Install</strong> to add Level Up to your phone.</span></li>
        </ol><p class="more-install-note">Menu wording can vary slightly by Android and Chrome version.</p>`;
    }
    return `<ol class="more-install-steps">
        <li><span class="more-install-step-number">1</span><span>Open Level Up in <strong>Safari</strong>.</span></li>
        <li><span class="more-install-step-number">2</span><span>Tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</span></li>
        <li><span class="more-install-step-number">3</span><span>If <strong>Open as Web App</strong> appears, turn it on. Then tap <strong>Add</strong>.</span></li>
    </ol><p class="more-install-note">The switch is not shown on every iOS version. You can still tap Add.</p>`;
}

function renderGuide() {
    if (isStandalone()) {
        return `<section class="more-install-page">
            <div class="more-install-page-head">
                <div class="more-install-page-icon">${PHONE_ICON}</div>
                <div class="more-install-page-copy"><span class="eyebrow">HOME SCREEN APP</span><h3>Level Up is already installed</h3><p>You are currently running Level Up from your Home Screen in standalone app mode.</p></div>
            </div>
            <div class="more-install-installed"><span class="more-install-installed-dot"></span>Home Screen app detected</div>
        </section>`;
    }
    return `<section class="more-install-page">
        <div class="more-install-page-head">
            <div class="more-install-page-icon">${PHONE_ICON}</div>
            <div class="more-install-page-copy"><span class="eyebrow">LEVEL UP ON YOUR PHONE</span><h3>Add Level Up to your Home Screen</h3><p>Launch Level Up faster and use it in a more app-like, full-screen experience.</p></div>
        </div>
        <div class="more-install-tabs" role="tablist" aria-label="Home Screen install instructions">
            <button class="more-install-tab ${selectedPlatform === "ios" ? "selected" : ""}" type="button" role="tab" aria-selected="${selectedPlatform === "ios"}" data-more-install-platform="ios">iPhone / iPad</button>
            <button class="more-install-tab ${selectedPlatform === "android" ? "selected" : ""}" type="button" role="tab" aria-selected="${selectedPlatform === "android"}" data-more-install-platform="android">Android</button>
        </div>
        <div data-more-install-steps>${renderSteps(selectedPlatform)}</div>
    </section>`;
}

function openInstallGuide() {
    ensureStyles();
    const content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = `<section class="dashboard-welcome"><div><button class="nutrition-planner-back more-install-back" type="button" data-more-install-back>← More</button><span class="eyebrow">APP & DATA</span><h2>${isStandalone() ? "Level Up Installed" : "Install Level Up"}</h2><p>Home Screen installation instructions are always available here.</p></div></section>${renderGuide()}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("levelup:open-install-guide", openInstallGuide);

function enhanceMoreMenu() {
    ensureStyles();
    const grid = document.querySelector("#content .more-menu-grid");
    if (!grid || grid.querySelector("[data-install-level-up-entry]")) return;
    const exportsCard = grid.querySelector('[data-more-page="exports-backup"]');
    if (exportsCard) exportsCard.insertAdjacentHTML("beforebegin", menuCardMarkup());
    else grid.insertAdjacentHTML("beforeend", menuCardMarkup());
}

function scheduleEnhance() {
    if (enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(() => {
        enhanceQueued = false;
        enhanceMoreMenu();
    });
}

function returnToMore() {
    const moreNav = document.querySelector('.nav-btn[data-page="more"]');
    if (moreNav) {
        moreNav.click();
        return;
    }
    window.location.reload();
}

document.addEventListener("click", event => {
    const entry = event.target.closest?.("[data-install-level-up-entry]");
    if (entry) {
        event.preventDefault();
        openInstallGuide();
        return;
    }

    const back = event.target.closest?.("[data-more-install-back]");
    if (back) {
        event.preventDefault();
        returnToMore();
        return;
    }

    const platform = event.target.closest?.("[data-more-install-platform]");
    if (platform) {
        selectedPlatform = platform.dataset.moreInstallPlatform;
        const guide = platform.closest(".more-install-page");
        guide?.querySelectorAll("[data-more-install-platform]").forEach(button => {
            const selected = button.dataset.moreInstallPlatform === selectedPlatform;
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-selected", String(selected));
        });
        const steps = guide?.querySelector("[data-more-install-steps]");
        if (steps) steps.innerHTML = renderSteps(selectedPlatform);
    }
});

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleEnhance).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", scheduleEnhance);
window.addEventListener("load", scheduleEnhance);
scheduleEnhance();
