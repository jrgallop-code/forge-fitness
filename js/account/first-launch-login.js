import "../core/native-capabilities.js?v=interactive-live-activity-1";
import "../privacy/analytics-consent.js?v=app-review-privacy-1";
import { clearLocalAppData, restoreBackupSnapshot, verifyBackupSnapshot } from "../core/backup-manager.js?v=account-isolation-1";

const API_URL = "https://api.leveluphypertrophy.com";
const GOOGLE_CLIENT_ID = "969450620287-gh455asc7c3lh67j7llq6f55rdpla0j3.apps.googleusercontent.com";
const SESSION_KEY = "level_up_cloud_session";
const ACCOUNT_KEY = "level_up_cloud_account";
const GUEST_MODE_KEY = "level_up_guest_mode";
const RECOVERY_PARAMETER = "local-recovery";

initializeFirstLaunchLogin();

function initializeFirstLaunchLogin() {
    ensureStyles();
    if (hasValidSession() || isGuestMode() || isRecoveryLaunch()) return;
    document.documentElement.classList.add("level-up-login-required");
    const showGate = () => {
        if (document.getElementById("level-up-login-gate")) return;
        document.body.insertAdjacentHTML("afterbegin", renderGate());
        initializeGoogleButton();
        initializeNativeProviders();
        initializeEmailAuth();
        initializeTransferAuth();
        document.getElementById("level-up-login-guest")?.addEventListener("click", continueWithoutAccount);
    };
    if (document.body) showGate();
    else document.addEventListener("DOMContentLoaded", showGate, { once: true });
}

function renderGate() {
    const nativeIOS = isNativeIOS();
    return `<div class="level-up-login-gate" id="level-up-login-gate" role="dialog" aria-modal="true" aria-labelledby="level-up-login-title">
        <main class="level-up-login-panel">
            <img class="level-up-login-logo" src="assets/level-up-logo.svg" alt="Level Up">
            <span class="level-up-login-kicker">LEVEL UP</span>
            <h1 id="level-up-login-title">Your training.<br><span>Your progress.</span></h1>
            <p class="level-up-login-intro">Sign in for private cloud backup, or continue locally without an account.</p>
            ${nativeIOS ? `<button class="level-up-login-provider level-up-login-apple" id="level-up-login-apple" type="button"><span>Continue with Apple</span><small></small></button>
            <button class="level-up-login-provider level-up-login-google-native" id="level-up-login-google-native" type="button"><span>Continue with Google</span><small>G</small></button>` : '<div class="level-up-login-google" id="level-up-login-google"></div>'}
            <button class="level-up-login-provider level-up-login-email-open" id="level-up-login-email-open" type="button" aria-expanded="false" aria-controls="level-up-email-auth">
                <span>Continue with email</span><small>EMAIL</small>
            </button>
            <button class="level-up-login-provider level-up-login-guest" id="level-up-login-guest" type="button">
                <span>Continue without an account</span><small>LOCAL</small>
            </button>
            ${nativeIOS ? '<button class="level-up-login-provider level-up-login-transfer-open" id="level-up-login-transfer-open" type="button" aria-expanded="false" aria-controls="level-up-transfer-auth"><span>Already use Level Up on the web?</span><small>TRANSFER</small></button>' : ""}
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
            ${nativeIOS ? `<form class="level-up-email-auth level-up-transfer-auth" id="level-up-transfer-auth" hidden novalidate>
                <div class="level-up-email-auth-header">
                    <button class="level-up-email-back" id="level-up-transfer-back" type="button" aria-label="Back to sign-in options">←</button>
                    <strong>Move your web account</strong>
                </div>
                <p>On the Level Up website, open <strong>More → Account & Cloud</strong> and generate a transfer code.</p>
                <label><span>One-time transfer code</span><input id="level-up-transfer-code" name="code" type="text" inputmode="text" autocomplete="one-time-code" autocapitalize="characters" maxlength="9" placeholder="ABCD-EFGH" required></label>
                <button class="level-up-email-submit" id="level-up-transfer-submit" type="submit">Connect Existing Account</button>
            </form>` : ""}
            <p class="level-up-login-message" id="level-up-login-message" aria-live="polite"></p>
            <p class="level-up-login-legal">Level Up is for adults 18+. Read our <a href="https://leveluphypertrophy.com/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> or contact <a href="mailto:support@leveluphypertrophy.com">Support</a>.</p>
        </main>
    </div>`;
}

function isNativeIOS() {
    return window.Capacitor?.getPlatform?.() === "ios";
}

function initializeNativeProviders() {
    if (!isNativeIOS()) return;
    document.getElementById("level-up-login-apple")?.addEventListener("click", completeAppleLogin);
    document.getElementById("level-up-login-google-native")?.addEventListener("click", openNativeGoogleLogin);
    try {
        void window.Capacitor?.Plugins?.App?.addListener?.("appUrlOpen", async event => {
            const url = new URL(event?.url || "");
            if (url.protocol !== "leveluphypertrophy:" || url.hostname !== "auth") return;
            const code = url.searchParams.get("code") || "";
            await window.Capacitor?.Plugins?.Browser?.close?.();
            if (code) {
                try { await redeemTransferCode(code, "Google account connected. Restoring your data…"); }
                catch (error) { setMessage(error?.message || "Google sign-in could not be completed.", "error"); }
            }
            else setMessage(url.searchParams.get("error") || "Google sign-in could not be completed.", "error");
        });
    } catch {}
}

