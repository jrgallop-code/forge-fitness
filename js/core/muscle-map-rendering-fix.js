import { getMuscleMapColor } from "./muscle-map-colors.js?v=muscle-map-colors-3";

const STYLE_ID = "level-up-muscle-map-rendering-fix";

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .appearance-muscle-preview .appearance-anatomy-muscle,
        .appearance-muscle-preview .appearance-anatomy-muscle.is-mid,
        .appearance-muscle-preview .appearance-anatomy-muscle.is-low {
            fill:var(--preview-color)!important;
            opacity:.88!important;
        }

        .form-guide-muscle-highlight,
        html[data-theme] body #app #content .form-guide-muscle-highlight,
        html[data-theme] #plan-builder .form-guide-muscle-highlight,
        html[data-theme] .exercise-guide-screen .form-guide-muscle-highlight,
        html[data-theme] .exercise-filter-card .form-guide-muscle-highlight {
            fill:var(--form-guide-recovery-highlight,var(--muscle-recovery-accent,#ff315f))!important;
            filter:drop-shadow(0 0 8px color-mix(in srgb,var(--form-guide-recovery-highlight,var(--muscle-recovery-accent,#ff315f)) 32%,transparent))!important;
        }

        /* Preserve a little more selected colour near the recovered end. The
           final 100% stop remains true neutral grey so complete recovery stays
           visually distinct from 90-99% recovery. */
        .recovery-scale-bar,
        .appearance-muscle-color-card[data-muscle-color-card="recovery"] .appearance-muscle-preview-scale {
            background:linear-gradient(90deg,
                var(--muscle-recovery-accent,#ff315f) 0%,
                color-mix(in srgb,var(--muscle-recovery-accent,#ff315f) 74%,#858793) 25%,
                color-mix(in srgb,var(--muscle-recovery-accent,#ff315f) 52%,#858793) 50%,
                color-mix(in srgb,var(--muscle-recovery-accent,#ff315f) 30%,#858793) 75%,
                color-mix(in srgb,var(--muscle-recovery-accent,#ff315f) 17%,#858793) 90%,
                #858793 100%)!important;
        }

        .recovery-scale-points span:first-child small {
            color:var(--muscle-recovery-accent,#ff315f)!important;
        }
        .recovery-scale-points span:nth-child(3) small {
            color:color-mix(in srgb,var(--muscle-recovery-accent,#ff315f) 52%,#858793)!important;
        }
        .recovery-scale-points span:last-child small {
            color:#858793!important;
        }

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

        .recovery-detail-row {
            grid-template-columns:minmax(0,1fr) auto!important;
        }
        .recovery-detail-row > .recovery-mini {
            display:none!important;
        }
    `;
    document.head.appendChild(style);
}

function enforceRenderedHighlights() {
    const recoveryColor = getMuscleMapColor("recovery");
    document.documentElement.style.setProperty("--form-guide-recovery-highlight", recoveryColor);
    document.querySelectorAll(".form-guide-muscle-highlight").forEach(node => {
        node.style.setProperty("fill", recoveryColor, "important");
    });
}

function refresh() {
    ensureStyles();
    enforceRenderedHighlights();
    requestAnimationFrame(enforceRenderedHighlights);
}

refresh();
const observer = new MutationObserver(refresh);
observer.observe(document.documentElement, { childList:true, subtree:true });
window.addEventListener("levelup:appearance-change", refresh);
window.addEventListener("levelup:muscle-map-colors-changed", refresh);
window.addEventListener("levelup:profile-updated", refresh);
window.addEventListener("pageshow", refresh);
