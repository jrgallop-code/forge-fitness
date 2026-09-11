import {
    createBackupSnapshot,
    restoreBackupSnapshot,
    verifyBackupSnapshot
} from "../core/backup-manager.js?v=backup-complete-7";
import {
    analyticsAllowed,
    clearAnalyticsConsent,
    setAnalyticsConsent
} from "../privacy/analytics-consent.js?v=app-review-privacy-1";

const API_URL = "https://api.leveluphypertrophy.com";
const GOOGLE_CLIENT_ID = "969450620287-gh455asc7c3lh67j7llq6f55rdpla0j3.apps.googleusercontent.com";
const SESSION_KEY = "level_up_cloud_session";
const ACCOUNT_KEY = "level_up_cloud_account";
const LAST_SYNC_KEY = "level_up_cloud_last_sync";
const AUTO_STATE_KEY = "level_up_cloud_auto_backup_state";
const GUEST_MODE_KEY = "level_up_guest_mode";

ensureAccountCloudStyles();

export function renderAccountCloud() {
    const nativeIOS = isNativeIOS();
    return `<section class="dashboard-welcome account-cloud-heading"><div><button class="nutrition-planner-back" id="account-cloud-back" type="button">← More</button><span class="eyebrow">ACCOUNT &amp; PRIVACY</span><h2>Account & Cloud</h2><p>Keep a private automatic Level Up backup available across your devices.</p></div></section>
    <section class="section-card account-cloud-card">
        <div class="account-cloud-profile" id="account-cloud-profile">
            <div><span class="eyebrow">ACCOUNT</span><h3 id="account-cloud-name">Using without an account</h3><p id="account-cloud-email">Your data is stored locally on this device.</p></div>
            <span class="account-cloud-badge" id="account-cloud-badge">LOCAL ONLY</span>
        </div>
        ${nativeIOS ? "" : '<div id="account-google-button" class="account-google-button"></div>'}
        <button class="secondary-btn account-cloud-open-login" id="account-cloud-open-login" type="button">Sign In or Create an Account</button>
        <div class="account-cloud-actions" id="account-cloud-actions" hidden>
            <button class="primary-btn" id="account-cloud-upload" type="button">↑ Back Up Now</button>
            <button class="secondary-btn" id="account-cloud-download" type="button">↓ Download to This Device</button>
            <button class="text-btn" id="account-cloud-signout" type="button">Sign Out</button>
        </div>
        <div class="account-cloud-status" aria-live="polite">
            <strong id="account-cloud-state">No cloud backup connected.</strong>
            <span id="account-cloud-updated">Your current data remains stored on this device.</span>
        </div>
    </section>
    <section class="section-card account-cloud-privacy">
        <span class="eyebrow">PRIVACY</span><h3>Optional analytics</h3>
        <p>Choose whether Level Up may send account-linked app activity such as active days, completed-workout details, food-logging events, appearance and program use. Entered foods, weight values, measurements and photos are not sent as analytics.</p>
        <div class="account-analytics-choice">
            <label><input id="account-analytics-consent" type="checkbox"><span>Share optional analytics<small id="account-analytics-status">Off while using Level Up without an account.</small></span></label>
        </div>
    </section>
    <section class="section-card account-cloud-transfer" id="account-cloud-transfer-section" hidden>
        <span class="eyebrow">MOVE TO IPHONE APP</span><h3>Already use Level Up on the web?</h3>
        <p>Generate a secure one-time code, then enter it on the iPhone app's sign-in screen. Your existing account and cloud backup stay together.</p>
        <button class="primary-btn" id="account-cloud-transfer-create" type="button">Generate Transfer Code</button>
        <div class="account-cloud-transfer-code" id="account-cloud-transfer-code" hidden>
            <small>ONE-TIME CODE</small>
            <strong id="account-cloud-transfer-value"></strong>
            <span>Expires in 10 minutes and can only be used once.</span>
            <button class="secondary-btn" id="account-cloud-transfer-copy" type="button">Copy Code</button>
        </div>
        <p class="account-cloud-transfer-message" id="account-cloud-transfer-message" aria-live="polite"></p>
    </section>
    <section class="section-card account-cloud-safety">
        <span class="eyebrow">BACKUP SAFETY</span><h3>Automatic backup with version protection</h3>
        <p>Level Up backs up signed-in app data after changes. If another device has a newer cloud version, automatic upload pauses instead of overwriting it. You can still back up or restore manually here.</p>\n        <div class="account-cloud-links"><a href="privacy.html">Privacy Policy</a><a href="mailto:support@leveluphypertrophy.com">Contact Support</a></div>
    </section>
    <section class="section-card account-cloud-delete" id="account-cloud-delete-section" hidden>
        <span class="eyebrow">ACCOUNT CONTROL</span><h3>Delete cloud account</h3>
        <p>This permanently removes your Level Up account and its cloud backup. Data currently stored on this device is not deleted.</p>
        <button class="text-btn danger-text-btn" id="account-cloud-delete" type="button">Delete Cloud Account</button>
    </section>`;
}

