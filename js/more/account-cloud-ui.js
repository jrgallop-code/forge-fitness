import {
    createBackupSnapshot,
    restoreBackupSnapshot,
    verifyBackupSnapshot
} from "../core/backup-manager.js?v=backup-complete-6";

const API_URL = "https://api.leveluphypertrophy.com";
const GOOGLE_CLIENT_ID = "969450620287-gh455asc7c3lh67j7llq6f55rdpla0j3.apps.googleusercontent.com";
const SESSION_KEY = "level_up_cloud_session";
const ACCOUNT_KEY = "level_up_cloud_account";
const LAST_SYNC_KEY = "level_up_cloud_last_sync";

ensureAccountCloudStyles();

export function renderAccountCloud() {
    return `<section class="dashboard-welcome account-cloud-heading"><div><button class="nutrition-planner-back" id="account-cloud-back" type="button">← More</button><span class="eyebrow">BETA ACCOUNT</span><h2>Account & Cloud</h2><p>Keep a private Level Up backup available across your devices.</p></div></section>
    <section class="section-card account-cloud-card">
        <div class="account-cloud-profile" id="account-cloud-profile">
            <div><span class="eyebrow">ACCOUNT</span><h3 id="account-cloud-name">Not signed in</h3><p id="account-cloud-email">Sign in with Google to activate beta cloud storage.</p></div>
            <span class="account-cloud-badge" id="account-cloud-badge">LOCAL ONLY</span>
        </div>
        <div id="account-google-button" class="account-google-button"></div>
        <div class="account-cloud-actions" id="account-cloud-actions" hidden>
            <button class="primary-btn" id="account-cloud-upload" type="button">↑ Upload This Device</button>
            <button class="secondary-btn" id="account-cloud-download" type="button">↓ Download to This Device</button>
            <button class="text-btn" id="account-cloud-signout" type="button">Sign Out</button>
        </div>
        <div class="account-cloud-status" aria-live="polite">
            <strong id="account-cloud-state">No cloud backup connected.</strong>
            <span id="account-cloud-updated">Your current data remains stored on this device.</span>
        </div>
    </section>
    <section class="section-card account-cloud-safety">
        <span class="eyebrow">BETA SAFETY</span><h3>Manual sync stays in your control</h3>
        <p>Uploading replaces the cloud copy only after a version check. Downloading asks before replacing data on this device. Continue making occasional JSON exports during beta.</p>
    </section>
    <section class="section-card account-cloud-delete" id="account-cloud-delete-section" hidden>
        <span class="eyebrow">ACCOUNT CONTROL</span><h3>Delete cloud account</h3>
        <p>This permanently removes your Level Up account and its cloud backup. Data currently stored on this device is not deleted.</p>
        <button class="text-btn danger-text-btn" id="account-cloud-delete" type="button">Delete Cloud Account</button>
    </section>`;
}

export function initializeAccountCloud({ onBack } = {}) {
    document.getElementById("account-cloud-back")?.addEventListener("click", () => onBack?.());
    document.getElementById("account-cloud-upload")?.addEventListener("click", uploadBackup);
    document.getElementById("account-cloud-download")?.addEventListener("click", downloadBackup);
    document.getElementById("account-cloud-signout")?.addEventListener("click", signOut);
    document.getElementById("account-cloud-delete")?.addEventListener("click", deleteAccount);
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
        renderSession();
        await refreshAccount();
        setMessage("Signed in. Your device data has not been uploaded yet.", "success");
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
    try { await api("/v1/session", { method: "DELETE" }); }
    catch (error) { console.warn("Cloud sign-out request failed:", error); }
    clearSession();
    setMessage("Signed out. Data on this device remains available.");
}

async function deleteAccount() {
    if (!window.confirm("Permanently delete your Level Up cloud account and cloud backup?\n\nData stored on this device will remain here.")) return;
    if (!window.confirm("This cannot be undone. Delete the cloud account now?")) return;
    try {
        await api("/v1/account", { method: "DELETE" });
        clearSession();
        setMessage("Cloud account deleted. Local device data was not removed.", "success");
    }
    catch (error) { setMessage(error.message, "error"); }
}

function renderSession() {
    const session = getSession();
    const account = readJson(ACCOUNT_KEY);
    const signedIn = Boolean(session?.token && account?.email);
    document.getElementById("account-cloud-actions")?.toggleAttribute("hidden", !signedIn);
    document.getElementById("account-cloud-delete-section")?.toggleAttribute("hidden", !signedIn);
    const googleButton = document.getElementById("account-google-button");
    if (googleButton) googleButton.hidden = signedIn;
    setText("account-cloud-name", signedIn ? account.name || "Level Up Beta Member" : "Not signed in");
    setText("account-cloud-email", signedIn ? account.email : "Sign in with Google to activate beta cloud storage.");
    setText("account-cloud-badge", signedIn ? "BETA ACTIVE" : "LOCAL ONLY");
}

function renderRemoteMeta(remote) {
    if (!remote) {
        setMessage("Signed in. No cloud backup has been uploaded yet.");
        setText("account-cloud-updated", "Upload this device when you are ready.");
        return;
    }
    setText("account-cloud-state", `Cloud backup version ${remote.version} is available.`);
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

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    renderSession();
    initializeGoogleButton();
}

function saveLastSync(direction, updatedAt, version) {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ direction, updatedAt, version, completedAt: new Date().toISOString() }));
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
    link.href = "css/account-cloud.css?v=beta-account-1";
    link.dataset.levelUpAccountCloud = "true";
    document.head.appendChild(link);
}
