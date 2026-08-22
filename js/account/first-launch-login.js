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
        initializeEmailAuth();
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
            <p class="level-up-login-intro">Sign in to start using Level Up and begin tracking your training.</p>
            <div class="level-up-login-google" id="level-up-login-google"></div>
            <button class="level-up-login-provider level-up-login-email-open" id="level-up-login-email-open" type="button" aria-expanded="false" aria-controls="level-up-email-auth">
                <span>Continue with email</span><small>EMAIL</small>
            </button>
            <button class="level-up-login-provider" type="button" disabled><span>Apple</span><small>Coming soon</small></button>
            <form class="level-up-email-auth" id="level-up-email-auth" hidden novalidate>
                <div class="level-up-email-auth-header">
                    <button class="level-up-email-back" id="level-up-email-back" type="button" aria-label="Back to sign-in options">←</button>
                    <strong id="level-up-email-title">Sign in with email</strong>
                </div>
                <label>
                    <span>Email address</span>
                    <input id="level-up-email-address" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required>
                </label>
                <label>
                    <span>Password</span>
                    <input id="level-up-email-password" name="password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required>
                </label>
                <label class="level-up-email-confirm" id="level-up-email-confirm-row" hidden>
                    <span>Confirm password</span>
                    <input id="level-up-email-confirm" name="confirmPassword" type="password" autocomplete="new-password" minlength="10" maxlength="128">
                </label>
                <button class="level-up-email-submit" id="level-up-email-submit" type="submit">Sign in</button>
                <button class="level-up-email-mode" id="level-up-email-mode" type="button">New to Level Up? Create an account</button>
                <p class="level-up-email-help" id="level-up-email-help">Forgot your password? <a href="mailto:support@leveluphypertrophy.com">Contact Support</a>.</p>
            </form>
            <p class="level-up-login-message" id="level-up-login-message" aria-live="polite"></p>
            <p class="level-up-login-legal">Level Up is for adults 18+. Read our <a href="https://leveluphypertrophy.com/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> or contact <a href="mailto:support@leveluphypertrophy.com">Support</a>.</p>
        </main>
    </div>`;
}

function initializeEmailAuth() {
    const openButton = document.getElementById("level-up-login-email-open");
    const backButton = document.getElementById("level-up-email-back");
    const modeButton = document.getElementById("level-up-email-mode");
    const form = document.getElementById("level-up-email-auth");
    if (!openButton || !backButton || !modeButton || !form) return;

    openButton.addEventListener("click", () => {
        form.hidden = false;
        openButton.setAttribute("aria-expanded", "true");
        document.querySelector(".level-up-login-panel")?.classList.add("email-auth-open");
        setEmailMode("signin");
        setMessage("");
        requestAnimationFrame(() => document.getElementById("level-up-email-address")?.focus());
    });
    backButton.addEventListener("click", () => {
        form.hidden = true;
        openButton.setAttribute("aria-expanded", "false");
        document.querySelector(".level-up-login-panel")?.classList.remove("email-auth-open");
        form.reset();
        setMessage("");
    });
    modeButton.addEventListener("click", () => {
        setEmailMode(form.dataset.mode === "signup" ? "signin" : "signup");
        setMessage("");
    });
    form.addEventListener("submit", completeEmailLogin);
}

function setEmailMode(mode) {
    const form = document.getElementById("level-up-email-auth");
    const title = document.getElementById("level-up-email-title");
    const submit = document.getElementById("level-up-email-submit");
    const toggle = document.getElementById("level-up-email-mode");
    const confirmationRow = document.getElementById("level-up-email-confirm-row");
    const confirmation = document.getElementById("level-up-email-confirm");
    const password = document.getElementById("level-up-email-password");
    const help = document.getElementById("level-up-email-help");
    if (!form || !title || !submit || !toggle || !confirmationRow || !confirmation || !password || !help) return;

    const creating = mode === "signup";
    form.dataset.mode = creating ? "signup" : "signin";
    title.textContent = creating ? "Create your account" : "Sign in with email";
    submit.textContent = creating ? "Create account" : "Sign in";
    toggle.textContent = creating ? "Already have an account? Sign in" : "New to Level Up? Create an account";
    confirmationRow.hidden = !creating;
    confirmation.required = creating;
    password.autocomplete = creating ? "new-password" : "current-password";
    help.hidden = creating;
}

async function completeEmailLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = document.getElementById("level-up-email-address")?.value.trim() || "";
    const password = document.getElementById("level-up-email-password")?.value || "";
    const confirmation = document.getElementById("level-up-email-confirm")?.value || "";
    const creating = form.dataset.mode === "signup";
    const submit = document.getElementById("level-up-email-submit");

    if (!email) return setMessage("Enter your email address.", "error");
    if (password.length < 10) return setMessage("Password must be at least 10 characters.", "error");
    if (creating && password !== confirmation) return setMessage("Passwords do not match.", "error");

    try {
        if (submit) submit.disabled = true;
        setMessage(creating ? "Creating your Level Up account…" : "Signing in…");
        const endpoint = creating ? "/v1/account/email" : "/v1/session/email";
        const result = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        let payload = {};
        try { payload = await result.json(); } catch {}
        if (!result.ok || !payload?.token) throw new Error(payload.error || "Email sign-in could not be completed.");
        saveSession(payload);
        setMessage("Signed in. Opening Level Up…", "success");
        window.location.reload();
    }
    catch (error) {
        setMessage(error?.message || "Email sign-in could not be completed.", "error");
    }
    finally {
        if (submit) submit.disabled = false;
    }
}

function saveSession(payload) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: payload.token, expiresAt: payload.expiresAt }));
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(payload.user));
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
        saveSession(payload);
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
    link.href = "css/first-launch-login.css?v=email-login-1";
    link.dataset.levelUpLogin = "true";
    document.head.appendChild(link);
}
