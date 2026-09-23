const VIEW_KEY = "level_up_whats_new_ios_launch_2026_09_views";
const TRAINING_PREFERENCES_KEY = "level_up_training_preferences";
const APP_STORE_URL = "https://apps.apple.com/ca/app/level-up-workout-nutrition/id6810024008";
const MAX_VIEWS = 1;
let memoryViews = 0;

function isNativeIOS() {
    return window.Capacitor?.getPlatform?.() === "ios";
}

function getStoredViews() {
    try {
        const stored = Number.parseInt(localStorage.getItem(VIEW_KEY) || "0", 10);
        return Number.isFinite(stored) ? Math.max(memoryViews, stored) : memoryViews;
    } catch {
        return memoryViews;
    }
}

function storeViews(views) {
    memoryViews = views;
    try {
        localStorage.setItem(VIEW_KEY, String(views));
    } catch {
        // The in-memory fallback still prevents repeated displays in this session.
    }
}

function isOnboarded() {
    try {
        const preferences = JSON.parse(localStorage.getItem(TRAINING_PREFERENCES_KEY) || "null");
        return Boolean(preferences?.onboardingComplete || preferences?.onboardingSkipped);
    } catch {
        return false;
    }
}

export function openWhatsNew() {
    if (isNativeIOS()) return false;
    if (document.querySelector(".whats-new-overlay")) return true;

    const overlay = document.createElement("section");
    overlay.className = "whats-new-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "whats-new-title");
    overlay.innerHTML = `
        <div class="whats-new-shell">
            <button class="whats-new-close" type="button" data-whats-new-close aria-label="Close What's New">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
            <header class="whats-new-hero">
                <span class="eyebrow">LEVEL UP · WHAT'S NEW</span>
                <h2 id="whats-new-title">Level Up is now on iPhone.</h2>
                <p>Keep using the web app, or move to the iOS app and bring your workout, weight, nutrition and other saved data with you.</p>
                <a class="primary-btn whats-new-store-link" href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer">Get the iOS app ↗</a>
            </header>
            <section class="whats-new-transfer" aria-labelledby="whats-new-transfer-title">
                <span class="eyebrow">MOVE YOUR DATA SAFELY</span>
                <h3 id="whats-new-transfer-title">How to switch to the iPhone app</h3>
                <ol class="whats-new-steps">
                    <li><strong>Save a backup on the web.</strong> Open <b>More → Exports &amp; Backup → Export Backup</b> and keep the downloaded JSON file. Then open <b>More → Account &amp; Cloud</b>. Sign in with Google if you use Level Up locally, and make sure your existing data is still visible.</li>
                    <li><strong>Upload your current data.</strong> In <b>Account &amp; Cloud</b>, tap <b>Back Up Now</b>. Wait for confirmation and check that the cloud backup shows an updated date. Do this after your last web entry so the iPhone receives the latest copy.</li>
                    <li><strong>Connect the iPhone app.</strong> In the same web page, tap <b>Generate Transfer Code</b>. Open the iOS app and select <b>Already use Level Up on the web?</b> on its sign-in screen. Enter the one-time code within 10 minutes; the app will connect your account and restore its cloud backup.</li>
                    <li><strong>Check before moving on.</strong> In the iOS app, confirm your recent workouts, weight entries, nutrition log and plans are present. Keep the web app and exported backup until everything looks right. If anything is missing, return to <b>Account &amp; Cloud</b> on the web before making new iOS entries.</li>
                </ol>
                <p class="whats-new-safety">The transfer code connects your account; <b>Back Up Now</b> copies your web data. Generating a code alone does not upload unsynced entries.</p>
            </section>
            <footer class="whats-new-footer">
                <p>This guide stays in <b>More → iPhone app &amp; transfer</b> whenever you need it.</p>
                <button class="primary-btn whats-new-done" type="button" data-whats-new-close>Got it</button>
            </footer>
        </div>`;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.appendChild(overlay);

    const close = () => {
        if (!overlay.isConnected) return;
        document.removeEventListener("keydown", onKeydown);
        overlay.remove();
        document.body.style.overflow = previousOverflow;
    };
    const onKeydown = event => {
        if (event.key === "Escape") close();
    };

    overlay.querySelectorAll("[data-whats-new-close]").forEach(button => button.addEventListener("click", close));
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeydown);
    requestAnimationFrame(() => overlay.querySelector(".whats-new-close")?.focus());
    return true;
}

export function showWhatsNewIfEligible() {
    if (isNativeIOS() || !isOnboarded()) return false;
    if (document.querySelector(".whats-new-overlay")) return true;
    if (getStoredViews() >= MAX_VIEWS) return false;
    const opened = openWhatsNew();
    if (opened) storeViews(MAX_VIEWS);
    return opened;
}

export { VIEW_KEY, MAX_VIEWS };
