import { APPEARANCE_THEMES, applyAppearanceTheme, getAppearanceTheme, resolveAppearanceTheme } from "../core/appearance-theme.js?v=appearance-themes-3";
import { getAnatomyConfig } from "../core/anatomy-profile.js?v=female-recovery-parity-1";
import { hapticNotification } from "../core/native-capabilities.js?v=interactive-live-activity-1";
import {
    MUSCLE_COLOR_PRESETS,
    applyMuscleMapColors,
    getMuscleMapColors,
    getThemeDefaultMuscleMapColors,
    resetMuscleMapColors,
    setMuscleMapColor
} from "../core/muscle-map-colors.js?v=muscle-map-colors-2";

const PALETTE_ICON = `<svg class="app-silhouette-icon more-appearance-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.3a2.3 2.3 0 0 0 0-4.6H12a1.8 1.8 0 0 1 0-3.6h3.1A5.9 5.9 0 0 0 21 6.9C18.9 4.4 15.8 3 12 3Z"/><circle cx="7.2" cy="11.8" r="1"/><circle cx="8.7" cy="7.7" r="1"/><circle cx="13" cy="6.2" r="1"/><circle cx="16.8" cy="8.4" r="1"/></svg>`;
const HOME_ICON_KEY = "level_up_home_icon";
const HOME_ICONS = [
    { id: "level-up", name: "Classic" },
    { id: "arctic", name: "Arctic" },
    { id: "pure", name: "Pure" },
    { id: "ocean", name: "Ocean" },
    { id: "midnight", name: "Midnight" },
    { id: "slate", name: "Slate" },
    { id: "pulse", name: "Pulse" }
];

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
        ${isNativeIOS() ? renderHomeIconChoices() : ""}
        ${renderMuscleMapColors(muscleColors)}
        <aside class="appearance-semantic-note"><strong>Training meaning stays consistent</strong><span>Success, caution and discomfort colours keep their meaning. Muscle-map palettes can be personalized independently.</span></aside>
    </section>`;
}

export function initializeAppearanceSettings({ onBack } = {}) {
    applyMuscleMapColors({ announce: false });
    document.querySelector("[data-appearance-back]")?.addEventListener("click", () => onBack?.());
    document.querySelectorAll("[data-appearance-theme]").forEach(button => button.addEventListener("click", () => {
        const theme = button.dataset.appearanceTheme;
        const result = applyAppearanceTheme(theme);
        applyMuscleMapColors({ announce: false });
        document.querySelectorAll("[data-appearance-theme]").forEach(card => {
            const active = card.dataset.appearanceTheme === theme;
            card.classList.toggle("is-selected", active);
            card.setAttribute("aria-checked", String(active));
        });
        refreshMuscleColorControls("recovery");
        refreshMuscleColorControls("sets");
        const selected = APPEARANCE_THEMES.find(item => item.id === theme);
        const effective = APPEARANCE_THEMES.find(item => item.id === result.effective);
        const status = document.querySelector(".appearance-status");
        if (status) status.textContent = theme === "system" ? `System theme on · ${effective?.name || "Level Up"} active` : `${selected?.name || "Level Up"} applied`;
    }));

    document.querySelectorAll("[data-home-icon]").forEach(button => button.addEventListener("click", () => changeHomeIcon(button.dataset.homeIcon)));
    if (isNativeIOS()) void syncCurrentHomeIcon();

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
        const defaults = getThemeDefaultMuscleMapColors();
        const theme = APPEARANCE_THEMES.find(item => item.id === defaults.theme)?.name || "Level Up";
        const status = document.querySelector("[data-muscle-color-status]");
        if (status) status.textContent = `Muscle-map colours reset to the ${theme} defaults.`;
    });
}

function isNativeIOS() {
    return window.Capacitor?.getPlatform?.() === "ios";
}

function renderHomeIconChoices() {
    const selected = localStorage.getItem(HOME_ICON_KEY) || "level-up";
    return `<section class="appearance-home-icons" aria-labelledby="appearance-home-icons-title">
        <header><small>HOME SCREEN</small><h3 id="appearance-home-icons-title">Choose your Level Up icon</h3><p>Pick the logo that looks best with your iPhone theme. This is independent from the appearance inside the app.</p></header>
        <div class="appearance-home-icon-grid" role="radiogroup" aria-label="Home-screen app icon">
            ${HOME_ICONS.map(icon => `<button type="button" class="appearance-home-icon${icon.id === selected ? " is-selected" : ""}" data-home-icon="${icon.id}" role="radio" aria-checked="${icon.id === selected}"><img src="assets/home-icons/${icon.id}.png?v=2" alt=""><strong>${icon.name}</strong><span aria-hidden="true">✓</span></button>`).join("")}
        </div>
        <p class="appearance-status" data-home-icon-status role="status" aria-live="polite"></p>
    </section>`;
}

async function syncCurrentHomeIcon() {
    try {
        const current = await window.Capacitor?.Plugins?.LevelUpAppIcon?.getIcon?.();
        if (current?.name) updateHomeIconSelection(current.name);
    }
    catch {}
}

async function changeHomeIcon(name) {
    const status = document.querySelector("[data-home-icon-status]");
    try {
        if (status) status.textContent = "Updating your home-screen icon…";
        const result = await window.Capacitor?.Plugins?.LevelUpAppIcon?.setIcon?.({ name });
        if (!result?.name) throw new Error("Home-screen icon controls are available in the iPhone app.");
        localStorage.setItem(HOME_ICON_KEY, result.name);
        updateHomeIconSelection(result.name);
        void hapticNotification("SUCCESS");
        if (status) status.textContent = `${HOME_ICONS.find(icon => icon.id === result.name)?.name || "Level Up"} icon applied.`;
    }
    catch (error) {
        if (status) status.textContent = error?.message || "The home-screen icon could not be changed.";
    }
}

function updateHomeIconSelection(name) {
    document.querySelectorAll("[data-home-icon]").forEach(button => {
        const selected = button.dataset.homeIcon === name;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-checked", String(selected));
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
    const defaults = getThemeDefaultMuscleMapColors();
    const themeName = APPEARANCE_THEMES.find(item => item.id === defaults.theme)?.name || "Level Up";
    return `<section class="appearance-muscle-colors" aria-labelledby="muscle-map-colors-heading">
        <header>
            <small>MUSCLE MAPS</small>
            <h3 id="muscle-map-colors-heading">Choose your muscle colours</h3>
            <p>${themeName} supplies the starting colours. A manual colour stays selected even when you switch themes.</p>
        </header>
        <div class="appearance-muscle-color-grid">
            ${renderMuscleColorCard("recovery", colors.recovery, colors.recoveryMode)}
            ${renderMuscleColorCard("sets", colors.sets, colors.setsMode)}
        </div>
        <button class="appearance-muscle-reset" type="button" data-muscle-color-reset>Reset to current theme defaults</button>
        <p class="appearance-status" data-muscle-color-status role="status" aria-live="polite"></p>
    </section>`;
}

function renderMuscleColorCard(kind, color, mode) {
    const recovery = kind === "recovery";
    const title = recovery ? "Recovery" : "Set distribution";
    const description = recovery
        ? "Strongest colour = most fatigued. It fades toward neutral as recovery reaches 100%."
        : "Colour intensity rises continuously from lower volume to 12+ set credits.";
    const previewScale = recovery ? "var(--muscle-recovery-scale)" : "var(--muscle-set-scale)";
    const previewColor = recovery ? "var(--muscle-recovery-accent)" : "var(--muscle-set-accent)";
    return `<article class="appearance-muscle-color-card" data-muscle-color-card="${kind}">
        <header><strong>${title}</strong><b class="appearance-muscle-mode" data-muscle-color-mode>${mode === "custom" ? "Custom" : "Theme default"}</b><small>${description}</small></header>
        <div class="appearance-muscle-preview" style="--preview-color:${previewColor};--preview-scale:${previewScale}">
            ${musclePreviewBodies()}
            <div class="appearance-muscle-preview-copy">
                <strong>${recovery ? "Fatigued → Recovered" : "Lower → Higher sets"}</strong>
                <div class="appearance-muscle-preview-scale" aria-hidden="true"></div>
                <small>${recovery ? "Uses the same Recovery SVGs as Progress." : "Uses the same muscle SVGs as 7-day volume and Plan Target Maps."}</small>
            </div>
        </div>
        <div class="appearance-muscle-swatch-grid" role="group" aria-label="${title} colour presets">
            ${MUSCLE_COLOR_PRESETS.map(preset => `<button type="button" class="appearance-muscle-swatch${preset.color.toUpperCase() === color.toUpperCase() ? " is-selected" : ""}" style="--swatch-color:${preset.color}" data-muscle-color-kind="${kind}" data-muscle-color-choice="${preset.color}" aria-label="${preset.name}" title="${preset.name}" aria-pressed="${preset.color.toUpperCase() === color.toUpperCase()}"></button>`).join("")}
        </div>
        <label class="appearance-muscle-custom">Custom colour <input type="color" value="${color}" data-muscle-custom-color="${kind}" aria-label="Custom ${title.toLowerCase()} colour"></label>
    </article>`;
}

function musclePreviewBodies() {
    return `<div class="appearance-muscle-preview-bodies">${anatomyPreview("front")}${anatomyPreview("back")}</div>`;
}

function anatomyPreview(side) {
    const config = getAnatomyConfig(side);
    const ids = Object.values(config.regions || {}).flat().filter(Boolean);
    const overlays = ids.map((id, index) => {
        const href = `${config.asset}#${id}`;
        const className = index % 3 === 1 ? "appearance-anatomy-muscle is-mid" : index % 3 === 2 ? "appearance-anatomy-muscle is-low" : "appearance-anatomy-muscle";
        return `<use href="${href}" xlink:href="${href}" class="${className}"/>`;
    }).join("");
    return `<svg viewBox="${config.viewBox}" role="img" aria-label="${config.sex === "female" ? "Female" : "Male"} ${side} muscle colour preview" xmlns:xlink="http://www.w3.org/1999/xlink">
        <image href="${config.asset}" xlink:href="${config.asset}" x="${config.imageX}" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
        ${overlays}
    </svg>`;
}

