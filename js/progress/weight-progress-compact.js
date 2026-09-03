import { calculateTrendWeight, calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { completeTutorial, dismissTutorial, getTutorial, getTutorialState, setTutorialStep, shouldShowTutorial } from "../core/tutorials.js?v=trend-weight-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const TREND_TUTORIAL_ID = "trend-weight";
const TREND_TUTORIAL_ICONS = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 15l3-4 3 2 5-7 2 2"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="8" r="2"/><path d="M8 11.4 16 8.6" stroke-dasharray="2 2"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16c3-6 5 1 8-4s5 2 10-5M3 19c4-3 7-2 10-5s5-3 8-5"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6M4 18h16M7 15l4-5 3 2 5-6"/><path d="m16 6 3 0 0 3"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17V9M10 17V6M15 17v-4M20 17V4"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 8h14M7 8c0 3-1.5 5-4 6 1 2 3 3 5 3s4-1 5-3c-2.5-1-4-3-4-6M15 8c0 3-1.5 5-4 6 1 2 3 3 5 3s4-1 5-3c-2.5-1-4-3-4-6"/></svg>'
];

export function initializeWeightProgressCompact() {
    const section = document.getElementById("weight-progress");
    if (!section) return;
    removeGoalUi(section);
    compactWeightProgress(section);
    refreshWeightSummary();
    initializeSummaryCarousel(section);
    initializeTrendWeightTutorial(section);
    relocateWeeklyReviewAlertToNutritionProgress(section);
}

function removeGoalUi(section) {
    section.querySelector(".weight-goal-settings")?.remove();
    section.querySelector("#current-goal-host")?.remove();
    section.querySelector("#current-goal-wizard")?.remove();

    [...section.querySelectorAll(".weight-summary .metric-card")].forEach(card => {
        if (card.querySelector("h3")?.textContent?.trim() === "Goal") card.remove();
    });
}

function compactWeightProgress(section) {
    if (section.dataset.compactLayout === "weight-only-1") return;

    const header = section.querySelector(".weight-section-header");
    const entryCards = [...section.querySelectorAll(".weight-entry-card")];
    const weightEntry = entryCards[0];
    const legacyGoalEntry = entryCards[1];
    const summary = section.querySelector(".weight-summary");
    if (!header || !weightEntry || !summary) return;

    legacyGoalEntry?.remove();
    removeGoalUi(section);
    header.querySelectorAll(".weight-add-toggle").forEach(button => button.remove());

    const dateLabel = weightEntry.querySelector('label[for="weight-date"]');
    const dateInput = weightEntry.querySelector("#weight-date");
    const weightLabel = weightEntry.querySelector('label[for="daily-weight"]');
    const weightInput = weightEntry.querySelector("#daily-weight");
    const saveWeightButton = weightEntry.querySelector("#save-weight-btn");
    if (!dateInput || !weightInput || !saveWeightButton) return;

    const addButton = document.createElement("button");
    addButton.className = "primary-btn weight-add-toggle";
    addButton.type = "button";
    addButton.textContent = "+ Add Weight";
    addButton.setAttribute("aria-expanded", "false");
    addButton.setAttribute("aria-controls", "weight-entry-panel");
    header.appendChild(addButton);

    weightEntry.id = "weight-entry-panel";
    weightEntry.classList.add("weight-entry-card-compact");
    weightEntry.hidden = true;
    weightEntry.innerHTML = "";

    const fields = document.createElement("div");
    fields.className = "weight-compact-fields";
    fields.append(
        makeField("weight-date", dateLabel?.textContent?.trim() || "Date", dateInput),
        makeField("daily-weight", weightLabel?.textContent?.trim() || "Weight (lb)", weightInput)
    );

    const closeButton = document.createElement("button");
    closeButton.className = "secondary-btn";
    closeButton.type = "button";
    closeButton.textContent = "Close";

    const actions = document.createElement("div");
    actions.className = "weight-compact-actions";
    actions.append(saveWeightButton, closeButton);
    weightEntry.append(fields, actions);

    summary.innerHTML = `
        <div class="metric-card"><div><h3>Trend Weight</h3><p id="latest-weight">--</p></div></div>
        <div class="metric-card"><div><h3>Weekly Trend</h3><p id="actual-weekly-weight-change">--</p></div></div>
    `;
    summary.scrollLeft = 0;

    const setOpen = open => {
        weightEntry.hidden = !open;
        addButton.textContent = open ? "Close Entry" : "+ Add Weight";
        addButton.setAttribute("aria-expanded", String(open));
        if (open) window.setTimeout(() => weightInput.focus(), 0);
    };

    addButton.addEventListener("click", () => setOpen(weightEntry.hidden));
    closeButton.addEventListener("click", () => setOpen(false));

    saveWeightButton.addEventListener("click", () => {
        if (Boolean(dateInput.value) && Number(weightInput.value) > 0) {
            window.setTimeout(() => {
                setOpen(false);
                removeGoalUi(section);
                refreshWeightSummary();
            }, 40);
        }
    }, true);

    section.addEventListener("click", event => {
        if (event.target.closest(".edit-weight-entry")) setOpen(true);
        if (event.target.closest(".remove-weight-entry")) {
            window.setTimeout(() => {
                removeGoalUi(section);
                refreshWeightSummary();
            }, 40);
        }
    });

    section.dataset.compactLayout = "weight-only-1";
}

