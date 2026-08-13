import { calculateWeightTrend } from "../core/weight-trend.js?v=current-goal-1";
import {
    CURRENT_GOAL_TYPES,
    getCurrentGoal,
    getCurrentGoalMetrics,
    getCurrentTrendWeight,
    getGoalHistory,
    readWeightEntries,
    startCurrentGoal,
    startMaintenanceAtCurrentTrend
} from "../core/current-goal.js?v=current-goal-1";

let globalEventsBound = false;
let draft = null;

export function initializeWeightProgressCompact() {
    const section = document.getElementById("weight-progress");
    if (!section) return;
    compactWeightProgress(section);
    renderCurrentGoalArea(section);
    refreshWeightSummary();
    bindGlobalRefresh();
}

function compactWeightProgress(section) {
    if (section.dataset.compactLayout === "current-goal-1") return;

    const header = section.querySelector(".weight-section-header");
    const entryCards = [...section.querySelectorAll(".weight-entry-card")];
    const weightEntry = entryCards[0];
    const legacyGoalEntry = entryCards[1];
    const summary = section.querySelector(".weight-summary");
    if (!header || !weightEntry || !summary) return;

    legacyGoalEntry?.remove();
    section.querySelector(".weight-goal-settings")?.remove();

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
        <div class="metric-card"><div><h3>Goal</h3><p id="goal-weight-summary">--</p></div></div>
        <div class="metric-card"><div><h3>Weekly Trend</h3><p id="actual-weekly-weight-change">--</p></div></div>
    `;

    const goalHost = document.createElement("div");
    goalHost.id = "current-goal-host";
    summary.insertAdjacentElement("afterend", goalHost);

    const wizard = document.createElement("section");
    wizard.id = "current-goal-wizard";
    wizard.className = "current-goal-wizard";
    wizard.hidden = true;
    goalHost.insertAdjacentElement("afterend", wizard);

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
                refreshWeightSummary();
                renderCurrentGoalArea(section);
            }, 30);
        }
    }, true);

    section.addEventListener("click", event => {
        if (event.target.closest(".edit-weight-entry")) setOpen(true);
        if (event.target.closest(".remove-weight-entry")) {
            window.setTimeout(() => {
                refreshWeightSummary();
                renderCurrentGoalArea(section);
            }, 30);
        }
        handleGoalClick(event, section);
    });

    section.addEventListener("change", event => {
        if (!draft) return;
        if (event.target.matches("[data-goal-experience]")) {
            draft.trainingExperience = event.target.value;
            draft.ratePct = defaultGainRate(draft.trainingExperience);
            renderGoalWizard(section);
        }
        if (event.target.matches("[data-goal-target-weight]")) {
            draft.targetWeight = Number(event.target.value);
        }
    });

    section.dataset.compactLayout = "current-goal-1";
}

function makeField(forId, labelText, input) {
    const field = document.createElement("label");
    field.className = "weight-compact-field";
    field.htmlFor = forId;
    field.innerHTML = `<span>${escapeHtml(labelText)}</span>`;
    field.appendChild(input);
    return field;
}

function bindGlobalRefresh() {
    if (globalEventsBound) return;
    globalEventsBound = true;
    const refresh = () => {
        const section = document.getElementById("weight-progress");
        if (!section) return;
        refreshWeightSummary();
        renderCurrentGoalArea(section);
    };
    window.addEventListener("levelup:nutrition-updated", refresh);
    window.addEventListener("levelup:current-goal-updated", refresh);
}

function refreshWeightSummary() {
    const entries = readWeightEntries();
    const trendWeight = getCurrentTrendWeight(entries);
    const trend = calculateWeightTrend(entries);
    const goal = getCurrentGoal();

    setText("latest-weight", Number.isFinite(trendWeight) ? `${trendWeight.toFixed(1)} lb` : "--");
    setText("goal-weight-summary", Number.isFinite(Number(goal?.targetWeight)) ? `${Number(goal.targetWeight).toFixed(1)} lb` : "--");
    setText("actual-weekly-weight-change", Number.isFinite(trend.weeklyChange) ? formatLbRate(trend.weeklyChange) : "Need more data");

    const heading = document.getElementById("actual-weekly-weight-change")?.closest(".metric-card")?.querySelector("h3");
    if (heading) heading.textContent = trend.status === "preliminary" ? "Preliminary Trend" : "Weekly Trend";
}

function renderCurrentGoalArea(section) {
    const host = section.querySelector("#current-goal-host");
    if (!host) return;
    const goal = getCurrentGoal();
    const metrics = getCurrentGoalMetrics(goal);

    if (!goal) {
        const hasWeight = Number.isFinite(metrics.trendWeight);
        host.innerHTML = `
            <article class="current-goal-card">
                <div class="current-goal-card-head"><div><span class="eyebrow">CURRENT GOAL</span><h3>No active goal</h3></div></div>
                <p>${hasWeight ? "Set a goal to track your progress." : "Add a weight first, then set a goal."}</p>
                <button class="primary-btn" type="button" data-open-goal-wizard ${hasWeight ? "" : "disabled"}>Set Weight Goal</button>
                ${renderGoalHistory()}
            </article>
        `;
        return;
    }

    const start = Number(goal.startingTrendWeight);
    const target = Number(goal.targetWeight);
    const actualText = Number.isFinite(metrics.actualRatePctPerWeek)
        ? formatPct(metrics.actualRatePctPerWeek)
        : metrics.phaseTrend?.status === "preliminary"
            ? "Preliminary"
            : "Calibrating";
    const dateText = metrics.estimatedGoalDate ? formatDate(metrics.estimatedGoalDate) : goal.type === "maintenance" ? "Ongoing" : "--";

    host.innerHTML = `
        <article class="current-goal-card">
            <div class="current-goal-card-head">
                <div><span class="eyebrow">CURRENT GOAL</span><h3>${escapeHtml(CURRENT_GOAL_TYPES[goal.type] || "Current Goal")}</h3></div>
                <span class="current-goal-status">${escapeHtml(metrics.status)}</span>
            </div>
            <div class="current-goal-route"><strong>${Number.isFinite(start) ? `${start.toFixed(1)} lb` : "--"}</strong><span>→</span><strong>${Number.isFinite(target) ? `${target.toFixed(1)} lb` : "--"}</strong></div>
            <div class="current-goal-metrics">
                <div><span>Target</span><strong>${goal.type === "maintenance" ? "Maintain" : formatPct(goal.targetRatePctPerWeek)}</strong></div>
                <div><span>Actual</span><strong>${actualText}</strong></div>
                <div><span>Estimated Goal</span><strong>${dateText}</strong></div>
            </div>
            <div class="current-goal-actions">
                <button class="secondary-btn" type="button" data-open-goal-wizard>Edit Goal</button>
                ${metrics.goalReached ? '<button class="primary-btn" type="button" data-new-goal>Start New Goal</button><button class="secondary-btn" type="button" data-maintain-current>Maintain This Weight</button>' : ""}
            </div>
            ${renderGoalHistory()}
        </article>
    `;
}

function renderGoalHistory() {
    const history = getGoalHistory().filter(item => item.endDate).slice(0, 6);
    if (!history.length) return "";
    return `
        <details class="current-goal-history">
            <summary>Goal History</summary>
            <div>${history.map(item => `
                <div class="current-goal-history-row">
                    <div><strong>${escapeHtml(CURRENT_GOAL_TYPES[item.type] || "Goal")}</strong><small>${formatDate(item.startDate)} – ${item.endDate ? formatDate(item.endDate) : "Present"}</small></div>
                    <div><strong>${Number.isFinite(item.startWeight) ? `${item.startWeight.toFixed(1)} lb` : "--"} → ${Number.isFinite(item.endWeight) ? `${item.endWeight.toFixed(1)} lb` : "--"}</strong></div>
                </div>
            `).join("")}</div>
        </details>
    `;
}

function handleGoalClick(event, section) {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.matches("[data-open-goal-wizard]")) {
        openGoalWizard(section, getCurrentGoal());
        return;
    }
    if (button.matches("[data-new-goal]")) {
        openGoalWizard(section, null);
        return;
    }
    if (button.matches("[data-maintain-current]")) {
        startMaintenanceAtCurrentTrend();
        closeGoalWizard(section);
        refreshWeightSummary();
        renderCurrentGoalArea(section);
        document.getElementById("weight-tab")?.click();
        return;
    }
    if (button.dataset.goalType) {
        draft.type = button.dataset.goalType;
        const trend = getCurrentTrendWeight();
        if (draft.type === "maintenance" && Number.isFinite(trend)) draft.targetWeight = Number(trend.toFixed(1));
        if (draft.type === "fat_loss") draft.ratePct = -0.5;
        if (draft.type === "muscle_gain") {
            draft.trainingExperience = draft.trainingExperience || "intermediate";
            draft.ratePct = defaultGainRate(draft.trainingExperience);
        }
        draft.step = 2;
        renderGoalWizard(section);
        return;
    }
    if (button.dataset.goalRate) {
        draft.ratePct = Number(button.dataset.goalRate);
        renderGoalWizard(section);
        return;
    }
    if (button.matches("[data-goal-back]")) {
        draft.step = Math.max(1, draft.step - 1);
        renderGoalWizard(section);
        return;
    }
    if (button.matches("[data-goal-next]")) {
        advanceGoalWizard(section);
        return;
    }
    if (button.matches("[data-goal-start]")) {
        const goal = startCurrentGoal(draft);
        if (!goal) {
            setText("current-goal-wizard-message", "Check the goal weight and pace, then try again.");
            return;
        }
        closeGoalWizard(section);
        refreshWeightSummary();
        renderCurrentGoalArea(section);
        document.getElementById("weight-tab")?.click();
        return;
    }
    if (button.matches("[data-goal-cancel]")) closeGoalWizard(section);
}

function openGoalWizard(section, existing) {
    const trend = getCurrentTrendWeight();
    draft = {
        step: 1,
        type: existing?.type || null,
        targetWeight: Number(existing?.targetWeight) || (Number.isFinite(trend) ? Number(trend.toFixed(1)) : null),
        ratePct: Number(existing?.targetRatePctPerWeek) || null,
        trainingExperience: existing?.trainingExperience || "intermediate"
    };
    const wizard = section.querySelector("#current-goal-wizard");
    if (wizard) wizard.hidden = false;
    renderGoalWizard(section);
    wizard?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeGoalWizard(section) {
    const wizard = section.querySelector("#current-goal-wizard");
    if (wizard) {
        wizard.hidden = true;
        wizard.innerHTML = "";
    }
    draft = null;
}

function advanceGoalWizard(section) {
    if (!draft) return;
    if (draft.step === 2) {
        const value = Number(section.querySelector("[data-goal-target-weight]")?.value ?? draft.targetWeight);
        const trend = getCurrentTrendWeight();
        if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(trend)) {
            setText("current-goal-wizard-message", "Enter a valid goal weight.");
            return;
        }
        if (draft.type === "fat_loss" && value >= trend) {
            setText("current-goal-wizard-message", "For fat loss, choose a goal weight below your current trend.");
            return;
        }
        if (draft.type === "muscle_gain" && value <= trend) {
            setText("current-goal-wizard-message", "For muscle gain, choose a goal weight above your current trend.");
            return;
        }
        draft.targetWeight = value;
        draft.step = 3;
        renderGoalWizard(section);
        return;
    }
    if (draft.step === 3) {
        if (draft.type !== "maintenance" && !Number.isFinite(Number(draft.ratePct))) {
            setText("current-goal-wizard-message", "Choose a pace.");
            return;
        }
        draft.step = 4;
        renderGoalWizard(section);
    }
}

function renderGoalWizard(section) {
    const wizard = section.querySelector("#current-goal-wizard");
    if (!wizard || !draft) return;
    const trend = getCurrentTrendWeight();

    let body = "";
    if (draft.step === 1) {
        body = `
            <span class="eyebrow">STEP 1</span><h3>What's your goal?</h3>
            <div class="current-goal-choice-grid">
                ${goalChoice("fat_loss", "Lose Fat", "Reduce body weight while prioritizing muscle retention.")}
                ${goalChoice("muscle_gain", "Build Muscle", "Gradually increase body weight while limiting unnecessary fat gain.")}
                ${goalChoice("maintenance", "Maintain", "Keep body weight relatively stable.")}
            </div>
            <div class="current-goal-wizard-actions"><button class="secondary-btn" type="button" data-goal-cancel>Cancel</button></div>
        `;
    } else if (draft.step === 2) {
        body = `
            <span class="eyebrow">STEP 2</span><h3>Goal Weight</h3>
            <div class="current-goal-summary-line"><span>Current Trend</span><strong>${Number.isFinite(trend) ? `${trend.toFixed(1)} lb` : "--"}</strong></div>
            <label class="current-goal-field">Goal Weight (lb)<input data-goal-target-weight type="number" min="1" step="0.1" value="${Number.isFinite(draft.targetWeight) ? draft.targetWeight : ""}"></label>
            <p class="current-goal-note">${draft.type === "maintenance" ? "Maintenance uses this weight as the centre of your target zone." : draft.type === "fat_loss" ? "Choose a target below your current trend." : "Choose a target above your current trend."}</p>
            ${wizardActions(true, true)}
        `;
    } else if (draft.step === 3) {
        body = renderPaceStep();
    } else {
        const signedPct = draft.type === "fat_loss" ? -Math.abs(Number(draft.ratePct)) : draft.type === "muscle_gain" ? Math.abs(Number(draft.ratePct)) : 0;
        const lbRate = Number.isFinite(trend) ? trend * (signedPct / 100) : null;
        const weeks = estimateWeeks(trend, draft.targetWeight, signedPct);
        body = `
            <span class="eyebrow">YOUR ${escapeHtml((CURRENT_GOAL_TYPES[draft.type] || "GOAL").toUpperCase())} PLAN</span><h3>Goal Summary</h3>
            <div class="current-goal-review">
                <div><span>Current Trend</span><strong>${Number.isFinite(trend) ? `${trend.toFixed(1)} lb` : "--"}</strong></div>
                <div><span>Goal</span><strong>${Number(draft.targetWeight).toFixed(1)} lb</strong></div>
                <div><span>Target Pace</span><strong>${draft.type === "maintenance" ? "Maintain" : formatPct(signedPct)}${Number.isFinite(lbRate) ? `<small>≈ ${formatLbRate(lbRate)}</small>` : ""}</strong></div>
                <div><span>Estimated Time</span><strong>${Number.isFinite(weeks) ? `~${weeks} weeks` : "Ongoing"}</strong></div>
            </div>
            <p class="current-goal-note">The estimated timeline moves with your progress. Level Up will not make the target more aggressive to catch up to an old date.</p>
            <div class="current-goal-wizard-actions"><button class="secondary-btn" type="button" data-goal-back>Back</button><button class="primary-btn" type="button" data-goal-start>Start Goal</button><button class="secondary-btn" type="button" data-goal-cancel>Cancel</button></div>
        `;
    }

    wizard.innerHTML = `<article class="current-goal-wizard-card">${body}<p id="current-goal-wizard-message" class="nutrition-message" aria-live="polite"></p></article>`;
}

function renderPaceStep() {
    if (draft.type === "maintenance") {
        draft.ratePct = 0;
        return `
            <span class="eyebrow">STEP 3</span><h3>Choose Pace</h3>
            <p>Maintenance targets a stable trend around your goal weight rather than a weekly loss or gain rate.</p>
            ${wizardActions(true, true)}
        `;
    }

    if (draft.type === "fat_loss") {
        const options = [
            [-0.25, "Conservative", "0.25% / week"],
            [-0.50, "Balanced — Recommended", "0.50% / week"],
            [-0.75, "Faster", "0.75% / week"],
            [-1.00, "Aggressive", "1.00% / week"]
        ];
        return `
            <span class="eyebrow">STEP 3</span><h3>Choose Pace</h3>
            <div class="current-goal-pace-grid">${options.map(([value, label, copy]) => paceChoice(value, label, copy)).join("")}</div>
            <p class="current-goal-note">Balanced is the default. Aggressive loss is never selected automatically.</p>
            ${wizardActions(true, true)}
        `;
    }

    const options = gainOptions(draft.trainingExperience);
    return `
        <span class="eyebrow">STEP 3</span><h3>Choose Pace</h3>
        <label class="current-goal-field">Training Experience
            <select data-goal-experience>
                <option value="beginner" ${draft.trainingExperience === "beginner" ? "selected" : ""}>Beginner</option>
                <option value="intermediate" ${draft.trainingExperience === "intermediate" ? "selected" : ""}>Intermediate</option>
                <option value="experienced" ${draft.trainingExperience === "experienced" ? "selected" : ""}>Experienced</option>
            </select>
        </label>
        <div class="current-goal-pace-grid">${options.map(([value, label, copy]) => paceChoice(value, label, copy)).join("")}</div>
        <p class="current-goal-note">Faster weight gain generally increases fat gain more reliably than it increases muscle gain.</p>
        ${wizardActions(true, true)}
    `;
}

function goalChoice(type, title, copy) {
    return `<button class="current-goal-choice" type="button" data-goal-type="${type}"><strong>${title}</strong><small>${copy}</small></button>`;
}

function paceChoice(value, title, copy) {
    const selected = Math.abs(Number(draft.ratePct) - Number(value)) < 0.001;
    return `<button class="current-goal-pace ${selected ? "selected" : ""}" type="button" data-goal-rate="${value}"><strong>${title}</strong><small>${copy}</small></button>`;
}

function wizardActions(back, next) {
    return `<div class="current-goal-wizard-actions">${back ? '<button class="secondary-btn" type="button" data-goal-back>Back</button>' : ""}${next ? '<button class="primary-btn" type="button" data-goal-next>Continue</button>' : ""}<button class="secondary-btn" type="button" data-goal-cancel>Cancel</button></div>`;
}

function gainOptions(experience) {
    if (experience === "beginner") return [[0.20, "Conservative", "0.20% / week"], [0.50, "Balanced — Recommended", "0.50% / week"]];
    if (experience === "experienced") return [[0.10, "Conservative", "0.10% / week"], [0.15, "Balanced — Recommended", "0.15% / week"]];
    return [[0.15, "Conservative", "0.15% / week"], [0.30, "Balanced — Recommended", "0.30% / week"]];
}

function defaultGainRate(experience) {
    return experience === "beginner" ? 0.50 : experience === "experienced" ? 0.15 : 0.30;
}

function estimateWeeks(currentWeight, targetWeight, signedPct) {
    if (!Number.isFinite(currentWeight) || !Number.isFinite(Number(targetWeight)) || !Number.isFinite(signedPct) || Math.abs(signedPct) < 0.001) return null;
    let weight = currentWeight;
    const target = Number(targetWeight);
    const multiplier = 1 + signedPct / 100;
    let weeks = 0;
    while (weeks < 520) {
        if ((signedPct < 0 && weight <= target) || (signedPct > 0 && weight >= target)) return weeks;
        weight *= multiplier;
        weeks += 1;
    }
    return null;
}

function formatPct(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (Math.abs(number) < 0.005) return "Maintain";
    const sign = number > 0 ? "+" : "−";
    return `${sign}${Math.abs(number).toFixed(2)}% / week`;
}

function formatLbRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function formatDate(value) {
    if (!value) return "--";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: value.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric" });
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}
