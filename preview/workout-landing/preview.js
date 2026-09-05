import { renderWorkoutBuilder } from "../../js/workouts/workout-ui.js?v=proven-template-builder-1";
import { initializeWorkoutBuilder } from "../../js/workouts/workouts.js?v=cardio-rpe-1";
import { initializeOneOffWorkout } from "../../js/workouts/one-off-workout.js?v=cardio-rpe-1";
import { initializeWorkoutCatalogue } from "../../js/workouts/workout-catalogue.js?v=proven-template-builder-1";
import { initializeSmartBuild } from "../../js/workouts/smart-build.js?v=hide-adapted-source-1";
import { initializeSmartBuildSupersetGuard } from "../../js/workouts/smart-build-superset-guard.js?v=superset-clean-1";
import { initializeRoutineImporter } from "../../js/workouts/routine-importer.js?v=launcher-grid-hotfix-1";
import { initializeWorkoutSchedule } from "../../js/workouts/workout-schedule.js?v=onboarding-training-days-1";
import { getTrainingPreferences } from "../../js/core/training-preferences.js?v=onboarding-training-days-1";
import "../../js/workouts/workout-plan-details.js?v=hide-adapted-source-1";

const content = document.getElementById("content");
if (!content) throw new Error("Workout preview root is missing.");

content.innerHTML = renderWorkoutBuilder();
safeInitialize("Workout builder", initializeWorkoutBuilder);
safeInitialize("Smart Build", () => initializeSmartBuild(content));
safeInitialize("Routine importer", () => initializeRoutineImporter(content));
safeInitialize("Smart Build superset guard", () => initializeSmartBuildSupersetGuard(content));
safeInitialize("One-off workout", initializeOneOffWorkout);
safeInitialize("Workout schedule", () => initializeWorkoutSchedule(content));
safeInitialize("Workout catalogue", () => initializeWorkoutCatalogue(content));

decoratePreview();

function decoratePreview() {
    const page = content.querySelector(".workout-page");
    const home = page?.querySelector("[data-workout-home]");
    if (!page || !home) return;

    page.classList.add("workout-landing-preview");
    const title = page.querySelector(".workout-page-title h2");
    const description = page.querySelector(".workout-page-title .section-description");
    if (title) title.textContent = "Workout";
    if (description) description.textContent = "Build, choose, and train — without losing the detail when you need it.";

    const nativeLauncher = page.querySelector("[data-smart-build-launcher]");
    nativeLauncher?.classList.add("preview-native-launcher");

    const buildSection = createBuildSection();
    const preferenceSection = createPreferenceSection();
    home.prepend(preferenceSection);
    home.prepend(buildSection);

    const savedSection = page.querySelector("#saved-plan-list")?.closest(".workout-home-section");
    if (savedSection) {
        const heading = savedSection.querySelector(".workout-section-heading h3");
        if (heading) heading.textContent = "Your Workout Plans";
        savedSection.dataset.previewPlans = "";
    }
    decoratePlanCards();
    observePlanCards();

    const catalogue = page.querySelector(".workout-catalogue-details");
    if (catalogue) {
        const browseSection = createBrowseSection(catalogue);
        catalogue.insertAdjacentElement("beforebegin", browseSection);
    }

    bindBuildActions();
}

function createBuildSection() {
    const section = document.createElement("section");
    section.className = "workout-preview-section";
    section.dataset.previewBuildSection = "";
    section.innerHTML = `
        <div class="workout-preview-section-head">
            <div><h3>Build or Add a Plan</h3><p>Choose how you want to get started.</p></div>
        </div>
        <div class="workout-preview-scroller" aria-label="Workout creation options">
            ${buildCard("smart", "Smart Build", "Personalized to your goals, schedule, and preferences.", smartIcon(), true)}
            ${buildCard("manual", "Create Manually", "Build your own plan from scratch.", pencilIcon())}
            ${buildCard("import", "Import Routine", "Bring in an existing workout routine.", importIcon())}
            ${buildCard("one-off", "One-Off Workout", "Train today without creating a saved plan.", playIcon())}
        </div>`;
    return section;
}

function buildCard(action, title, description, icon, primary = false) {
    return `<button class="workout-create-card${primary ? " is-primary" : ""}" type="button" data-preview-action="${action}">
        <span class="workout-create-icon">${icon}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(description)}</small>
        <span class="workout-create-chevron" aria-hidden="true">›</span>
    </button>`;
}

function createPreferenceSection() {
    const preferences = safePreferences();
    const values = [
        ["Goal", goalLabel(preferences.primaryGoal), targetIcon()],
        ["Days / week", `${preferences.days || 4} days`, calendarIcon()],
        ["Experience", experienceLabel(preferences.experience), barsIcon()],
        ["Session", `${preferences.duration || 60} min`, clockIcon()]
    ];
    const section = document.createElement("section");
    section.className = "workout-preview-section";
    section.dataset.previewPreferences = "";
    section.innerHTML = `
        <div class="workout-preview-section-head">
            <div><h3>Program Preferences</h3><p>Using the preferences already saved in Level Up.</p></div>
            <button class="workout-preview-text-action" type="button" data-preview-action="edit-preferences">Edit</button>
        </div>
        <div class="workout-pref-strip">
            ${values.map(([label, value, icon]) => `<button class="workout-pref-card" type="button" data-preview-action="edit-preferences">
                <span class="workout-pref-icon">${icon}</span>
                <span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>
            </button>`).join("")}
        </div>`;
    return section;
}

