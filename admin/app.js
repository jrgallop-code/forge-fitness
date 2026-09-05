import { renderAdminAnalytics, initializeAdminAnalytics } from "./admin-analytics.js?v=owner-dashboard-1";
import { initializeOwnerProductInsights } from "./product-insights.js?v=owner-product-insights-1";

const API_URL = "https://api.leveluphypertrophy.com";
const GOOGLE_CLIENT_ID = "969450620287-gh455asc7c3lh67j7llq6f55rdpla0j3.apps.googleusercontent.com";
const SESSION_KEY = "level_up_owner_session";
const ACCOUNT_KEY = "level_up_owner_account";

const root = document.getElementById("owner-root");
const signOutButton = document.getElementById("owner-signout");

signOutButton?.addEventListener("click", signOut);
boot();

async function boot() {
  const session = readJson(SESSION_KEY);
  if (session?.token) {
    await authorizeOwner();
    return;
  }
  renderLogin("Sign in with your owner Google account.");
  initializeGoogleButton();
}

function renderLogin(message = "Sign in with your owner Google account.", tone = "") {
  if (!root) return;
  root.innerHTML = `
    <section class="owner-login-card">
      <span class="eyebrow">OWNER ACCESS</span>
      <h1>Level Up Analytics</h1>
      <p>This dashboard is separate from the consumer app and is intended only for Level Up administration.</p>
      <div id="owner-google-button" class="owner-google-button"></div>
      <div id="owner-auth-status" class="owner-auth-status${tone ? ` is-${tone}` : ""}">${escapeHtml(message)}</div>
    </section>`;
  signOutButton?.toggleAttribute("hidden", true);
}

function initializeGoogleButton(attempt = 0) {
  const target = document.getElementById("owner-google-button");
  if (!target || readJson(SESSION_KEY)?.token) return;
  if (!window.google?.accounts?.id) {
    if (attempt < 40) setTimeout(() => initializeGoogleButton(attempt + 1), 200);
    else setAuthStatus("Google sign-in did not load. Check your connection and refresh this page.", "error");
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
    width: Math.min(340, Math.max(240, target.clientWidth || 300))
  });
}

async function handleGoogleCredential(response) {
  try {
    setAuthStatus("Verifying your owner account…");
    const session = await api("/v1/session/google", {
      method: "POST",
      auth: false,
      body: { credential: response?.credential }
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, expiresAt: session.expiresAt }));
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(session.user || {}));
    await authorizeOwner();
  } catch (error) {
    clearSession();
    renderLogin(error.message || "Sign-in failed.", "error");
    initializeGoogleButton();
  }
}

async function authorizeOwner() {
  try {
    const result = await api("/v1/me");
    const user = result?.user || {};
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(user));

    if (!user.isAdmin) {
      if (root) {
        root.innerHTML = `
          <section class="owner-login-card owner-access-denied">
            <span class="eyebrow">ACCESS DENIED</span>
            <h1>Owner authorization required</h1>
            <p>The Google account is valid, but the Level Up API has not authorized it as an administrator.</p>
            <p class="owner-help">The backend still requires the account email to be present in the Cloudflare <code>ADMIN_EMAILS</code> secret.</p>
            <button id="owner-try-another" class="owner-primary" type="button">Use another account</button>
          </section>`;
        document.getElementById("owner-try-another")?.addEventListener("click", signOut);
      }
      signOutButton?.toggleAttribute("hidden", false);
      return;
    }

    showDashboard(user);
  } catch (error) {
    if (error.status === 401) clearSession();
    renderLogin(error.message || "Owner authorization could not be checked.", "error");
    initializeGoogleButton();
  }
}

function showDashboard(user) {
  if (!root) return;
  root.innerHTML = `
    <section class="owner-session-strip">
      <div><span class="eyebrow">SIGNED IN</span><strong>${escapeHtml(user.name || user.email || "Level Up owner")}</strong></div>
      <span>${escapeHtml(user.email || "")}</span>
    </section>
    <div id="owner-analytics-root"></div>`;
  signOutButton?.toggleAttribute("hidden", false);
  const target = document.getElementById("owner-analytics-root");
  if (target) target.innerHTML = renderAdminAnalytics();
  document.getElementById("admin-analytics-back")?.remove();
  initializeAdminAnalytics();
  initializeOwnerProductInsights();
}

async function signOut() {
  try { await api("/v1/session", { method: "DELETE" }); } catch {}
  clearSession();
  renderLogin("Signed out. Sign in with the owner account to continue.");
  initializeGoogleButton();
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = readJson(SESSION_KEY)?.token;
    if (!token) throw Object.assign(new Error("Owner sign-in required."), { status: 401 });
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error("Level Up analytics could not reach the API. Check your connection and try again.");
  }

  let payload = {};
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw Object.assign(new Error(payload.error || "Owner request failed."), { status: response.status });
  return payload;
}

function setAuthStatus(message, tone = "") {
  const status = document.getElementById("owner-auth-status");
  if (!status) return;
  status.textContent = message;
  status.className = `owner-auth-status${tone ? ` is-${tone}` : ""}`;
}

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '\"': "&quot;",
    "'": "&#39;"
  }[character]));
}
