const DISMISS_KEY = "level_up_system_recovery_notice_2026_09_03_dismissed";
const SESSION_KEY = "level_up_cloud_session";
const NOTICE_ID = "level-up-system-recovery-notice";

installSystemRecoveryNotice();

function installSystemRecoveryNotice() {
    ensureStyles();
    mountIfEligible();

    const observer = new MutationObserver(() => mountIfEligible());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener("click", event => {
        const gotIt = event.target.closest?.("[data-system-recovery-dismiss]");
        if (gotIt) {
            localStorage.setItem(DISMISS_KEY, "1");
            document.getElementById(NOTICE_ID)?.remove();
            return;
        }

        const restore = event.target.closest?.("[data-system-recovery-restore]");
        if (restore) {
            event.preventDefault();
            openRestoreHistory();
        }
    });
}

function mountIfEligible() {
    if (!hasValidSession()) return removeNotice();
    if (localStorage.getItem(DISMISS_KEY) === "1") return removeNotice();
    if (document.getElementById("level-up-login-gate")) return removeNotice();
    if (document.querySelector(".levelup-onboarding,[data-onboarding-root]")) return removeNotice();
    if (!document.querySelector('.bottom-nav .nav-btn[data-page="more"]')) return;

    const content = document.getElementById("content");
    if (!content || document.getElementById(NOTICE_ID)) return;

    const notice = document.createElement("section");
    notice.id = NOTICE_ID;
    notice.className = "section-card level-up-system-recovery-notice";
    notice.setAttribute("role", "alert");
    notice.innerHTML = `
        <div class="level-up-system-recovery-copy">
            <span class="eyebrow">IMPORTANT NOTICE</span>
            <h3>Data recovery information</h3>
            <p>A Level Up system failure may have affected stored data for some users. If any of your workout, weight or nutrition history is missing, your cloud backup may still contain it.</p>
            <p><strong>Do not uninstall Level Up or clear app/browser storage while checking your data.</strong></p>
        </div>
        <div class="level-up-system-recovery-actions">
            <button type="button" class="primary-btn" data-system-recovery-restore>Review &amp; Restore Backup</button>
            <button type="button" class="secondary-btn" data-system-recovery-dismiss>Got it</button>
        </div>`;

    content.prepend(notice);
}

function removeNotice() {
    document.getElementById(NOTICE_ID)?.remove();
}

function hasValidSession() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session?.token) return false;
        return !session.expiresAt || Date.parse(session.expiresAt) > Date.now();
    }
    catch {
        return false;
    }
}

function openRestoreHistory() {
    const moreButton = document.querySelector('.bottom-nav .nav-btn[data-page="more"]');
    if (!moreButton) return;
    moreButton.click();

    waitFor(() => document.querySelector('[data-more-page="account-cloud"]'), 1500)
        .then(accountButton => {
            if (!accountButton) return;
            accountButton.click();
            return waitFor(() => document.getElementById("account-cloud-download"), 1500);
        })
        .then(restoreButton => restoreButton?.click())
        .catch(() => {});
}

function waitFor(getElement, timeoutMs) {
    return new Promise(resolve => {
        const started = Date.now();
        const check = () => {
            const element = getElement();
            if (element) return resolve(element);
            if (Date.now() - started >= timeoutMs) return resolve(null);
            window.setTimeout(check, 50);
        };
        check();
    });
}

function ensureStyles() {
    if (document.getElementById("level-up-system-recovery-notice-styles")) return;
    const style = document.createElement("style");
    style.id = "level-up-system-recovery-notice-styles";
    style.textContent = `
        .level-up-system-recovery-notice{margin:0 0 14px;border:1px solid color-mix(in srgb,var(--accent,#ef3348) 48%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent,#ef3348) 8%,transparent)}
        .level-up-system-recovery-copy h3{margin:5px 0 8px;color:var(--text,#fff);font-size:18px}
        .level-up-system-recovery-copy p{margin:0 0 8px;color:var(--muted,#a5a5aa);font-size:13px;line-height:1.5}
        .level-up-system-recovery-copy p:last-child{margin-bottom:0;color:var(--text,#fff)}
        .level-up-system-recovery-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;margin-top:14px}
        .level-up-system-recovery-actions button{min-height:44px}
        @media (max-width:520px){.level-up-system-recovery-actions{grid-template-columns:1fr}.level-up-system-recovery-actions .secondary-btn{width:100%}}
    `;
    document.head.appendChild(style);
}
