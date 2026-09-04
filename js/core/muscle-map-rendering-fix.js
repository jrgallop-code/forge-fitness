const STYLE_ID = "level-up-muscle-map-rendering-fix";

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        /* Appearance uses the same anatomy assets/region map as the live app.
           Keep every bilateral region at the same preview intensity so one side
           of a muscle can never appear unselected. */
        .appearance-muscle-preview .appearance-anatomy-muscle,
        .appearance-muscle-preview .appearance-anatomy-muscle.is-mid,
        .appearance-muscle-preview .appearance-anatomy-muscle.is-low {
            fill:var(--preview-color)!important;
            opacity:.88!important;
        }

        /* The recovery renderer owns intensity via --recovery-opacity. Colour
           comes only from the selected recovery palette, so late recovery
           refreshes cannot restore the old hard-coded red/neutral fills. */
        .recovery-user-fill {
            fill:var(--muscle-recovery-accent,#ff315f)!important;
            fill-opacity:var(--recovery-opacity,.04)!important;
        }
        .recovery-user-stroke {
            stroke:var(--muscle-recovery-accent,#ff315f)!important;
            stroke-opacity:var(--recovery-opacity,.04)!important;
        }
        .recovery-user-muscle.no-data {
            fill-opacity:0!important;
            stroke-opacity:0!important;
        }

        /* Muscle Readiness no longer needs the decorative colour square. */
        .recovery-detail-row {
            grid-template-columns:minmax(0,1fr) auto!important;
        }
        .recovery-detail-row > .recovery-mini {
            display:none!important;
        }
    `;
    document.head.appendChild(style);
}

function refresh() {
    ensureStyles();
}

refresh();
window.addEventListener("levelup:appearance-change", refresh);
window.addEventListener("levelup:muscle-map-colors-changed", refresh);
window.addEventListener("levelup:profile-updated", refresh);
window.addEventListener("pageshow", refresh);
