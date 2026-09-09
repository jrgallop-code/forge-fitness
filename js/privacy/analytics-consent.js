const CONSENT_KEY = "level_up_analytics_consent";
const SESSION_KEY = "level_up_cloud_session";
const GUEST_MODE_KEY = "level_up_guest_mode";
const OPTIONAL_ANALYTICS_KEYS = [
    "level_up_acquisition_first_touch",
    "level_up_acquisition_reported",
    "level_up_product_event_queue",
    "level_up_acquisition_submitted",
    "level_up_food_usage_reconciled_v1",
    "level_up_workout_usage_reconciled_v1",
    "level_up_product_state_snapshot_v1",
    "level_up_program_analytics_reconcile_v1"
];

export function analyticsAllowed() {
    return localStorage.getItem(CONSENT_KEY) === "granted";
}

export function analyticsConsentChoice() {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unset";
}

export function setAnalyticsConsent(allowed) {
    const choice = allowed ? "granted" : "denied";
    localStorage.setItem(CONSENT_KEY, choice);
    if (!allowed) OPTIONAL_ANALYTICS_KEYS.forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent("levelup:analytics-consent-changed", {
        detail: { allowed }
    }));
    return choice;
}

export function clearAnalyticsConsent() {
    localStorage.removeItem(CONSENT_KEY);
    OPTIONAL_ANALYTICS_KEYS.forEach(key => localStorage.removeItem(key));
}

export function initializeAnalyticsConsentPrompt() {
    ensureConsentStyles();
    if (!hasSignedInSession() || localStorage.getItem(GUEST_MODE_KEY) === "1") return;
    if (analyticsConsentChoice() !== "unset" || document.getElementById("level-up-analytics-consent")) return;
    const show = () => {
        if (!document.body || document.getElementById("level-up-analytics-consent")) return;
        document.body.insertAdjacentHTML("beforeend", consentMarkup());
        document.getElementById("level-up-analytics-allow")?.addEventListener("click", () => finishChoice(true));
        document.getElementById("level-up-analytics-decline")?.addEventListener("click", () => finishChoice(false));
    };
    if (document.body) show();
    else document.addEventListener("DOMContentLoaded", show, { once: true });
}

function ensureConsentStyles() {
    if (document.querySelector('link[data-level-up-analytics-consent]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/analytics-consent.css?v=app-review-privacy-1";
    link.dataset.levelUpAnalyticsConsent = "true";
    document.head.appendChild(link);
}

function hasSignedInSession() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        return Boolean(session?.token && (!session.expiresAt || Date.parse(session.expiresAt) > Date.now()));
    } catch {
        return false;
    }
}

function finishChoice(allowed) {
    setAnalyticsConsent(allowed);
    document.getElementById("level-up-analytics-consent")?.remove();
    document.documentElement.classList.remove("level-up-consent-open");
}

function consentMarkup() {
    document.documentElement.classList.add("level-up-consent-open");
    return `<div class="analytics-consent-overlay" id="level-up-analytics-consent" role="dialog" aria-modal="true" aria-labelledby="analytics-consent-title">
        <section class="analytics-consent-card">
            <span class="eyebrow">YOUR PRIVACY</span>
            <h2 id="analytics-consent-title">Help improve Level Up?</h2>
            <p>Optional analytics can link app activity to your Level Up account, including active days, completed-workout details, food-logging events, selected appearance, program use and acquisition source.</p>
            <p>Your entered foods, weight values, measurements and photos are not sent as analytics. Cloud backup is controlled separately.</p>
            <div class="analytics-consent-actions">
                <button class="primary-btn" id="level-up-analytics-allow" type="button">Share Optional Analytics</button>
                <button class="secondary-btn" id="level-up-analytics-decline" type="button">No Thanks</button>
            </div>
            <a href="privacy.html">Read the Privacy Policy</a>
        </section>
    </div>`;
}

window.addEventListener("levelup:cloud-session-started", initializeAnalyticsConsentPrompt);
initializeAnalyticsConsentPrompt();
