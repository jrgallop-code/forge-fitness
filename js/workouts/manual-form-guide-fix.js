const MANUAL_GUIDE_STYLE_ID = "manual-builder-guide-page-style";
let manualGuideState = null;

function ensureStandaloneGuideStyles() {
    if (document.getElementById(MANUAL_GUIDE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = MANUAL_GUIDE_STYLE_ID;
    style.textContent = `
        body.manual-builder-guide-open .bottom-nav,
        body.manual-builder-guide-open .app-bottom-nav,
        body.manual-builder-guide-open nav.bottom-nav {
            display: none !important;
        }
        body.manual-builder-guide-open {
            overflow: hidden !important;
        }
        .exercise-guide-screen.manual-builder-guide-page {
            position: fixed !important;
            inset: 0 !important;
            z-index: 60000 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: none !important;
            height: 100dvh !important;
            min-height: 100dvh !important;
            margin: 0 !important;
            padding: max(16px, env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom)) !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            background: var(--background, var(--app-bg, var(--surface, #0b0b0d))) !important;
        }
        .exercise-guide-screen.manual-builder-guide-page > .exercise-guide-back {
            position: sticky !important;
            top: 0 !important;
            z-index: 4 !important;
            min-height: 44px !important;
            margin: 0 0 12px !important;
        }
    `;
    document.head.appendChild(style);
}

function manualBuilderState() {
    const builder = document.getElementById("plan-builder");
    if (!builder?.classList.contains("manual-catalogue")) return null;
    const page = builder.closest(".workout-page") || document;
    return {
        builder,
        page,
        landing: page.querySelector?.(".workout-live-landing") || null,
        home: page.querySelector?.("[data-workout-home]") || null,
        scrollY: window.scrollY
    };
}

function keepManualGuideImmersive(state = manualGuideState) {
    if (!state) return;
    if (state.landing) state.landing.hidden = true;
    if (state.home) state.home.hidden = true;
}

function activateStandaloneGuide(state = manualGuideState) {
    if (!state) return;
    keepManualGuideImmersive(state);
    ensureStandaloneGuideStyles();

    const guides = [...state.page.querySelectorAll?.(".exercise-guide-screen") || []];
    if (!guides.length) return;

    // Several legacy compatibility renderers can listen for the same guide
    // event. Keep one guide shell only so Manual Build always opens a single,
    // full-screen destination rather than stacking inline guide sections.
    const guide = guides[0];
    guides.slice(1).forEach(extra => extra.remove());

    guide.classList.add("manual-builder-guide-page");
    guide.dataset.manualBuilderGuidePage = "";
    const close = guide.querySelector(".exercise-guide-back");
    if (close) {
        close.textContent = "✕ Close";
        close.setAttribute("aria-label", "Close form guide and return to routine");
    }

    document.body.classList.add("manual-builder-guide-open");
    guide.scrollTop = 0;

    // The guide is its own viewport now. Keep the Workout page at the exact
    // scroll position it had before the guide opened.
    window.scrollTo({ top: state.scrollY, behavior: "auto" });
}

function restoreManualBuilder() {
    const state = manualGuideState;
    if (!state) return;

    document.body.classList.remove("manual-builder-guide-open");
    state.page.querySelectorAll?.(".exercise-guide-screen").forEach(screen => screen.remove());
    keepManualGuideImmersive(state);
    state.builder.hidden = false;
    state.builder.classList.add("manual-catalogue");

    requestAnimationFrame(() => {
        window.scrollTo({ top: state.scrollY, behavior: "auto" });
        manualGuideState = null;
    });
}

function openManualFormGuide(event) {
    const button = event.target.closest?.(
        "#plan-builder.manual-catalogue .builder-exercise-guide"
    );

    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const row = button.closest(".exercise-builder-row");
    const exerciseId =
        row?.querySelector(".exercise-select")?.value ||
        button.dataset.exerciseId;

    if (!exerciseId || exerciseId === "__add_custom__") return;

    const state = manualBuilderState();
    if (!state) return;
    manualGuideState = state;
    keepManualGuideImmersive(state);

    document.dispatchEvent(
        new CustomEvent("levelup:open-exercise-guide", {
            detail: {
                exerciseId,
                sourceSelector: "#plan-builder",
                backLabel: "✕ Close",
                restoreScroll: true,
                preserveViewport: true,
                // Do not scroll the Workout document to the inline insertion
                // point. The compatibility screen is promoted to a fixed,
                // standalone page immediately after it renders.
                focusGuideStart: false,
                manualBuilderGuide: true
            }
        })
    );

    requestAnimationFrame(() => requestAnimationFrame(() => activateStandaloneGuide(state)));
    setTimeout(() => activateStandaloneGuide(state), 40);
}

function handleGuideBack(event) {
    if (!manualGuideState) return;
    const back = event.target.closest?.(".exercise-guide-screen .exercise-guide-back");
    if (!back) return;

    // Let the owning guide renderer run its normal cleanup first, then enforce
    // the Manual Build return destination so the Workout landing cannot win.
    setTimeout(restoreManualBuilder, 0);
}

ensureStandaloneGuideStyles();
document.addEventListener("click", openManualFormGuide, true);
document.addEventListener("click", handleGuideBack, true);
