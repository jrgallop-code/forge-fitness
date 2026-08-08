import {
    syncSelectedTargetToPlan
}
from "./active-calorie-target.js?v=active-target-2";

export function initializeActiveTargetSyncHooks() {
    [
        "save-nutrition-profile-btn",
        "save-nutrition-goal-btn"
    ].forEach(id => {
        document.getElementById(id)?.addEventListener("click", () => {
            setTimeout(() => {
                const target = syncSelectedTargetToPlan();

                if (target) {
                    window.dispatchEvent(
                        new CustomEvent("levelup:nutrition-updated")
                    );
                }
            }, 0);
        });
    });
}