function initializeSummaryCarousel(section) {
    const summary = section.querySelector(".weight-summary");
    if (!summary || summary.dataset.carouselReady === "1") return;

    summary.dataset.carouselReady = "1";
    let userInteracted = false;
    const timers = [];

    const markInteracted = () => {
        userInteracted = true;
        timers.splice(0).forEach(timer => window.clearTimeout(timer));
    };

    summary.addEventListener("touchstart", markInteracted, { passive: true });
    summary.addEventListener("pointerdown", markInteracted, { passive: true });
    summary.addEventListener("wheel", markInteracted, { passive: true });

    const resetIfUntouched = () => {
        if (!summary.isConnected || userInteracted) return;
        summary.scrollLeft = 0;
    };

    resetIfUntouched();
    window.requestAnimationFrame(() => {
        resetIfUntouched();
        window.requestAnimationFrame(resetIfUntouched);
    });
    [80, 220, 500].forEach(delay => timers.push(window.setTimeout(resetIfUntouched, delay)));

    const weightTab = document.getElementById("weight-tab");
    weightTab?.addEventListener("click", () => {
        window.setTimeout(() => {
            if (summary.isConnected) summary.scrollLeft = 0;
        }, 0);
    });
}

function trendTutorialStepMarkup(tutorial, stepIndex) {
    const step = tutorial.steps[stepIndex];
    const last = stepIndex === tutorial.steps.length - 1;
    return `<div class="expenditure-tutorial-progress" aria-label="Step ${stepIndex + 1} of ${tutorial.steps.length}">
            <span>${stepIndex + 1} of ${tutorial.steps.length}</span>
            <div>${tutorial.steps.map((_, index) => `<i class="${index <= stepIndex ? "is-active" : ""}"></i>`).join("")}</div>
        </div>
        <div class="expenditure-tutorial-copy">
            <span class="expenditure-tutorial-icon">${TREND_TUTORIAL_ICONS[stepIndex] || TREND_TUTORIAL_ICONS[0]}</span>
            <div><small>${step.eyebrow}</small><h3>${step.title}</h3></div>
            <p>${step.body}</p>
        </div>
        <div class="expenditure-tutorial-actions">
            <button type="button" class="expenditure-tutorial-dismiss" data-trend-tutorial-dismiss>Dismiss tutorial</button>
            <span>
                <button type="button" class="secondary-btn" data-trend-tutorial-previous ${stepIndex === 0 ? "disabled" : ""}>Previous</button>
                <button type="button" class="primary-btn" data-trend-tutorial-next>${last ? "Finish" : "Next"}</button>
            </span>
        </div>`;
}

