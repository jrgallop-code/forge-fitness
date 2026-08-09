function simplifyCalorieTargetUI() {
    const currentTarget = document.getElementById("current-calorie-target");
    const currentCard = currentTarget?.closest(".metric-card");
    if (currentCard) currentCard.remove();

    document.querySelectorAll(".nutrition-current-target-card .nutrition-message").forEach(message => {
        if ((message.textContent || "").includes("Current Daily Target")) {
            message.textContent = "Calculated Calories is the single calorie target used by the Dashboard, macros, projections and Adaptive Coach.";
        }
    });
}

document.addEventListener("click", () => {
    setTimeout(simplifyCalorieTargetUI, 0);
});

window.addEventListener("levelup:nutrition-updated", () => {
    setTimeout(simplifyCalorieTargetUI, 0);
});

window.addEventListener("load", () => {
    setTimeout(simplifyCalorieTargetUI, 0);
});