function isNativeIOS() {
    return window.Capacitor?.getPlatform?.() === "ios";
}

export function initializeAccountCloud({ onBack } = {}) {
    document.getElementById("account-cloud-back")?.addEventListener("click", () => onBack?.());
    document.getElementById("account-cloud-upload")?.addEventListener("click", uploadBackup);
    document.getElementById("account-cloud-download")?.addEventListener("click", downloadBackup);
    document.getElementById("account-cloud-signout")?.addEventListener("click", signOut);
    document.getElementById("account-cloud-delete")?.addEventListener("click", deleteAccount);
    document.getElementById("account-cloud-transfer-create")?.addEventListener("click", createTransferCode);
    document.getElementById("account-cloud-transfer-copy")?.addEventListener("click", copyTransferCode);
    document.getElementById("account-cloud-open-login")?.addEventListener("click", openAccountLogin);
    document.getElementById("account-analytics-consent")?.addEventListener("change", updateAnalyticsChoice);
    renderSession();
    if (getSession()?.token) refreshAccount();
    else initializeGoogleButton();
}

function initializeGoogleButton(attempt = 0) {
    const target = document.getElementById("account-google-button");
    if (!target || getSession()?.token) return;
    if (!window.google?.accounts?.id) {
        if (attempt < 30) setTimeout(() => initializeGoogleButton(attempt + 1), 200);
        else setMessage("Google sign-in did not load. Check your connection and reopen this page.", "error");
        return;
    }
    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true
    });
    target.innerHTML = "";
    window.google.accounts.id.renderButton(target, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: Math.min(320, Math.max(220, target.clientWidth || 280))
    });
}

async function handleGoogleCredential(response) {
    try {
        setMessage("Verifying your Google account…");
        const session = await api("/v1/session/google", {
            method: "POST",
            auth: false,
            body: { credential: response?.credential }
        });
        localStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, expiresAt: session.expiresAt }));
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(session.user));
        localStorage.removeItem(GUEST_MODE_KEY);
        window.dispatchEvent(new CustomEvent("levelup:cloud-session-started"));
        renderSession();
        await refreshAccount();
        setMessage("Signed in. Automatic backup is preparing your device data.", "success");
    }
    catch (error) {
        setMessage(error.message, "error");
        initializeGoogleButton();
    }
}

async function refreshAccount() {
    try {
        const [{ user }, meta] = await Promise.all([api("/v1/me"), api("/v1/backup/meta")]);
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(user));
        renderSession();
        renderRemoteMeta(meta.backup);
    }
    catch (error) {
        if (error.status === 401) clearSession();
        setMessage(error.message, "error");
    }
}

async function uploadBackup() {
    const button = document.getElementById("account-cloud-upload");
    try {
        setBusy(button, true, "Preparing complete backup…");
        const meta = await api("/v1/backup/meta");
        const remote = meta.backup;
        const prompt = remote
            ? `Replace cloud backup version ${remote.version}, last updated ${formatDate(remote.updated_at)}, with all data currently on this device?`
            : "Upload all Level Up data currently on this device as your first cloud backup?";
        if (!window.confirm(prompt)) return setMessage("Cloud upload cancelled.");
        const backup = await createBackupSnapshot();
        verifyBackupSnapshot(backup);
        const result = await api("/v1/backup", {
            method: "PUT",
            body: { backup, expectedVersion: remote ? Number(remote.version) : null }
        });
        saveLastSync("upload", result.updatedAt, result.version);
        renderRemoteMeta({ version: result.version, byte_size: result.byteSize, updated_at: result.updatedAt });
        setMessage(`Cloud backup version ${result.version} uploaded successfully.`, "success");
    }
    catch (error) { setMessage(error.message, "error"); }
    finally { setBusy(button, false); }
}