function initializeTrendWeightTutorial(section) {
    const tutorial = getTutorial(TREND_TUTORIAL_ID);
    const summary = section.querySelector(".weight-summary");
    if (!tutorial || !summary) return;

    let card = section.querySelector("[data-trend-weight-tutorial]");
    if (!shouldShowTutorial(TREND_TUTORIAL_ID)) {
        card?.remove();
        return;
    }

    if (!card) {
        card = document.createElement("aside");
        card.className = "expenditure-tutorial-card weight-trend-tutorial-card";
        card.dataset.trendWeightTutorial = "1";
        card.setAttribute("aria-label", "Trend Weight tutorial");
        card.setAttribute("aria-live", "polite");
        summary.insertAdjacentElement("afterend", card);
    }

    const render = stepIndex => {
        setTutorialStep(TREND_TUTORIAL_ID, stepIndex);
        card.innerHTML = trendTutorialStepMarkup(tutorial, stepIndex);
    };

    const { step } = getTutorialState(TREND_TUTORIAL_ID);
    card.innerHTML = trendTutorialStepMarkup(tutorial, step);

    if (card.dataset.bound !== "1") {
        card.dataset.bound = "1";
        card.addEventListener("click", event => {
            const current = getTutorialState(TREND_TUTORIAL_ID).step;
            if (event.target.closest("[data-trend-tutorial-dismiss]")) {
                dismissTutorial(TREND_TUTORIAL_ID, current);
                card.remove();
                return;
            }
            if (event.target.closest("[data-trend-tutorial-previous]")) {
                render(Math.max(0, current - 1));
                return;
            }
            if (event.target.closest("[data-trend-tutorial-next]")) {
                if (current >= tutorial.steps.length - 1) {
                    completeTutorial(TREND_TUTORIAL_ID);
                    card.remove();
                } else {
                    render(current + 1);
                }
            }
        });
    }
}

function relocateWeeklyReviewAlertToNutritionProgress(section) {
    const summary = section.querySelector(".weight-summary");
    const nutritionProgress = document.getElementById("calorie-progress");
    if (!summary || !nutritionProgress) return;

    const moveAlert = () => {
        const alert = document.querySelector(".progress-weekly-review-alert");
        if (!alert) return;

        alert.style.marginTop = "0";
        alert.style.marginBottom = "14px";
        const statsPanel = nutritionProgress.querySelector("[data-progress-calorie-stats]");
        if (alert.parentElement !== nutritionProgress || (statsPanel && alert.nextElementSibling !== statsPanel)) {
            nutritionProgress.insertBefore(alert, statsPanel || nutritionProgress.firstChild);
        }
    };

    moveAlert();
    if (summary.dataset.weeklyReviewAlertRelocator === "1") return;

    const observer = new MutationObserver(moveAlert);
    observer.observe(summary, { childList: true, subtree: true });
    summary.dataset.weeklyReviewAlertRelocator = "1";

    document.getElementById("nutrition-progress-tab")?.addEventListener("click", () => {
        window.setTimeout(moveAlert, 0);
    });
}

function makeField(forId, labelText, input) {
    const field = document.createElement("label");
    field.className = "weight-compact-field";
    field.htmlFor = forId;
    field.innerHTML = `<span>${escapeHtml(labelText)}</span>`;
    field.appendChild(input);
    return field;
}

function refreshWeightSummary() {
    const today = getTodayLocalDate();
    const entries = readWeightEntries().filter(entry => entry.date <= today);
    const trend = calculateVisibleWeightTrend(entries);
    const trendWeight = Number.isFinite(trend.trendWeight) ? trend.trendWeight : calculateTrendWeight(entries);

    setText("latest-weight", Number.isFinite(trendWeight) ? `${trendWeight.toFixed(1)} lb` : "--");
    setText("actual-weekly-weight-change", Number.isFinite(trend.weeklyChange) ? formatLbRate(trend.weeklyChange) : "Need more data");

    const heading = document.getElementById("actual-weekly-weight-change")?.closest(".metric-card")?.querySelector("h3");
    if (heading) heading.textContent = trend.status === "preliminary" ? "Preliminary Trend" : "Weekly Trend";
}

function readWeightEntries() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]"));
    } catch {
        return [];
    }
}

function getTodayLocalDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLbRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}