async function openNativeGoogleLogin() {
    setMessage("Opening secure Google sign-in…");
    try {
        await window.Capacitor?.Plugins?.Browser?.open?.({
            url: "https://app.leveluphypertrophy.com/ios-auth.html",
            presentationStyle: "popover"
        });
    } catch { setMessage("Google sign-in could not be opened.", "error"); }
}

async function completeAppleLogin() {
    const button = document.getElementById("level-up-login-apple");
    try {
        if (button) button.disabled = true;
        setMessage("Connecting securely with Apple…");
        const credential = await window.Capacitor?.Plugins?.LevelUpNativeAuth?.signInWithApple?.();
        if (!credential?.identityToken || !credential?.nonce) throw new Error("Apple sign-in is not available in this build.");
        const response = await fetch(`${API_URL}/v1/session/apple`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credential)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.token) throw new Error(payload.error || "Apple sign-in could not be completed.");
        await restoreNativeAccountBackup(payload.token);
        saveSession(payload);
        setMessage("Signed in with Apple. Opening Level Up…", "success");
        window.location.reload();
    } catch (error) { setMessage(error?.message || "Apple sign-in could not be completed.", "error"); }
    finally { if (button) button.disabled = false; }
}

async function redeemTransferCode(code, message = "Connecting your existing account…") {
    setMessage(message);
    const result = await fetch(`${API_URL}/v1/session/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
    });
    const payload = await result.json().catch(() => ({}));
    if (!result.ok || !payload?.token) throw new Error(payload.error || "This account could not be connected.");
    await restoreNativeAccountBackup(payload.token);
    saveSession(payload);
    window.location.reload();
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

function initializeTransferAuth() {
    const openButton = document.getElementById("level-up-login-transfer-open");
    const backButton = document.getElementById("level-up-transfer-back");
    const form = document.getElementById("level-up-transfer-auth");
    const input = document.getElementById("level-up-transfer-code");
    if (!openButton || !backButton || !form || !input) return;
    openButton.addEventListener("click", () => {
        document.getElementById("level-up-email-auth")?.setAttribute("hidden", "");
        form.hidden = false;
        document.querySelector(".level-up-login-panel")?.classList.add("email-auth-open");
        setMessage("");
        requestAnimationFrame(() => input.focus());
    });
    backButton.addEventListener("click", () => {
        form.hidden = true;
        form.reset();
        document.querySelector(".level-up-login-panel")?.classList.remove("email-auth-open");
        setMessage("");
    });
    input.addEventListener("input", () => {
        const raw = input.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 8);
        input.value = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
    });
    form.addEventListener("submit", completeTransferLogin);
}

async function completeTransferLogin(event) {
    event.preventDefault();
    const code = document.getElementById("level-up-transfer-code")?.value.trim() || "";
    const submit = document.getElementById("level-up-transfer-submit");
    if (code.replace(/[^A-Z2-9]/gi, "").length !== 8) return setMessage("Enter the complete transfer code.", "error");
    try {
        if (submit) submit.disabled = true;
        setMessage("Connecting your existing account…");
        await redeemTransferCode(code, "Account connected. Restoring your Level Up data…");
    }
    catch (error) { setMessage(error?.message || "This account could not be transferred.", "error"); }
    finally { if (submit) submit.disabled = false; }
}

async function restoreNativeAccountBackup(token) {
    if (!isNativeIOS()) return false;
    const response = await fetch(`${API_URL}/v1/backup`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 404) return false;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.backup) {
        throw new Error(payload.error || "Your account data could not be loaded.");
    }
    verifyBackupSnapshot(payload.backup);
    await clearLocalAppData({ preserveDevicePreferences: true });
    await restoreBackupSnapshot(payload.backup, { removeNullValues: true });
    localStorage.setItem("level_up_cloud_last_sync", JSON.stringify({
        direction: "download",
        updatedAt: payload.updatedAt,
        version: payload.version,
        completedAt: new Date().toISOString()
    }));
    return true;
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
        await restoreNativeAccountBackup(payload.token);
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
    localStorage.removeItem(GUEST_MODE_KEY);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: payload.token, expiresAt: payload.expiresAt }));
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(payload.user));
}

function continueWithoutAccount() {
    localStorage.setItem(GUEST_MODE_KEY, "1");
    document.documentElement.classList.remove("level-up-login-required");
    document.getElementById("level-up-login-gate")?.remove();
    window.location.reload();
}

function isGuestMode() {
    return localStorage.getItem(GUEST_MODE_KEY) === "1";
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
        await restoreNativeAccountBackup(payload.token);
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
    link.href = "css/first-launch-login.css?v=app-review-login-1";
    link.dataset.levelUpLogin = "true";
    document.head.appendChild(link);
}
