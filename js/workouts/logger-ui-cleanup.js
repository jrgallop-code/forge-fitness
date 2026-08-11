function enhanceCardioNotes(card) {
    if (!card || card.dataset.compactNotesEnhanced === "true") return;
    card.dataset.compactNotesEnhanced = "true";

    const label = card.querySelector(".cardio-notes-label");
    if (!label) return;

    const textarea = label.querySelector(".session-cardio-notes");
    const hasExistingNotes = Boolean(String(textarea?.value || "").trim());

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cardio-notes-toggle";
    button.textContent = hasExistingNotes ? "− Notes" : "+ Notes";
    button.setAttribute("aria-expanded", String(hasExistingNotes));

    label.hidden = !hasExistingNotes;
    label.insertAdjacentElement("beforebegin", button);

    button.addEventListener("click", () => {
        const opening = label.hidden;
        label.hidden = !opening;
        button.textContent = opening ? "− Notes" : "+ Notes";
        button.setAttribute("aria-expanded", String(opening));
        if (opening) textarea?.focus();
    });
}

function removeRirQuestionnaires(logger) {
    logger.querySelectorAll(".effort-rir-check").forEach(node => node.remove());
}

function tidyCompleteButtons(logger) {
    logger.querySelectorAll(".complete-set-btn").forEach(button => {
        const row = button.closest(".session-set-row");
        if (!row) return;

        const completed = row.classList.contains("completed");
        button.textContent = completed ? "✓" : "Complete Set";
        button.setAttribute("aria-label", completed ? "Set completed" : "Complete set");
    });
}

function scanLogger() {
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return;

    removeRirQuestionnaires(logger);
    tidyCompleteButtons(logger);
    logger.querySelectorAll(".cardio-session-card").forEach(enhanceCardioNotes);
}

const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation =>
        [...mutation.addedNodes].some(node =>
            node.nodeType === 1 && (
                node.id === "workout-session-logger" ||
                node.matches?.(".session-exercise-card, .complete-set-btn, .effort-rir-check") ||
                node.querySelector?.("#workout-session-logger, .session-exercise-card, .complete-set-btn, .effort-rir-check")
            )
        )
    );

    if (relevant) requestAnimationFrame(scanLogger);
});

observer.observe(document.body, { childList: true, subtree: true });
scanLogger();