function createBrowseSection(catalogue) {
    const section = document.createElement("section");
    section.className = "workout-preview-section";
    section.dataset.previewBrowse = "";
    section.innerHTML = `
        <div class="workout-preview-section-head"><div><h3>Browse Programs</h3><p>Explore Level Up templates when you want a starting point.</p></div></div>
        <button class="workout-browse-card" type="button" data-preview-browse-open>
            <span><strong>Workout Catalogue</strong><small>Filter by goal, schedule, equipment, duration, and experience.</small></span>
            <span class="workout-browse-arrow" aria-hidden="true">›</span>
        </button>`;
    section.querySelector("[data-preview-browse-open]")?.addEventListener("click", () => {
        catalogue.open = true;
        requestAnimationFrame(() => catalogue.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
    return section;
}

function bindBuildActions() {
    content.querySelectorAll("[data-preview-action]").forEach(button => button.addEventListener("click", () => {
        const action = button.dataset.previewAction;
        if (action === "smart" || action === "edit-preferences") {
            content.querySelector("[data-smart-build]")?.click();
            return;
        }
        if (action === "manual") {
            content.querySelector("#new-plan-btn")?.click();
            return;
        }
        if (action === "import") {
            content.querySelector("[data-routine-import-open]")?.click();
            return;
        }
        if (action === "one-off") content.querySelector("#one-off-workout-btn")?.click();
    }));
}

function decoratePlanCards() {
    content.querySelectorAll("#saved-plan-list .preset-plan-card").forEach((card, index) => {
        if (card.querySelector(".preview-plan-thumb")) return;
        const thumb = document.createElement("span");
        thumb.className = "preview-plan-thumb";
        thumb.setAttribute("aria-hidden", "true");
        thumb.innerHTML = index % 2 ? planSplitIcon() : dumbbellIcon();
        card.prepend(thumb);
    });
}

function observePlanCards() {
    const list = content.querySelector("#saved-plan-list");
    if (!list) return;
    new MutationObserver(() => decoratePlanCards()).observe(list, { childList: true });
}

function safePreferences() {
    try { return getTrainingPreferences() || {}; }
    catch { return {}; }
}

function goalLabel(value) {
    return ({
        build_muscle: "Build muscle",
        build_strength: "Get stronger",
        maintain_muscle: "Maintain",
        lose_fat_maintain_muscle: "Lose fat",
        track_training: "Track training"
    })[value] || "Build muscle";
}

function experienceLabel(value) {
    return ({ new: "Beginner", intermediate: "Intermediate", experienced: "Experienced", advanced: "Advanced" })[value] || "Intermediate";
}

function safeInitialize(name, initializer) {
    try { return initializer(); }
    catch (error) { console.error(`${name} failed in workout preview:`, error); return undefined; }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]));
}

function smartIcon(){return '<svg viewBox="0 0 24 24"><path d="m12 2 1.5 5.1L18 9l-4.5 1.8L12 16l-1.5-5.2L6 9l4.5-1.9L12 2Z"/><path d="m19 14 .8 2.4L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.6L19 14Z"/></svg>'}
function pencilIcon(){return '<svg viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.9-10.9-3.2-3.2L5 15.8 4 20Z"/><path d="m14.7 6.1 3.2 3.2"/></svg>'}
function importIcon(){return '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 13v6h14v-6"/></svg>'}
function playIcon(){return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></svg>'}
function targetIcon(){return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M20 12h-3"/></svg>'}
function calendarIcon(){return '<svg viewBox="0 0 24 24"><path d="M5 5h14v15H5V5Z"/><path d="M8 3v4M16 3v4M5 9h14"/></svg>'}
function barsIcon(){return '<svg viewBox="0 0 24 24"><path d="M5 19v-5M12 19V9M19 19V4"/></svg>'}
function clockIcon(){return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>'}
function dumbbellIcon(){return '<svg viewBox="0 0 32 32"><path d="M3 12h4v8H3v-8Zm4-4h4v16H7V8Zm4 7h10v2H11v-2Zm10-7h4v16h-4V8Zm4 4h4v8h-4v-8Z"/></svg>'}
function planSplitIcon(){return '<svg viewBox="0 0 32 32"><path d="M5 8h8v6H5V8Zm14 0h8v6h-8V8ZM5 19h8v6H5v-6Zm14 0h8v6h-8v-6Z"/><path d="M13 11h6M9 14v5M23 14v5"/></svg>'}
