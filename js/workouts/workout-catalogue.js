export function initializeWorkoutCatalogue(root = document) {
    const page = root.querySelector?.(".workout-page") || document.querySelector(".workout-page");
    if (!page) return;

    const home = page.querySelector("[data-workout-home]");
    const catalogue = page.querySelector("[data-catalogue-view]");
    const builder = page.querySelector("#plan-builder");
    const list = page.querySelector("#saved-plan-list");
    const viewAll = page.querySelector("[data-workout-view-all]");

    const showHome = () => {
        if (home) home.hidden = false;
        if (catalogue) catalogue.hidden = true;
        window.scrollTo({ top: page.offsetTop, behavior: "smooth" });
    };

    page.querySelector("[data-catalogue-open]")?.addEventListener("click", () => {
        if (home) home.hidden = true;
        if (builder) builder.hidden = true;
        if (catalogue) catalogue.hidden = false;
        applyFilters();
        window.scrollTo({ top: page.offsetTop, behavior: "smooth" });
    });

    page.querySelector("[data-catalogue-back]")?.addEventListener("click", showHome);

    const savedCards = list?.querySelectorAll(".preset-plan-card") || [];
    if (viewAll && savedCards.length > 2) {
        viewAll.hidden = false;
        viewAll.addEventListener("click", () => {
            const expanded = list.classList.toggle("is-expanded");
            list.classList.toggle("is-collapsed", !expanded);
            viewAll.textContent = expanded ? "Show Recent Workouts" : "View All Workouts";
        });
    }

    const moreButton = page.querySelector("[data-catalogue-more]");
    const morePanel = page.querySelector("[data-catalogue-more-panel]");
    moreButton?.addEventListener("click", () => {
        morePanel.hidden = !morePanel.hidden;
        moreButton.textContent = morePanel.hidden ? "More Filters" : "Fewer Filters";
    });

    const filters = page.querySelectorAll("[data-catalogue-search], [data-catalogue-days], [data-catalogue-equipment], [data-catalogue-duration], [data-catalogue-level]");
    filters.forEach(control => control.addEventListener(control.matches("[type=search]") ? "input" : "change", applyFilters));

    function applyFilters() {
        const query = page.querySelector("[data-catalogue-search]")?.value.trim().toLowerCase() || "";
        const days = page.querySelector("[data-catalogue-days]")?.value || "";
        const equipment = page.querySelector("[data-catalogue-equipment]")?.value || "";
        const duration = page.querySelector("[data-catalogue-duration]")?.value || "";
        const level = page.querySelector("[data-catalogue-level]")?.value || "";
        const cards = [...page.querySelectorAll(".catalogue-plan-card")];
        let visible = 0;

        cards.forEach(card => {
            const durationValues = (card.dataset.duration || "").match(/\d+/g)?.map(Number) || [];
            const minimum = durationValues[0] || 0;
            const maximum = durationValues.at(-1) || minimum;
            const durationMatch = !duration
                || (duration === "45" && maximum <= 45)
                || (duration === "60" && minimum <= 60 && maximum > 45)
                || (duration === "61" && maximum > 60);
            const matches = (!query || card.dataset.name.includes(query))
                && (!days || card.dataset.days === days)
                && (!equipment || card.dataset.equipment.includes(equipment))
                && (!level || card.dataset.level.includes(level))
                && durationMatch;
            card.hidden = !matches;
            if (matches) visible += 1;
        });

        const count = page.querySelector("[data-catalogue-count]");
        if (count) count.textContent = `${visible} template${visible === 1 ? "" : "s"}`;
        const empty = page.querySelector("[data-catalogue-empty]");
        if (empty) empty.hidden = visible !== 0;
    }

    applyFilters();
}
