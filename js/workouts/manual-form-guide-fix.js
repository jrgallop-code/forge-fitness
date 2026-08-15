function openManualFormGuide(event) {
    const button = event.target.closest?.(
        "#plan-builder.manual-catalogue .builder-exercise-guide"
    );

    if (!button) {
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const row = button.closest(".exercise-builder-row");
    const exerciseId =
        row?.querySelector(".exercise-select")?.value ||
        button.dataset.exerciseId;

    if (!exerciseId || exerciseId === "__add_custom__") {
        return;
    }

    document.dispatchEvent(
        new CustomEvent(
            "levelup:open-exercise-guide",
            {
                detail: {
                    exerciseId,
                    sourceSelector: "#plan-builder"
                }
            }
        )
    );
}

// Capture the manual setup guide action before the original per-row listener.
// The builder rows are rebuilt as exercises are selected/swapped, so a stable
// delegated listener is more reliable than depending on a listener attached to
// one particular render of the row.
document.addEventListener("click", openManualFormGuide, true);