function refreshMuscleColorControls(kind) {
    const key = kind === "sets" ? "sets" : "recovery";
    const settings = getMuscleMapColors();
    const color = settings[key].toUpperCase();
    const card = document.querySelector(`[data-muscle-color-card="${key}"]`);
    if (!card) return;
    card.querySelectorAll("[data-muscle-color-choice]").forEach(button => {
        const active = String(button.dataset.muscleColorChoice || "").toUpperCase() === color;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-pressed", String(active));
    });
    const custom = card.querySelector(`[data-muscle-custom-color="${key}"]`);
    if (custom && custom.value.toUpperCase() !== color) custom.value = color;
    const mode = card.querySelector("[data-muscle-color-mode]");
    if (mode) mode.textContent = settings[`${key}Mode`] === "custom" ? "Custom" : "Theme default";
}

function announceMuscleColor(kind) {
    const key = kind === "sets" ? "sets" : "recovery";
    const color = getMuscleMapColors()[key];
    const preset = MUSCLE_COLOR_PRESETS.find(item => item.color.toUpperCase() === color.toUpperCase());
    const label = key === "sets" ? "Set distribution" : "Recovery";
    const status = document.querySelector("[data-muscle-color-status]");
    if (status) status.textContent = `${label} colour updated to ${preset?.name || color}.`;
}
