const API_URL = "https://api.leveluphypertrophy.com";
const GOOGLE_CLIENT_ID = "969450620287-gh455asc7c3lh67j7llq6f55rdpla0j3.apps.googleusercontent.com";
const SESSION_KEY = "level_up_cloud_session";
const ACCOUNT_KEY = "level_up_cloud_account";
const RECOVERY_PARAMETER = "local-recovery";

initializeFirstLaunchLogin();

function initializeFirstLaunchLogin() {
    ensureStyles();
    if (hasValidSession() || isRecoveryLaunch()) return;
    document.documentElement.classList.add("level-up-login-required");
    const showGate = () => {
        if (document.getElementById("level-up-login-gate")) return;
        document.body.insertAdjacentHTML("afterbegin", renderGate());
        initializeGoogleButton();
    };
    if (document.body) showGate();
    else document.addEventListener("DOMContentLoaded", showGate, { once: true });
}

function renderGate() {
    return `<div class="level-up-login-gate" id="level-up-login-gate" role="dialog" aria-modal="true" aria-labelledby="level-up-login-title">
        <main class="level-up-login-panel">
            <img class="level-up-login-logo" src="assets/level-up-logo.svg" alt="Level Up">
            <span class="level-up-login-kicker">LEVEL UP BETA</span>
            <h1 id="level-up-login-title">Your training.<br><span>Your progress.</span></h1>
            <p class="level-up-login-intro">Sign in to protect your Level Up data, restore it on another device, and keep your beta account connected.</p>
            <div class="level-up-login-google" id="level-up-login-google"></div>
            <button class="level-up-login-provider" type="button" disabled><span>Email</span><small>Coming soon</small></button>
            <button class="level-up-login-provider" type="button" disabled><span>Apple</span><small>Coming soon</small></button>
            <p class="level-up-login-message" id="level-up-login-message" aria-live="polite">Your workout data stays on this device until cloud backup is enabled.</p>
            <p class="level-up-login-legal">By continuing, you agree to use Level Up as a beta service. You can export your data or delete your cloud account at any time.</p>
        </main>
    </div>`;
}

function initializeGoogleButton(attempt = 0) {
    const target = document.getElementById("level-up-login-google");
    if (!target || hasValidSession()) return;
    if (!window.google?.accounts?.id) {
        if (attempt < 40) {
            setTimeout(() => initializeGoogleButton(attempt + 1), 200);
            return;
        }
        setMessage("Google sign-in did not load. Check your connection and reopen Level Up.", "error");
        return;
    }
    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: completeGoogleLogin,
        auto_select: false,
        cancel_on_tap_outside: true
    });
    target.innerHTML = "";
    window.google.accounts.id.renderButton(target, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: Math.min(340, Math.max(240, target.clientWidth || 300))
    });
}

async function completeGoogleLogin(response) {
    try {
        setMessage("Connecting your Level Up account…");
        const result = await fetch(`${API_URL}/v1/session/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response?.credential })
        });
        let payload = {};
        try { payload = await result.json(); } catch {}
        if (!result.ok || !payload?.token) throw new Error(payload.error || "Google sign-in could not be completed.");
        localStorage.setItem(SESSION_KEY, JSON.stringify({ token: payload.token, expiresAt: payload.expiresAt }));
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(payload.user));
        setMessage("Signed in. Opening Level Up…", "success");
        window.location.reload();
    }
    catch (error) {
        setMessage(error?.message || "Google sign-in could not be completed.", "error");
    }
}

function hasValidSession() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session?.token) return false;
        return !session.expiresAt || Date.parse(session.expiresAt) > Date.now();
    }
    catch { return false; }
}

function isRecoveryLaunch() {
    return new URLSearchParams(window.location.search).get(RECOVERY_PARAMETER) === "1";
}

function setMessage(message, status = "") {
    const element = document.getElementById("level-up-login-message");
    if (!element) return;
    element.textContent = message;
    element.dataset.status = status;
}

function ensureStyles() {
    if (document.querySelector('link[data-level-up-login]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/first-launch-login.css?v=first-login-1";
    link.dataset.levelUpLogin = "true";
    document.head.appendChild(link);
}
