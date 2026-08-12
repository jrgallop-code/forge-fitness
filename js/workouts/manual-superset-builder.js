const PLAN_STORAGE_KEY = "forge_workout_plans";

let editingPlanId = null;
let pairingState = [];
let preSavePlanIds = new Set();

export function initializeManualSupersetBuilder(root = document) {
    const builder = root.querySelector?.("#plan-builder");
    const daysHost = root.querySelector?.("#workout-days");
    const saveButton = root.querySelector?.("#save-plan-btn");
    if (!builder || !daysHost || !saveButton || builder.dataset.manualSupersetBound === "true") return;
    builder.dataset.manualSupersetBound = "true";

    injectStyles();

    if (root.dataset?.manualSupersetDelegationBound !== "true") {
        root.dataset.manualSupersetDelegationBound = "true";
        root.addEventListener("click", handleBuilderClick);
        root.addEventListener("change", handleBuilderChange);
    }

    saveButton.addEventListener("click", () => {
        preSavePlanIds = new Set(getPlans().map(plan => plan.id));
    }, true);

    saveButton.addEventListener("click", () => {
        persistSupersetsAfterCoreSave();
    });

    decorateBuilder(daysHost);
}

function handleBuilderClick(event) {
    const target = event.target.closest?.("button");
    if (!target) return;

    if (target.id === "new-plan-btn") {
        editingPlanId = null;
        pairingState = [];
        queueDecorate();
        return;
    }

    if (target.classList.contains("secondary-btn") && target.textContent.trim() === "Edit Plan") {
        const card = target.closest("[data-custom-plan-id]");
        editingPlanId = card?.dataset.customPlanId || null;
        loadPairingState(editingPlanId);
        queueDecorate();
        return;
    }

    if (target.classList.contains("remove-exercise-btn")) {
        const dayIndex = Number(target.dataset.dayIndex);
        const exerciseIndex = Number(target.dataset.exerciseIndex);
        removePairingSlot(dayIndex, exerciseIndex);
        queueDecorate();
        return;
    }

    if (target.matches("[data-manual-superset-pair]")) {
        const dayIndex = Number(target.dataset.dayIndex);
        const exerciseIndex = Number(target.dataset.exerciseIndex);
        pairWithNext(dayIndex, exerciseIndex);
        queueDecorate();
        return;
    }

    if (target.matches("[data-manual-superset-remove]")) {
        const dayIndex = Number(target.dataset.dayIndex);
        const exerciseIndex = Number(target.dataset.exerciseIndex);
        removePair(dayIndex, exerciseIndex);
        queueDecorate();
        return;
    }

    if (target.matches(".add-exercise-btn, #add-day-btn, #save-custom-exercise-btn")) {
        queueDecorate();
    }
}

function handleBuilderChange(event) {
    if (event.target?.matches?.(".exercise-select")) {
        queueDecorate();
    }
}

function decorateBuilder(daysHost) {
    const dayCards = [...daysHost.querySelectorAll(".workout-day-card")];

    dayCards.forEach((card, dayIndex) => {
        const rows = [...card.querySelectorAll(".exercise-builder-row")];
        ensureDayState(dayIndex, rows.length);

        rows.forEach((row, exerciseIndex) => {
            const group = pairingState[dayIndex]?.[exerciseIndex] || null;
            const desiredState = group
                ? `group:${group}`
                : exerciseIndex < rows.length - 1
                    ? "pairable"
                    : "last";

            const existingControl = row.querySelector(".manual-superset-control");
            if (existingControl && row.dataset.manualSupersetState === desiredState) return;

            existingControl?.remove();
            row.classList.remove("manual-superset-member");
            row.removeAttribute("data-superset-group");

            const control = document.createElement("div");
            control.className = "manual-superset-control";

            if (group) {
                row.classList.add("manual-superset-member");
                row.dataset.supersetGroup = group;
                control.innerHTML = `<span class="manual-superset-badge">SUPERSET ${escapeHtml(group)}</span><button type="button" class="manual-superset-remove" data-manual-superset-remove data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}">Remove Superset</button>`;
            } else if (exerciseIndex < rows.length - 1) {
                control.innerHTML = `<button type="button" class="manual-superset-pair" data-manual-superset-pair data-day-index="${dayIndex}" data-exercise-index="${exerciseIndex}">↕ Superset with next</button>`;
            } else {
                control.innerHTML = `<span class="manual-superset-hint">Add another exercise to create a superset.</span>`;
            }

            row.dataset.manualSupersetState = desiredState;
            const removeButton = row.querySelector(".remove-exercise-btn");
            if (removeButton) row.insertBefore(control, removeButton);
            else row.appendChild(control);
        });
    });
}