async function downloadBackup() {
    const button = document.getElementById("account-cloud-download");
    try {
        setBusy(button, true, "Downloading cloud backup…");
        const result = await api("/v1/backup");
        verifyBackupSnapshot(result.backup);
        if (!window.confirm(`Restore cloud backup version ${result.version} from ${formatDate(result.updatedAt)}?\n\nIncluded local sections on this device will be replaced.`)) {
            return setMessage("Cloud download cancelled.");
        }
        await restoreBackupSnapshot(result.backup, { removeNullValues: true });
        saveLastSync("download", result.updatedAt, result.version);
        window.alert("Cloud backup restored successfully. Level Up will reload now.");
        window.location.reload();
    }
    catch (error) { setMessage(error.message, "error"); }
    finally { setBusy(button, false); }
}

async function signOut() {
    const revokeRequest = api("/v1/session", { method: "DELETE" })
        .catch(error => console.warn("Cloud sign-out request failed:", error));

    if (isNativeIOS()) {
        clearSession({ requireLogin: true });
        void revokeRequest;
        window.location.reload();
        return;
    }

    await revokeRequest;
    clearSession();
    setMessage("Signed out. Data on this device remains available.");
}

async function deleteAccount() {
    if (!window.confirm("Permanently delete your Level Up cloud account and cloud backup?\n\nData stored on this device will remain here.")) return;
    if (!window.confirm("This cannot be undone. Delete the cloud account now?")) return;
    try {
        await api("/v1/account", { method: "DELETE" });
        clearAnalyticsConsent();
        clearSession();
        setMessage("Cloud account deleted. Local device data was not removed.", "success");
    }
    catch (error) { setMessage(error.message, "error"); }
}

function openAccountLogin() {
    localStorage.removeItem(GUEST_MODE_KEY);
    window.location.reload();
}

function updateAnalyticsChoice(event) {
    const allowed = Boolean(event.currentTarget?.checked);
    setAnalyticsConsent(allowed);
    renderAnalyticsChoice(Boolean(getSession()?.token));
}

async function createTransferCode() {
    const button = document.getElementById("account-cloud-transfer-create");
    try {
        setBusy(button, true, "Generating code…");
        const result = await api("/v1/account/transfer-code", { method: "POST" });
        const code = String(result?.code || "");
        if (!code) throw new Error("A transfer code could not be generated.");
        const panel = document.getElementById("account-cloud-transfer-code");
        if (panel) panel.hidden = false;
        setText("account-cloud-transfer-value", code);
        setTransferMessage("Open the Level Up iPhone app and choose ‘Already use Level Up on the web?’", "success");
    }
    catch (error) { setTransferMessage(error.message, "error"); }
    finally { setBusy(button, false); }
}

async function copyTransferCode() {
    const code = document.getElementById("account-cloud-transfer-value")?.textContent?.trim() || "";
    if (!code) return;
    try {
        await navigator.clipboard.writeText(code);
        setTransferMessage("Transfer code copied.", "success");
    }
    catch { setTransferMessage("Press and hold the code to copy it.", "error"); }
}

