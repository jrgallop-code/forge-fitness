const NUTRITION_PLAN_KEY = "level_up_nutrition_plan";

function getCalculatedCalories() {
    const raw = localStorage.getItem(NUTRITION_PLAN_KEY);
    if (!raw) return null;

    try {
        const plan = JSON.parse(raw);
        const calories = Number(plan?.calculatedCalories);
        return Number.isFinite(calories) && calories > 0
            ? Math.round(calories)
            : null;
    }
    catch {
        return null;
    }
}

function syncDashboardCalculatedCalories() {
    const dashboard = document.querySelector(".dashboard");
    if (!dashboard) return;

    const calories = getCalculatedCalories();
    if (!calories) return;

    dashboard.querySelectorAll(".metric-card").forEach(card => {
        const heading = card.querySelector("h3")?.textContent?.trim();
        if (heading !== "Daily Calorie Target") return;

        const value = card.querySelector("p");
        if (value) value.textContent = `${calories} kcal`;

        const label = card.querySelector("small");
        if (label) label.textContent = "Calculated Target";
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => syncDashboardCalculatedCalories())
        .observe(content, { childList: true, subtree: true });
}

document.addEventListener("click", () => {
    setTimeout(syncDashboardCalculatedCalories, 0);
});

window.addEventListener("levelup:nutrition-updated", () => {
    setTimeout(syncDashboardCalculatedCalories, 0);
});

window.addEventListener("load", () => {
    setTimeout(syncDashboardCalculatedCalories, 0);
});

syncDashboardCalculatedCalories();
