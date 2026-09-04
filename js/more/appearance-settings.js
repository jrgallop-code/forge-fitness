import { APPEARANCE_THEMES, applyAppearanceTheme, getAppearanceTheme, resolveAppearanceTheme } from "../core/appearance-theme.js?v=appearance-themes-3";
import {
    MUSCLE_COLOR_PRESETS,
    DEFAULT_MUSCLE_MAP_COLORS,
    applyMuscleMapColors,
    getMuscleMapColors,
    resetMuscleMapColors,
    setMuscleMapColor
} from "../core/muscle-map-colors.js?v=muscle-map-colors-1";

const PALETTE_ICON = `<svg class="app-silhouette-icon more-appearance-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.3a2.3 2.3 0 0 0 0-4.6H12a1.8 1.8 0 0 1 0-3.6h3.1A5.9 5.9 0 0 0 21 6.9C18.9 4.4 15.8 3 12 3Z"/><circle cx="7.2" cy="11.8" r="1"/><circle cx="8.7" cy="7.7" r="1"/><circle cx="13" cy="6.2" r="1"/><circle cx="16.8" cy="8.4" r="1"/></svg>`;

export function appearanceMenuIcon() {
    return PALETTE_ICON;
}

export function renderAppearanceSettings() {
    const selected = getAppearanceTheme();
    const muscleColors = getMuscleMapColors();
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
        ${renderMuscleMapColors(muscleColors)}
        <aside class="appearance-semantic-note"><strong>Training meaning stays consistent</strong><span>Success, caution and discomfort colours keep their meaning. Muscle-map palettes can now be personalized independently.</span></aside>
    </section>`;
}

export function initializeAppearanceSettings({ onBack } = {}) {
    applyMuscleMapColors({ announce: false });
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

    document.querySelectorAll("[data-muscle-color-choice]").forEach(button => button.addEventListener("click", () => {
        const kind = button.dataset.muscleColorKind === "sets" ? "sets" : "recovery";
        setMuscleMapColor(kind, button.dataset.muscleColorChoice);
        refreshMuscleColorControls(kind);
        announceMuscleColor(kind);
    }));

    document.querySelectorAll("[data-muscle-custom-color]").forEach(input => {
        const update = () => {
            const kind = input.dataset.muscleCustomColor === "sets" ? "sets" : "recovery";
            setMuscleMapColor(kind, input.value);
            refreshMuscleColorControls(kind);
            announceMuscleColor(kind);
        };
        input.addEventListener("input", update);
        input.addEventListener("change", update);
    });

    document.querySelector("[data-muscle-color-reset]")?.addEventListener("click", () => {
        resetMuscleMapColors();
        refreshMuscleColorControls("recovery");
        refreshMuscleColorControls("sets");
        const status = document.querySelector("[data-muscle-color-status]");
        if (status) status.textContent = "Muscle-map colours reset to Neon Lime recovery and Electric Blue set distribution.";
    });
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

function renderMuscleMapColors(colors) {
    return `<section class="appearance-muscle-colors" aria-labelledby="muscle-map-colors-heading">
        <header>
            <small>MUSCLE MAPS</small>
            <h3 id="muscle-map-colors-heading">Choose your muscle colours</h3>
            <p>Recovery and set distribution are independent. Their body maps, bars and scales all follow the colour you choose.</p>
        </header>
        <div class="appearance-muscle-color-grid">
            ${renderMuscleColorCard("recovery", colors.recovery)}
            ${renderMuscleColorCard("sets", colors.sets)}
        </div>
        <button class="appearance-muscle-reset" type="button" data-muscle-color-reset>Reset to recommended defaults</button>
        <p class="appearance-status" data-muscle-color-status role="status" aria-live="polite"></p>
    </section>`;
}

function renderMuscleColorCard(kind, color) {
    const recovery = kind === "recovery";
    const title = recovery ? "Recovery" : "Set distribution";
    const description = recovery
        ? "Strongest colour = most fatigued. It fades toward neutral as recovery reaches 100%."
        : "Colour intensity rises continuously from lower volume to 12+ set credits.";
    const previewScale = recovery ? "var(--muscle-recovery-scale)" : "var(--muscle-set-scale)";
    const previewColor = recovery ? "var(--muscle-recovery-accent)" : "var(--muscle-set-accent)";
    return `<article class="appearance-muscle-color-card" data-muscle-color-card="${kind}">
        <header><strong>${title}</strong><small>${description}</small></header>
        <div class="appearance-muscle-preview" style="--preview-color:${previewColor};--preview-scale:${previewScale}">
            ${musclePreviewSvg()}
            <div class="appearance-muscle-preview-copy">
                <strong>${recovery ? "Fatigued → Recovered" : "Lower → Higher sets"}</strong>
                <div class="appearance-muscle-preview-scale" aria-hidden="true"></div>
                <small>${recovery ? "Recovery map + recovery detail scale" : "7-day volume, plan target maps and set-volume bars"}</small>
            </div>
        </div>
        <div class="appearance-muscle-swatch-grid" role="group" aria-label="${title} colour presets">
            ${MUSCLE_COLOR_PRESETS.map(preset => `<button type="button" class="appearance-muscle-swatch${preset.color.toUpperCase() === color.toUpperCase() ? " is-selected" : ""}" style="--swatch-color:${preset.color}" data-muscle-color-kind="${kind}" data-muscle-color-choice="${preset.color}" aria-label="${preset.name}" title="${preset.name}" aria-pressed="${preset.color.toUpperCase() === color.toUpperCase()}"></button>`).join("")}
        </div>
        <label class="appearance-muscle-custom">Custom colour <input type="color" value="${color}" data-muscle-custom-color="${kind}" aria-label="Custom ${title.toLowerCase()} colour"></label>
    </article>`;
}

function musclePreviewSvg() {
    return `<svg viewBox="0 0 80 116" aria-hidden="true">
        <circle class="preview-body" cx="40" cy="12" r="9"></circle>
        <path class="preview-body" d="M28 24 Q40 19 52 24 L59 54 L52 69 L50 108 L40 108 L38 72 L35 72 L32 108 L22 108 L25 69 L18 54 Z"></path>
        <path class="preview-muscle" d="M27 28 Q33 23 39 26 L38 43 Q31 44 25 39 Z"></path>
        <path class="preview-muscle is-mid" d="M41 26 Q48 23 53 29 L55 40 Q48 44 41 43 Z"></path>
        <path class="preview-muscle is-low" d="M27 67 L37 68 L34 99 L25 99 Z"></path>
        <path class="preview-muscle" d="M42 68 L52 67 L55 99 L46 99 Z"></path>
    </svg>`;
}

function refreshMuscleColorControls(kind) {
    const key = kind === "sets" ? "sets" : "recovery";
    const color = getMuscleMapColors()[key].toUpperCase();
    const card = document.querySelector(`[data-muscle-color-card="${key}"]`);
    if (!card) return;
    card.querySelectorAll("[data-muscle-color-choice]").forEach(button => {
        const active = String(button.dataset.muscleColorChoice || "").toUpperCase() === color;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-pressed", String(active));
    });
    const custom = card.querySelector(`[data-muscle-custom-color="${key}"]`);
    if (custom && custom.value.toUpperCase() !== color) custom.value = color;
}

function announceMuscleColor(kind) {
    const key = kind === "sets" ? "sets" : "recovery";
    const color = getMuscleMapColors()[key];
    const preset = MUSCLE_COLOR_PRESETS.find(item => item.color.toUpperCase() === color.toUpperCase());
    const label = key === "sets" ? "Set distribution" : "Recovery";
    const status = document.querySelector("[data-muscle-color-status]");
    if (status) status.textContent = `${label} colour updated to ${preset?.name || color}.`;
}