function renderSession() {
    const session = getSession();
    const account = readJson(ACCOUNT_KEY);
    const signedIn = Boolean(session?.token && account?.email);
    document.getElementById("account-cloud-actions")?.toggleAttribute("hidden", !signedIn);
    document.getElementById("account-cloud-delete-section")?.toggleAttribute("hidden", !signedIn);
    document.getElementById("account-cloud-transfer-section")?.toggleAttribute("hidden", !signedIn || isNativeIOS());
    const googleButton = document.getElementById("account-google-button");
    if (googleButton) googleButton.hidden = signedIn;
    document.getElementById("account-cloud-open-login")?.toggleAttribute("hidden", signedIn);
    setText("account-cloud-name", signedIn ? account.name || "Level Up Member" : "Using without an account");
    setText("account-cloud-email", signedIn
        ? account.email
        : "Sign in or create an account to activate private cloud backup.");
    const autoState = readJson(AUTO_STATE_KEY);
    const needsAttention = autoState?.status === "newer-cloud-backup";
    setText("account-cloud-badge", signedIn ? needsAttention ? "ACTION NEEDED" : "AUTO BACKUP" : "LOCAL ONLY");
    renderAnalyticsChoice(signedIn);
}

function renderAnalyticsChoice(signedIn) {
    const checkbox = document.getElementById("account-analytics-consent");
    if (checkbox) {
        checkbox.checked = signedIn && analyticsAllowed();
        checkbox.disabled = !signedIn;
    }
    setText("account-analytics-status", signedIn
        ? analyticsAllowed()
            ? "On. You can turn this off at any time."
            : "Off. Core features and cloud backup still work."
        : "Off while using Level Up without an account.");
}

function renderRemoteMeta(remote) {
    if (!remote) {
        setMessage("Signed in. Your first automatic backup is being prepared.");
        setText("account-cloud-updated", "You can also use Back Up Now at any time.");
        return;
    }
    const autoState = readJson(AUTO_STATE_KEY);
    if (autoState?.status === "newer-cloud-backup") {
        setMessage("A newer cloud backup is available. Automatic upload is paused.");
        setText("account-cloud-updated", "Download the newer copy, or use Back Up Now after confirming this device should replace it.");
        return;
    }
    setText("account-cloud-state", `Automatic cloud backup version ${remote.version} is available.`);
    setText("account-cloud-updated", `Updated ${formatDate(remote.updated_at)} · ${formatBytes(remote.byte_size)}`);
}

async function api(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
        const token = getSession()?.token;
        if (!token) throw Object.assign(new Error("Sign in required."), { status: 401 });
        headers.Authorization = `Bearer ${token}`;
    }
    let response;
    try {
        response = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    }
    catch { throw new Error("Level Up cloud could not be reached. Check your connection and try again."); }
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw Object.assign(new Error(payload.error || "Cloud request failed."), { status: response.status });
    return payload;
}

function getSession() {
    const session = readJson(SESSION_KEY);
    if (!session?.token || (session.expiresAt && Date.parse(session.expiresAt) <= Date.now())) return null;
    return session;
}

function clearSession({ requireLogin = false } = {}) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    clearAnalyticsConsent();
    if (requireLogin) localStorage.removeItem(GUEST_MODE_KEY);
    else localStorage.setItem(GUEST_MODE_KEY, "1");
    renderSession();
    initializeGoogleButton();
}

function saveLastSync(direction, updatedAt, version) {
    const completedAt = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ direction, updatedAt, version, completedAt }));
    localStorage.setItem(AUTO_STATE_KEY, JSON.stringify({
        ...readJson(AUTO_STATE_KEY),
        version: Number(version),
        updatedAt,
        completedAt,
        status: "synced"
    }));
    window.dispatchEvent(new CustomEvent("levelup:cloud-sync-complete", {
        detail: { direction, updatedAt, version, completedAt }
    }));
}

function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
}

function setMessage(message, type = "") {
    setText("account-cloud-state", message);
    const element = document.getElementById("account-cloud-state");
    if (element) element.dataset.status = type;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setTransferMessage(message, type = "") {
    const element = document.getElementById("account-cloud-transfer-message");
    if (!element) return;
    element.textContent = message;
    element.dataset.status = type;
}

function setBusy(button, busy, label = "") {
    if (!button) return;
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? label : button.dataset.defaultLabel;
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "an unknown time" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) return "size unavailable";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ensureAccountCloudStyles() {
    if (document.querySelector('link[data-level-up-account-cloud]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/account-cloud.css?v=account-transfer-1";
    link.dataset.levelUpAccountCloud = "true";
    document.head.appendChild(link);
}
