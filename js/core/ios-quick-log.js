import { navigate } from "../core/router.js?v=pwa-coach-link-1";
import { canonicalMass, displayMass, massUnit } from "./unit-system.js?v=granular-units-1";

// iOS only: the PWA retains its existing five-button navigation.
const isIOS = () => Boolean(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === "ios");
const STORAGE = "forge_weight_entries";
let sheet = null;
let priorFocus = null;
const ICON_PATHS = {
    weight: '<path d="M5 5h14l2 15H3L5 5Z"/><circle cx="12" cy="10" r="3"/><path d="m12 10 1.7-1.5"/>',
    food: '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M17 3v18M17 3c-3 3-3 6 0 8h3"/>',
    water: '<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0C19 10 12 2 12 2Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
    measurements: '<path d="M4 6h16v12H4zM8 6v5m4-5v3m4-3v5M7 18v-4"/>',
    photos: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 3 3 4-5 5 6"/>',
    workout: '<path d="M2.5 9h2v6h-2zM5 7h3v10H5zM8 11h8v2H8zM16 7h3v10h-3zM19.5 9h2v6h-2z"/>'
};
function icon(name) {
    return '<svg class="ios-ql-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || ICON_PATHS.workout) + '</svg>';
}
function syncKeyboardViewport() {
    if (!sheet) return;
    const viewport = window.visualViewport;
    sheet.style.top = Math.max(0, viewport?.offsetTop || 0) + "px";
    const height = viewport?.height || window.innerHeight;
    sheet.style.height = Math.max(240, height) + "px";
    sheet.classList.toggle("ios-ql-keyboard-visible", height < window.innerHeight - 130);
    if (height < window.innerHeight - 130 && sheet.querySelector(".ios-quick-log-weight")) {
        sheet.querySelector(".ios-quick-log-weight input:focus")?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
}


function today() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function entries() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE) || "[]");
        return Array.isArray(parsed) ? parsed.filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e?.date) && Number.isFinite(Number(e?.weight)) && Number(e.weight) > 0) : [];
    } catch { return []; }
}
function closeSheet() {
    if (!sheet) return;
    sheet.remove();
    sheet = null;
    document.body.classList.remove("ios-quick-log-open");
    priorFocus?.focus?.({ preventScroll: true });
}
function haptic() {
    try { window.Capacitor?.Plugins?.Haptics?.impact?.({ style: "Light" }); } catch {}
}
function openWeight() {
    closeSheet();
    priorFocus = document.activeElement;
    const history = entries().sort((a,b) => a.date.localeCompare(b.date));
    const last = history.at(-1);
    const existingToday = history.find(e => e.date === today());
    const value = existingToday?.weight ?? last?.weight;
    const label = massUnit();
    const shown = value == null ? "" : String(displayMass(value, 1));
    sheet = document.createElement("div");
    sheet.className = "ios-quick-log-overlay";
    sheet.innerHTML = `<div class="ios-quick-log-scrim" data-ql-close></div>
      <section class="ios-quick-log-sheet ios-quick-log-weight" role="dialog" aria-modal="true" aria-labelledby="ios-ql-heading">
        <div class="ios-quick-log-handle"></div>
        <div class="ios-quick-log-heading"><h2 id="ios-ql-heading">Log Weight</h2><button type="button" aria-label="Close quick log" data-ql-close>×</button></div>
        <p class="ios-quick-log-last">${last ? `Last: ${displayMass(last.weight,1)} ${label}` : "Your first weigh-in"}</p>
        <form id="ios-quick-log-weight-form">
          <label class="ios-quick-log-field-label" for="ios-quick-log-number">Weight (${label})</label>
          <input id="ios-quick-log-number" type="number" inputmode="decimal" step="0.1" min="0.1" max="1500" required value="${shown}" autocomplete="off">
          <label class="ios-quick-log-field-label" for="ios-quick-log-date">Date</label>
          <input id="ios-quick-log-date" type="date" required value="${today()}">
          <p class="ios-quick-log-error" role="alert" hidden></p>
          <button class="ios-quick-log-save" type="submit">Save Weight</button>
        </form>
      </section>`;
    document.body.append(sheet);
    document.body.classList.add("ios-quick-log-open");
    syncKeyboardViewport();
    sheet.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        const input = sheet?.querySelector("#ios-quick-log-number");
        const date = sheet?.querySelector("#ios-quick-log-date")?.value;
        const numeric = Number(input?.value);
        const weight = canonicalMass(numeric);
        const error = sheet?.querySelector(".ios-quick-log-error");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !Number.isFinite(weight) || numeric <= 0 || numeric > 1500) {
            if (error) { error.hidden = false; error.textContent = "Enter a valid date and weight."; }
            return;
        }
        const existing = entries();
        const item = existing.find(e => e.date === date);
        if (item) item.weight = weight;
        else existing.push({ date, weight });
        existing.sort((a,b) => a.date.localeCompare(b.date));
        try { localStorage.setItem(STORAGE, JSON.stringify(existing)); }
        catch {
            if (error) { error.hidden = false; error.textContent = "Weight could not be saved. Please try again."; }
            return;
        }
        window.dispatchEvent(new CustomEvent("levelup:weight-updated", { detail: { source: "weight-tracker", count: existing.length } }));
        haptic();
        closeSheet();
        // Refresh existing dashboard or progress presentation without changing its route.
        if (document.querySelector(".dashboard-welcome")) {
            document.dispatchEvent(new CustomEvent("levelup:ios-quick-log-saved", { detail: { type: "weight" } }));
        }
    });
    // Keep keyboard closed until the user chooses to edit the weight.
}
function openMenu() {
    closeSheet();
    priorFocus = document.activeElement;
    sheet = document.createElement("div");
    sheet.className = "ios-quick-log-overlay";
    sheet.innerHTML = `<div class="ios-quick-log-scrim" data-ql-close></div>
      <section class="ios-quick-log-sheet" role="dialog" aria-modal="true" aria-labelledby="ios-ql-heading">
        <div class="ios-quick-log-handle"></div><div class="ios-quick-log-heading"><h2 id="ios-ql-heading">Quick Log</h2><button type="button" aria-label="Close quick log" data-ql-close>×</button></div>
        <div class="ios-quick-log-grid">
          <button type="button" data-ql-action="weight">${icon("weight")}<strong>Weight</strong></button>
          <button type="button" data-ql-action="food">${icon("food")}<strong>Nutrition</strong></button>
          <button type="button" data-ql-action="water">${icon("water")}<strong>Water</strong></button>
          <button type="button" data-ql-action="measurements">${icon("measurements")}<strong>Body Metrics</strong></button>
          <button type="button" data-ql-action="photos">${icon("photos")}<strong>Progress Photos</strong></button>
          <button type="button" data-ql-action="workout">${icon("workout")}<strong>Workout</strong></button>
        </div></section>`;
    document.body.append(sheet);
    document.body.classList.add("ios-quick-log-open");
    syncKeyboardViewport();
    haptic();
    sheet.querySelector('[data-ql-action="weight"]')?.focus({ preventScroll: true });
}
function openExisting(destination) {
    closeSheet();
    const page = destination === "food" ? "energy" : destination === "photos" ? "progress" : destination;
    document.querySelectorAll(".bottom-nav .nav-btn[data-page]").forEach(btn =>
        btn.classList.toggle("active", btn.dataset.page === page));
    navigate(page);
    if (destination === "photos") {
        document.querySelector('[data-progress-photos], [data-photo-progress], #photos-tab')?.click();
    }
}
function ensureNavigation() {
    const nav = document.querySelector(".bottom-nav");
    if (!nav || nav.querySelector(".ios-quick-log-nav")) return;
    // Keep existing nutrition routing; remove only its redundant bottom tab on iOS.
    nav.querySelector('[data-page="energy"]')?.remove();
    nav.classList.add("ios-quick-log-nav-enabled");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ios-quick-log-nav";
    button.setAttribute("aria-label", "Quick Log");
    button.innerHTML = '<span aria-hidden="true">+</span><small>Log</small>';
    const progress = nav.querySelector('[data-page="progress"]');
    nav.insertBefore(button, progress);
}
function hideProgressAddWeight() {
    // Retain history editing; only hide the redundant new-entry control.
    document.querySelector("#weight-progress .weight-section-header .weight-add-toggle")?.classList.add("ios-ql-redundant-weight-add");
}
function ensureDashboardShortcut() {
    const dashboard = document.querySelector("#content .dashboard");
    if (!dashboard || dashboard.querySelector("[data-ios-log-weight]")) return;
    const cards = [...dashboard.querySelectorAll(".metric-card")];
    const card = cards.find(el => /^(Latest (Recorded )?Weight|Weight)$/.test(el.querySelector("h3")?.textContent?.trim() || ""));
    if (!card) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ios-quick-log-card-action";
    button.dataset.iosLogWeight = "1";
    button.textContent = "+ Log Weight";
    button.setAttribute("aria-label", "Quickly log body weight");
    card.append(button);
}
function updateDashboardWeight() {
    const card = [...document.querySelectorAll("#content .dashboard .metric-card")]
        .find(el => /^(Latest (Recorded )?Weight|Weight)$/.test(el.querySelector("h3")?.textContent?.trim() || ""));
    if (!card) return;
    const last = entries().sort((a,b) => a.date.localeCompare(b.date)).at(-1);
    const value = card.querySelector("p");
    if (value && last) value.textContent = `${displayMass(last.weight,1)} ${massUnit()}`;
}
function handleClick(event) {
    if (event.target.closest(".ios-quick-log-nav, [data-ios-log-weight]")) {
        event.preventDefault();
        event.stopPropagation();
        if (event.target.closest("[data-ios-log-weight]")) openWeight();
        else openMenu();
        return;
    }
    if (!sheet) return;
    if (event.target.closest("[data-ql-close]")) { closeSheet(); return; }
    const action = event.target.closest("[data-ql-action]")?.dataset.qlAction;
    if (action === "weight") openWeight();
    else if (action) openExisting(action);
}
export function initializeIOSQuickLog() {
    if (!isIOS() || document.documentElement.dataset.iosQuickLogInstalled === "1") return;
    document.documentElement.dataset.iosQuickLogInstalled = "1";
    ensureNavigation();
    ensureDashboardShortcut();
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && sheet) closeSheet();
    });
    document.addEventListener("levelup:ios-quick-log-saved", updateDashboardWeight);
    window.visualViewport?.addEventListener("resize", syncKeyboardViewport);
    window.visualViewport?.addEventListener("scroll", syncKeyboardViewport);
    const content = document.getElementById("content");
    if (content) new MutationObserver(() => { ensureDashboardShortcut(); hideProgressAddWeight(); }).observe(content, { childList: true, subtree: false });
    hideProgressAddWeight();
}
