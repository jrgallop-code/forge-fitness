const API_URL = "https://api.leveluphypertrophy.com";
const GOOGLE_CLIENT_ID = "969450620287-gh455asc7c3lh67j7llq6f55rdpla0j3.apps.googleusercontent.com";
const SESSION_KEY = "level_up_cloud_session";
const status = document.getElementById("status");
const continueButton = document.getElementById("continue");

function sessionToken() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; }
    catch { return ""; }
}

async function connectToApp() {
    const token = sessionToken();
    if (!token) return;
    status.textContent = "Connecting to the Level Up app…";
    continueButton.disabled = true;
    try {
        const response = await fetch(`${API_URL}/v1/account/transfer-code`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.code) throw new Error(payload.error || "A secure connection code could not be created.");
        window.location.href = `leveluphypertrophy://auth?code=${encodeURIComponent(payload.code)}`;
    } catch (error) {
        status.textContent = error?.message || "Level Up could not connect this account.";
        continueButton.disabled = false;
    }
}

async function finishGoogle(response) {
    status.textContent = "Verifying your Google account…";
    try {
        const result = await fetch(`${API_URL}/v1/session/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential })
        });
        const payload = await result.json().catch(() => ({}));
        if (!result.ok || !payload?.token) throw new Error(payload.error || "Google sign-in could not be completed.");
        localStorage.setItem(SESSION_KEY, JSON.stringify({ token: payload.token, expiresAt: payload.expiresAt }));
        await connectToApp();
    } catch (error) { status.textContent = error?.message || "Google sign-in could not be completed."; }
}

function initialize(attempt = 0) {
    if (sessionToken()) {
        continueButton.hidden = false;
        continueButton.addEventListener("click", connectToApp);
    }
    if (!window.google?.accounts?.id) {
        if (attempt < 50) setTimeout(() => initialize(attempt + 1), 200);
        else status.textContent = "Google sign-in did not load. Check your connection and try again.";
        return;
    }
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: finishGoogle, auto_select: false });
    window.google.accounts.id.renderButton(document.getElementById("google-button"), { theme: "outline", size: "large", shape: "pill", width: 320, text: "continue_with" });
}

initialize();
