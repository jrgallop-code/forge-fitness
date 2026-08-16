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

    document.dispatchEvent(
        new CustomEvent("levelup:open-exercise-guide", {
            detail: {
                exerciseId,
                sourceSelector: "#plan-builder"
            }
        })
    );
}

// Manual Build rows are re-rendered whenever exercises, sets, or reps change.
// A delegated capture listener stays attached across those re-renders and reads
// the exercise currently selected in the row before opening the existing guide.
document.addEventListener("click", openManualFormGuide, true);