function pairWithNext(dayIndex, exerciseIndex) {
    const day = pairingState[dayIndex];
    if (!day || exerciseIndex < 0 || exerciseIndex >= day.length - 1) return;

    clearGroupAt(day, exerciseIndex);
    clearGroupAt(day, exerciseIndex + 1);

    const group = nextGroup(day);
    day[exerciseIndex] = group;
    day[exerciseIndex + 1] = group;
}

function removePair(dayIndex, exerciseIndex) {
    const day = pairingState[dayIndex];
    if (!day) return;
    clearGroupAt(day, exerciseIndex);
}

function clearGroupAt(day, exerciseIndex) {
    const group = day[exerciseIndex];
    if (!group) return;
    for (let i = 0; i < day.length; i += 1) {
        if (day[i] === group) day[i] = null;
    }
}

function removePairingSlot(dayIndex, exerciseIndex) {
    const day = pairingState[dayIndex];
    if (!day) return;
    const group = day[exerciseIndex];
    day.splice(exerciseIndex, 1);
    if (group && day.filter(value => value === group).length < 2) {
        for (let i = 0; i < day.length; i += 1) {
            if (day[i] === group) day[i] = null;
        }
    }
}

function ensureDayState(dayIndex, length) {
    if (!Array.isArray(pairingState[dayIndex])) pairingState[dayIndex] = [];
    const day = pairingState[dayIndex];
    while (day.length < length) day.push(null);
    if (day.length > length) day.length = length;
    normalizeOrphans(day);
}

function normalizeOrphans(day) {
    const counts = day.reduce((map, group) => {
        if (group) map[group] = (map[group] || 0) + 1;
        return map;
    }, {});
    day.forEach((group, index) => {
        if (group && counts[group] < 2) day[index] = null;
    });
}

function nextGroup(day) {
    const used = new Set(day.filter(Boolean));
    let index = 1;
    while (used.has(`S${index}`)) index += 1;
    return `S${index}`;
}

function loadPairingState(planId) {
    const plan = getPlans().find(item => item.id === planId);
    pairingState = (plan?.days || []).map(day => (day.exercises || []).map(exercise => exercise.supersetGroup || null));
}

function persistSupersetsAfterCoreSave() {
    const plans = getPlans();
    let target = editingPlanId ? plans.find(plan => plan.id === editingPlanId) : null;

    if (!target) {
        target = plans.find(plan => plan?.id && !preSavePlanIds.has(plan.id)) || plans[plans.length - 1];
    }
    if (!target) return;

    (target.days || []).forEach((day, dayIndex) => {
        const groups = pairingState[dayIndex] || [];
        (day.exercises || []).forEach((exercise, exerciseIndex) => {
            const group = groups[exerciseIndex] || null;
            if (group) exercise.supersetGroup = group;
            else delete exercise.supersetGroup;
        });
    });

    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
    editingPlanId = target.id;
}

function getPlans() {
    try {
        const plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
        return Array.isArray(plans) ? plans : [];
    } catch {
        return [];
    }
}

function queueDecorate() {
    requestAnimationFrame(() => {
        const host = document.querySelector("#workout-days");
        if (host) decorateBuilder(host);
    });
}

function injectStyles() {
    if (document.getElementById("manual-superset-builder-styles")) return;
    const style = document.createElement("style");
    style.id = "manual-superset-builder-styles";
    style.textContent = `
        .manual-superset-control{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}
        .manual-superset-pair,.manual-superset-remove{border:0;background:transparent;color:#fff;font-size:.72rem;font-weight:800;padding:4px 0;cursor:pointer}
        .manual-superset-pair{color:#d4d4d8}.manual-superset-remove{color:#fca5a5}
        .manual-superset-badge{display:inline-flex;align-items:center;border:1px solid rgba(239,68,68,.45);border-radius:999px;padding:4px 8px;color:#fecaca;background:rgba(127,29,29,.24);font-size:.65rem;font-weight:900;letter-spacing:.05em}
        .manual-superset-member{border-color:rgba(239,68,68,.35)!important;box-shadow:inset 3px 0 0 rgba(239,68,68,.75)}
        .manual-superset-hint{color:var(--muted,#a1a1aa);font-size:.68rem}
    `;
    document.head.appendChild(style);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
