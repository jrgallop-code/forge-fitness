import { calculateDisplayWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=progress-regression-trend-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const DAY_MS = 86400000;

export function initializeWeightProgressCompact() {
    const section = document.getElementById("weight-progress");
    if (!section) return;
    removeGoalUi(section);
    compactWeightProgress(section);
    refreshWeightSummary();
    initializeSummaryCarousel(section);
    relocateCalorieSummaryToNutritionProgress(section);
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

function relocateCalorieSummaryToNutritionProgress(section) {
    const summary = section.querySelector(".weight-summary");
    const nutritionProgress = document.getElementById("calorie-progress");
    if (!summary || !nutritionProgress) return;

    ensureNutritionCalorieSummaryStyles();

    const moveCard = () => {
        const card = document.getElementById("weight-calorie-suggestion-card");
        if (!card) return;

        card.classList.add("nutrition-progress-calorie-summary-card");
        const statsPanel = nutritionProgress.querySelector("[data-progress-calorie-stats]");
        if (card.parentElement !== nutritionProgress || (statsPanel && card.nextElementSibling !== statsPanel)) {
            nutritionProgress.insertBefore(card, statsPanel || nutritionProgress.firstChild);
        }
    };

    moveCard();
    if (summary.dataset.calorieSummaryRelocator === "1") return;

    const observer = new MutationObserver(moveCard);
    observer.observe(summary, { childList: true });
    summary.dataset.calorieSummaryRelocator = "1";
}

function ensureNutritionCalorieSummaryStyles() {
    if (document.getElementById("nutrition-progress-calorie-summary-styles")) return;

    const style = document.createElement("style");
    style.id = "nutrition-progress-calorie-summary-styles";
    style.textContent = `
        #calorie-progress > .nutrition-progress-calorie-summary-card{
            margin:0 0 12px;
            min-height:0;
            padding:14px 16px;
        }
        #calorie-progress > .nutrition-progress-calorie-summary-card h3{
            margin:0;
            color:var(--muted,#a1a1aa);
            font-size:10px;
            line-height:1.2;
            letter-spacing:.08em;
            text-transform:uppercase;
        }
        #calorie-progress > .nutrition-progress-calorie-summary-card p{
            margin:6px 0 0;
            font-size:20px;
            line-height:1.1;
            font-weight:700;
        }
        #calorie-progress > .nutrition-progress-calorie-summary-card small{
            display:block;
            margin-top:5px;
            color:var(--muted,#a1a1aa);
            font-size:11px;
            line-height:1.35;
        }
    `;
    document.head.appendChild(style);
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
    const entries = readWeightEntries();
    const trendWeight = getTrendWeight(entries);
    const trend = calculateDisplayWeightTrend(entries);

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

function getTrendWeight(entries) {
    const normalized = normalizeWeightEntries(entries);
    if (!normalized.length) return null;
    const latest = normalized.at(-1);
    const latestTime = new Date(`${latest.date}T12:00:00`).getTime();
    const cutoff = latestTime - (6 * DAY_MS);
    const recent = normalized.filter(entry => {
        const time = new Date(`${entry.date}T12:00:00`).getTime();
        return time >= cutoff && time <= latestTime;
    });
    if (!recent.length) return latest.weight;
    return recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length;
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