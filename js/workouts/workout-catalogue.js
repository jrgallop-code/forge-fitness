import { presetPlans } from "./workout-plans.js?v=workout-plans-2";
import { presetPlans as detailPresetPlans } from "./workout-plans.js";
import { celebrityWorkoutPlans } from "./celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "./bodybuilder-workout-plans.js?v=bodybuilder-library-1";

function addCelebrityPlans(plans) {
    const existingPlanIds = new Set(plans.map(plan => plan.id));
    celebrityWorkoutPlans.forEach(plan => {
        if (!existingPlanIds.has(plan.id)) plans.push(plan);
    });
}

addCelebrityPlans(presetPlans);
addCelebrityPlans(detailPresetPlans);
addBodybuilderPlans(presetPlans);
addBodybuilderPlans(detailPresetPlans);

function addBodybuilderPlans(plans) {
    const existingPlanIds = new Set(plans.map(plan => plan.id));
    bodybuilderWorkoutPlans.forEach(plan => {
        if (!existingPlanIds.has(plan.id)) plans.push(plan);
    });
}

export function initializeWorkoutCatalogue(root = document) {
    ensureBodybuilderStyles();
    const page = root.querySelector?.(".workout-page") || document.querySelector(".workout-page");
    if (!page) return;

    const home = page.querySelector("[data-workout-home]");
    const catalogue = page.querySelector("[data-catalogue-view]");
    const builder = page.querySelector("#plan-builder");
    const list = page.querySelector("#saved-plan-list");
    const viewAll = page.querySelector("[data-workout-view-all]");

    const typeFilter = page.querySelector("[data-catalogue-type]");
    if (typeFilter && !typeFilter.querySelector('option[value="movie"]')) {
        typeFilter.insertAdjacentHTML("beforeend", '<option value="movie">Movie & Celebrity Inspired</option>');
    }
    if (typeFilter && !typeFilter.querySelector('option[value="bodybuilding"]')) {
        typeFilter.insertAdjacentHTML("beforeend", '<option value="bodybuilding">Bodybuilder Routines</option>');
    }

    celebrityWorkoutPlans.forEach(plan => {
        const card = page.querySelector(`.catalogue-plan-card[data-plan-id="${plan.id}"]`);
        if (!card) return;
        card.dataset.type = `${card.dataset.type || ""} movie`.trim();
        const label = card.querySelector(".plan-type-label");
        if (label) label.textContent = plan.sourceLabel;
    });
    bodybuilderWorkoutPlans.forEach(plan => {
        const card = page.querySelector(`.catalogue-plan-card[data-plan-id="${plan.id}"]`);
        if (!card) return;
        card.dataset.type = `${card.dataset.type || ""} bodybuilding`.trim();
        const label = card.querySelector(".plan-type-label");
        if (label) label.textContent = plan.sourceLabel;
    });

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

    const filters = page.querySelectorAll("[data-catalogue-type], [data-catalogue-days], [data-catalogue-equipment], [data-catalogue-duration], [data-catalogue-level]");
    filters.forEach(control => control.addEventListener("change", applyFilters));

    function applyFilters() {
        const type = page.querySelector("[data-catalogue-type]")?.value || "";
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
            const matches = (!type || card.dataset.type.includes(type))
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

function ensureBodybuilderStyles() {
    if (document.querySelector('link[data-bodybuilder-finisher-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/bodybuilder-finishers.css?v=bodybuilder-library-1";
    link.dataset.bodybuilderFinisherStyles = "1";
    document.head.appendChild(link);
}
