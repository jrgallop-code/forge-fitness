(() => {
    let maintenanceEditing = false;
    let previousInlineEditing = false;
    let refreshQueued = false;

    function setText(node, value) {
        if (node && node.textContent !== value) node.textContent = value;
    }

    function applyGuidance() {
        const maintenance = document.getElementById("unified-maintenance");
        const useEstimate = document.getElementById("unified-use-estimate");
        const help = maintenance?.closest(".unified-maintenance-block")?.querySelector(".unified-help");
        const target = document.querySelector(".unified-active-target");
        const targetNote = target?.querySelector("small");

        if (help) {
            setText(
                help,
                "Enter the maintenance value Level Up should plan from. Planned Daily Target updates below; press Save Calorie Adjustment to apply it. Use Estimate only copies the Body Profile estimate."
            );
        }

        if (useEstimate) {
            useEstimate.title = "Copy the Body Profile maintenance estimate into the planning field";
            useEstimate.setAttribute("aria-label", "Use estimated maintenance for planning");
        }

        if (targetNote) {
            setText(targetNote, "This is the calorie target that will be saved when you press the button below.");
        }
    }

    function queueGuidance() {
        if (refreshQueued) return;
        refreshQueued = true;
        requestAnimationFrame(() => {
            refreshQueued = false;
            applyGuidance();
        });
    }

    document.addEventListener("focusin", event => {
        if (event.target?.id !== "unified-maintenance" || maintenanceEditing) return;
        maintenanceEditing = true;
        previousInlineEditing = window.__levelUpPhaseInlineEditing === true;
        window.__levelUpPhaseInlineEditing = true;
    }, true);

    document.addEventListener("focusout", event => {
        if (event.target?.id !== "unified-maintenance" || !maintenanceEditing) return;
        window.setTimeout(() => {
            maintenanceEditing = false;
            window.__levelUpPhaseInlineEditing = previousInlineEditing;
            queueGuidance();
        }, 0);
    }, true);

    document.addEventListener("input", event => {
        if (event.target?.id === "unified-maintenance") queueGuidance();
    }, true);

    document.addEventListener("click", event => {
        if (event.target?.closest?.("#unified-use-estimate, #unified-save-plan")) {
            window.setTimeout(queueGuidance, 0);
        }
    }, true);

    const content = document.getElementById("content");
    if (content) {
        new MutationObserver(queueGuidance).observe(content, { childList: true, subtree: true });
    }

    window.addEventListener("levelup:nutrition-updated", queueGuidance);
    window.addEventListener("levelup:nutrition-phase-updated", queueGuidance);
    window.addEventListener("load", queueGuidance);
    queueGuidance();
})();
