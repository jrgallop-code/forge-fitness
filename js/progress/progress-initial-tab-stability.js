function stabilizeInitialProgressTab(root = document) {
    const tabs = root.querySelector?.(".progress-tabs");
    if (!tabs || tabs.dataset.initialTabStabilized === "true") return false;

    const liftingButton = root.querySelector?.("#lifting-tab");
    const weightButton = root.querySelector?.("#weight-tab");
    const nutritionButton = root.querySelector?.("#nutrition-progress-tab");
    const cardioButton = root.querySelector?.("#cardio-progress-tab");
    const photoButton = root.querySelector?.("#photo-log-tab");

    const lifting = root.querySelector?.("#lifting-progress");
    const weight = root.querySelector?.("#weight-progress");
    const nutrition = root.querySelector?.("#calorie-progress");
    const cardio = root.querySelector?.("#cardio-progress");
    const photo = root.querySelector?.("#photo-log-progress");

    if (!liftingButton || !weightButton || !lifting || !weight) return false;

    // Progress is a lifting-first destination. Set the authoritative initial
    // state synchronously in the same mutation turn that mounts the page so
    // Safari never paints Weight for one frame before another module clicks
    // over to Lifting.
    [weightButton, nutritionButton, cardioButton, photoButton].forEach(button =>
        button?.classList.remove("active")
    );
    liftingButton.classList.add("active");

    weight.hidden = true;
    lifting.hidden = false;
    if (nutrition) nutrition.hidden = true;
    if (cardio) cardio.hidden = true;
    if (photo) photo.hidden = true;

    tabs.dataset.initialTabStabilized = "true";
    return true;
}

function observeProgressMount() {
    const root = document.getElementById("content") || document.body;
    if (!root) return;

    stabilizeInitialProgressTab(root);

    new MutationObserver(records => {
        if (!records.some(record => record.addedNodes.length || record.removedNodes.length)) return;
        stabilizeInitialProgressTab(root);
    }).observe(root, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeProgressMount, { once: true });
} else {
    observeProgressMount();
}
