export function initializeProteinTargetExplanation() {
    const macroView =
        document.querySelector(
            '[data-planner-view="macros"]'
        );

    if (!macroView) {
        return;
    }

    const existingNote =
        macroView.querySelector(
            "[data-protein-target-note]"
        );

    if (existingNote) {
        return;
    }

    const targetCard =
        macroView.querySelector(
            ".nutrition-goal-card"
        );

    if (!targetCard) {
        return;
    }

    const oldNote =
        [...targetCard.querySelectorAll("small")]
            .find(element =>
                element.textContent
                    .toLowerCase()
                    .includes("protein is set")
            );

    if (oldNote) {
        oldNote.hidden = true;
    }

    targetCard.insertAdjacentHTML(
        "beforeend",
        `
            <div
                class="nutrition-message"
                data-protein-target-note
            >
                <strong>Protein target: 1 g per lb of body weight.</strong>
                <br>
                Level Up uses this as a simple, high-protein target for adults who resistance train.
                It provides an easy rule to follow while supporting muscle growth and muscle retention.
                Individual needs can vary, so treat it as a practical target rather than a strict minimum.
                Carbohydrate and fat remain flexible based on your selected macro style.
            </div>
        `
    );
}
