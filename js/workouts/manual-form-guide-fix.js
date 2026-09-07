let manualGuideState = null;

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

function focusOpenedGuide(state = manualGuideState) {
    if (!state) return;
    keepManualGuideImmersive(state);
    const guides = [...state.page.querySelectorAll?.(".exercise-guide-screen") || []];
    const guide = guides[0];
    if (!guide) return;
    guide.scrollIntoView({ behavior: "auto", block: "start" });
}

function restoreManualBuilder() {
    const state = manualGuideState;
    if (!state) return;

    // More than one compatibility guide renderer can observe the shared guide
    // event. When returning from Manual Build, clear any leftover guide shells
    // and restore the builder as the single visible Workout surface.
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
                backLabel: "← Routine",
                restoreScroll: true,
                preserveViewport: true,
                focusGuideStart: true,
                manualBuilderGuide: true
            }
        })
    );

    // Treat the guide like its own page: always begin at the guide header,
    // regardless of how far down the routine the exercise was edited.
    requestAnimationFrame(() => requestAnimationFrame(() => focusOpenedGuide(state)));
}

function handleGuideBack(event) {
    if (!manualGuideState) return;
    const back = event.target.closest?.(".exercise-guide-screen .exercise-guide-back");
    if (!back) return;

    // Let the owning guide renderer run its normal cleanup first, then enforce
    // the Manual Build return destination so the Workout landing cannot win.
    setTimeout(restoreManualBuilder, 0);
}

// Manual Build rows are re-rendered whenever exercises, sets, or reps change.
// Delegated capture listeners remain stable across those re-renders.
document.addEventListener("click", openManualFormGuide, true);
document.addEventListener("click", handleGuideBack, true);
