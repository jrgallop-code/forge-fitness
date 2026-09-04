const MODE_KEY = "level_up_maintenance_update_mode_v1";
const VALID = new Set(["review", "automatic"]);
const STYLE_ID = "level-up-weekly-change-choice-fix-styles";
let syncQueued = false;

function currentMode() {
    const value = String(localStorage.getItem(MODE_KEY) || "review").toLowerCase();
    return VALID.has(value) ? value : "review";
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .nutrition-coach-choice button[data-coach-update-choice]{position:relative;pointer-events:auto!important;touch-action:manipulation;-webkit-tap-highlight-color:transparent;cursor:pointer}
        .nutrition-coach-choice button[data-coach-update-choice].is-selected{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--muscle-recovery-accent,#2f80ff) 32%,transparent)}
        .nutrition-coach-choice button[data-coach-update-choice].is-selected::after{content:"✓";position:absolute;top:5px;right:7px;font-size:10px;font-weight:900;line-height:1;color:currentColor}
    `;
    document.head.appendChild(style);
}

function syncGroup(group, mode = currentMode()) {
    group?.querySelectorAll?.("button[data-coach-update-choice]").forEach(button => {
        const selected = button.dataset.coachUpdateChoice === mode;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-checked", String(selected));
        button.setAttribute("aria-pressed", String(selected));
        button.disabled = false;
    });
}

function syncAll() {
    syncQueued = false;
    ensureStyles();
    const mode = currentMode();
    document.querySelectorAll(".nutrition-coach-choice").forEach(group => syncGroup(group, mode));
    const select = document.getElementById("unified-maintenance-mode");
    if (select && select.value !== mode) select.value = mode;
}

function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(syncAll);
}

function applyChoice(button) {
    const mode = String(button?.dataset?.coachUpdateChoice || "").toLowerCase();
    if (!VALID.has(mode)) return false;

    localStorage.setItem(MODE_KEY, mode);
    syncGroup(button.closest(".nutrition-coach-choice"), mode);
    const select = document.getElementById("unified-maintenance-mode");
    if (select) select.value = mode;

    window.dispatchEvent(new CustomEvent("levelup:maintenance-mode-updated", { detail: { mode } }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-mode-updated", { detail: { mode: "coach", updateMode: mode } }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "weekly-change-choice", updateMode: mode } }));
    queueSync();
    return true;
}

document.addEventListener("click", event => {
    const button = event.target.closest?.("button[data-coach-update-choice]");
    if (!button) return;
    event.preventDefault();
    applyChoice(button);
}, true);

document.addEventListener("pointerup", event => {
    const button = event.target.closest?.("button[data-coach-update-choice]");
    if (!button || event.pointerType === "mouse") return;
    // iOS installed PWAs can occasionally suppress the synthetic click after
    // DOM movement inside <details>. Commit the choice on pointer-up as well.
    applyChoice(button);
}, true);

[
    "levelup:maintenance-mode-updated",
    "levelup:nutrition-mode-updated",
    "levelup:nutrition-updated",
    "pageshow"
].forEach(name => window.addEventListener(name, queueSync));

new MutationObserver(queueSync).observe(document.documentElement, { childList: true, subtree: true });
queueSync();
