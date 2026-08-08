export function initializeCaloriePlannerLabels() {
    const dashboard = document.getElementById("nutrition-planner-dashboard");

    if (dashboard) {
        const eyebrow = dashboard.querySelector(":scope > .eyebrow");
        const heading = dashboard.querySelector(":scope > h2");

        if (eyebrow) eyebrow.textContent = "CALORIE PLANNER";
        if (heading) heading.textContent = "Your Calorie Plan";
    }

    document
        .querySelectorAll(".nutrition-planner-back")
        .forEach(button => {
            if (button.textContent.includes("Nutrition Planner")) {
                button.textContent = "← Calorie Planner";
            }
        });
}
