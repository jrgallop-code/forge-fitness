import { APPEARANCE_THEMES, applyAppearanceTheme, getAppearanceTheme, resolveAppearanceTheme } from "../core/appearance-theme.js?v=appearance-themes-2";

const PALETTE_ICON = `<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h3.2A5.8 5.8 0 0 0 21 6.2C18.8 4.2 15.8 3 12 3Zm-4.5 7A1.5 1.5 0 1 1 9 8.5 1.5 1.5 0 0 1 7.5 10Zm3-3A1.5 1.5 0 1 1 12 5.5 1.5 1.5 0 0 1-1.5 1.5Zm5 1A1.5 1.5 0 1 1 17 6.5 1.5 1.5 0 0 1-1.5 1.5Z"/></svg>`;

export function appearanceMenuIcon() {
    return PALETTE_ICON;
}

export function renderAppearanceSettings() {
    const selected = getAppearanceTheme();
    return `<section class="appearance-page">
        <header class="appearance-header">
            <button class="appearance-back" type="button" data-appearance-back aria-label="Back to More">← More</button>
            <span class="eyebrow">PERSONALIZE</span>
            <h2>Appearance</h2>
            <p>Choose a Level Up theme. System follows this device's local time, switching to Arctic from 7 a.m. to 7 p.m. and Level Up overnight.</p>
        </header>
        <section class="appearance-theme-grid" role="radiogroup" aria-label="App theme">
            ${APPEARANCE_THEMES.map(theme => renderThemeCard(theme, selected)).join("")}
        </section>
        <p class="appearance-status" role="status" aria-live="polite"></p>
        <aside class="appearance-semantic-note"><strong>Training colours stay meaningful</strong><span>Success, caution, discomfort, recovery and nutrition colours remain consistent in every theme.</span></aside>
    </section>`;
}

export function initializeAppearanceSettings({ onBack } = {}) {
    document.querySelector("[data-appearance-back]")?.addEventListener("click", () => onBack?.());
    document.querySelectorAll("[data-appearance-theme]").forEach(button => button.addEventListener("click", () => {
        const theme = button.dataset.appearanceTheme;
        const result = applyAppearanceTheme(theme);
        document.querySelectorAll("[data-appearance-theme]").forEach(card => {
            const active = card.dataset.appearanceTheme === theme;
            card.classList.toggle("is-selected", active);
            card.setAttribute("aria-checked", String(active));
        });
        const selected = APPEARANCE_THEMES.find(item => item.id === theme);
        const effective = APPEARANCE_THEMES.find(item => item.id === result.effective);
        const status = document.querySelector(".appearance-status");
        if (status) status.textContent = theme === "system" ? `System theme on · ${effective?.name || "Level Up"} active` : `${selected?.name || "Level Up"} applied`;
    }));
}

function renderThemeCard(theme, selected) {
    const active = theme.id === selected;
    const effective = resolveAppearanceTheme(theme.id);
    return `<button class="appearance-theme-card theme-preview-${theme.id}${active ? " is-selected" : ""}" type="button" role="radio" aria-checked="${active}" data-appearance-theme="${theme.id}">
        <span class="appearance-selected-mark" aria-hidden="true">✓</span>
        <span class="appearance-theme-preview" data-preview-effective="${effective}">
            <i class="appearance-preview-top"></i><i class="appearance-preview-card"><b></b><em></em><small></small></i><i class="appearance-preview-nav"></i>
        </span>
        <strong>${theme.name}</strong><small>${theme.description}</small>
    </button>`;
}
