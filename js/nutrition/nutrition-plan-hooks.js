export function initializeNutritionPlanHooks() {
    [
        "save-nutrition-profile-btn",
        "save-nutrition-goal-btn",
        "save-nutrition-macro-btn"
    ].forEach(id => {
        document
            .getElementById(id)
            ?.addEventListener(
                "click",
                () => {
                    window.setTimeout(
                        () => {
                            window.dispatchEvent(
                                new CustomEvent(
                                    "levelup:nutrition-updated"
                                )
                            );
                        },
                        0
                    );
                }
            );
    });
}
