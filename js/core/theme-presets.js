const THEME_STORAGE_KEY = "level_up_theme_preset";

const THEMES = {
    "level-up": {
        id: "level-up",
        name: "Level Up",
        description: "The original Level Up black, graphite and red theme.",
        metaColor: "#080808"
    },
    "midnight-blue": {
        id: "midnight-blue",
        name: "Midnight Blue",
        description: "Deep navy surfaces with a crisp performance-blue accent.",
        metaColor: "#07101c"
    },
    "monochrome": {
        id: "monochrome",
        name: "Monochrome",
        description: "Black and graphite with clean silver-white accents.",
        metaColor: "#08090b"
    }
};

function normalizeTheme(value) {
    return THEMES[value] ? value : "level-up";
}

function readTheme() {
    try {
        return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
    }
    catch {
        return "level-up";
    }
}

function saveTheme(themeId) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, normalizeTheme(themeId));
    }
    catch {
        // The visual change can still apply for this session when storage is unavailable.
    }
}

export function getLevelUpTheme() {
    return readTheme();
}

export function applyLevelUpTheme(themeId, { persist = true } = {}) {
    const normalized = normalizeTheme(themeId);
    const theme = THEMES[normalized];

    document.documentElement.dataset.levelupTheme = normalized;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.metaColor);

    if (persist) saveTheme(normalized);

    window.dispatchEvent(new CustomEvent("levelup:theme-changed", {
        detail: { theme: normalized }
    }));

    return normalized;
}

function paletteIcon() {
    return `
        <svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 0 18h1.2a2.3 2.3 0 0 0 1.2-4.3c-.5-.3-.7-.8-.5-1.3.2-.6.8-.9 1.4-.8h1.3A4.4 4.4 0 0 0 21 10.2C21 6.2 17 3 12 3Zm-4.4 8.2a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm2.2-4a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Zm5.1 1.1a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Z"/>
        </svg>
    `;
}

function ensureCustomizeCard() {
    const grid = document.querySelector(".more-menu-grid");
    if (!grid || grid.querySelector("[data-open-levelup-themes]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "more-menu-card";
    button.dataset.openLevelupThemes = "";
    button.innerHTML = `
        <span class="more-menu-icon">${paletteIcon()}</span>
        <span>
            <strong>Customize Level Up</strong>
            <small>Choose one of three curated app themes.</small>
        </span>
    `;
    grid.appendChild(button);
}

function previewMarkup(themeId) {
    return `
        <div class="theme-preset-preview theme-preset-preview-${themeId}" aria-hidden="true">
            <div class="theme-preview-top"><span></span><span></span></div>
            <div class="theme-preview-card">
                <i></i><b></b><b></b>
            </div>
            <div class="theme-preview-row"><span></span><span></span><span></span></div>
        </div>
    `;
}

function renderThemeScreen() {
    const content = document.getElementById("content");
    if (!content) return;

    const current = readTheme();
    content.innerHTML = `
        <section class="dashboard-welcome levelup-theme-heading">
            <div>
                <button class="nutrition-planner-back" type="button" data-theme-back>← More</button>
                <span class="eyebrow">APPEARANCE</span>
                <h2>Customize Level Up</h2>
                <p>Choose one of three curated themes. Your selection applies immediately and is remembered on this device.</p>
            </div>
        </section>
        <section class="levelup-theme-presets" aria-label="Level Up themes">
            ${Object.values(THEMES).map(theme => `
                <button class="levelup-theme-preset ${current === theme.id ? "selected" : ""}" type="button" data-theme-preset="${theme.id}" aria-pressed="${current === theme.id}">
                    ${previewMarkup(theme.id)}
                    <span class="theme-preset-copy">
                        <span class="theme-preset-title-row">
                            <strong>${theme.name}</strong>
                            <small class="theme-current-badge">${current === theme.id ? "Current" : ""}</small>
                        </span>
                        <small>${theme.description}</small>
                    </span>
                </button>
            `).join("")}
        </section>
        <p class="levelup-theme-note">Theme presets change Level Up's brand accents and surfaces only. Workout completion and coaching status colors keep their existing meaning.</p>
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function refreshThemeScreenSelection(themeId) {
    document.querySelectorAll("[data-theme-preset]").forEach(button => {
        const selected = button.dataset.themePreset === themeId;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
        const badge = button.querySelector(".theme-current-badge");
        if (badge) badge.textContent = selected ? "Current" : "";
    });
}

document.addEventListener("click", event => {
    const open = event.target.closest("[data-open-levelup-themes]");
    if (open) {
        event.preventDefault();
        renderThemeScreen();
        return;
    }

    const preset = event.target.closest("[data-theme-preset]");
    if (preset) {
        const selected = applyLevelUpTheme(preset.dataset.themePreset);
        refreshThemeScreenSelection(selected);
        return;
    }

    const back = event.target.closest("[data-theme-back]");
    if (back) {
        event.preventDefault();
        document.querySelector('.nav-btn[data-page="more"]')?.click();
    }
});

let cardQueued = false;
function queueCustomizeCard() {
    if (cardQueued) return;
    cardQueued = true;
    requestAnimationFrame(() => {
        cardQueued = false;
        ensureCustomizeCard();
    });
}

new MutationObserver(mutations => {
    if (mutations.some(mutation => [...mutation.addedNodes].some(node =>
        node.nodeType === 1 && (
            node.matches?.(".more-menu-grid") ||
            node.querySelector?.(".more-menu-grid")
        )
    ))) queueCustomizeCard();
}).observe(document.body, { childList: true, subtree: true });

applyLevelUpTheme(readTheme(), { persist: false });
queueCustomizeCard();
