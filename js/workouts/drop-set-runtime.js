import { getExerciseById } from "./exercise-library.js?v=exercise-library-cardio-3";

const ACTIVE_KEY = "level_up_active_workout";
const SESSION_KEY = "forge_workout_sessions";
const MAX_DROPS = 3;
const DROP_LOAD_FACTOR = 0.8;
const syncTimers = new Map();

function readActive() {
    try {
        const value = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null");
        return value && typeof value === "object" ? value : null;
    } catch {
        return null;
    }
}

function saveActive(active) {
    active.updatedAt = new Date().toISOString();
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
}

function dispatchDropSync(row, set) {
    const exerciseIndex = Number(row.closest(".session-exercise-card")?.dataset.exerciseIndex);
    const setIndex = Number(row.dataset.setIndex);
    const key = `${exerciseIndex}:${setIndex}`;
    clearTimeout(syncTimers.get(key));
    syncTimers.delete(key);
    row.closest("#workout-session-logger")?.dispatchEvent(new CustomEvent("levelup:drop-sets-changed", {
        detail: { exerciseIndex, setIndex, dropSets: ensureDropSets(set).map(drop => ({ ...drop })) }
    }));
}

function persistDropSets(row, active, set, { deferSessionSync = false } = {}) {
    saveActive(active);
    if (!deferSessionSync) {
        dispatchDropSync(row, set);
        return;
    }
    const key = `${row.closest(".session-exercise-card")?.dataset.exerciseIndex}:${row.dataset.setIndex}`;
    clearTimeout(syncTimers.get(key));
    syncTimers.set(key, setTimeout(() => dispatchDropSync(row, set), 180));
}

function getContext(row) {
    const card = row.closest(".session-exercise-card");
    const exerciseIndex = Number(card?.dataset.exerciseIndex);
    const setIndex = Number(row.dataset.setIndex);
    const exerciseId = card?.dataset.exerciseId || "";
    const active = readActive();
    const set = active?.exercises?.[exerciseIndex]?.sets?.[setIndex];
    return { active, card, exerciseIndex, setIndex, exerciseId, set };
}

function getPracticalIncrement(exerciseId) {
    const exercise = getExerciseById(exerciseId);
    const equipment = String(exercise?.equipment || "").toLowerCase();
    if (equipment.includes("cable")) return 2.5;
    if (equipment.includes("dumbbell")) return 5;
    if (equipment.includes("barbell")) return 5;
    if (equipment.includes("machine")) return 5;
    if (equipment.includes("plate")) return 5;
    return 5;
}

function getSourceWeight(set) {
    const weight = Number(set?.weight ?? set?.draftWeight ?? set?.suggestedWeight);
    return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function suggestedWeight(set, exerciseId) {
    const weight = getSourceWeight(set);
    if (!weight) return null;

    const increment = getPracticalIncrement(exerciseId);
    const rawTarget = weight * DROP_LOAD_FACTOR;
    let practicalTarget = Math.round(rawTarget / increment) * increment;

    if (practicalTarget >= weight) {
        practicalTarget = weight - increment;
    }

    if (!Number.isFinite(practicalTarget) || practicalTarget <= 0) {
        return null;
    }

    return Number(practicalTarget.toFixed(1));
}

function ensureDropSets(set) {
    if (!Array.isArray(set.dropSets)) set.dropSets = [];
    return set.dropSets;
}

function moveIncompleteDropToDraft(drop) {
    if (!drop || drop.completed !== false) return false;
    let changed = false;

    if (drop.weight !== null && drop.weight !== undefined && drop.draftWeight == null) {
        drop.draftWeight = drop.weight;
        changed = true;
    }
    if (drop.reps !== null && drop.reps !== undefined && drop.draftReps == null) {
        drop.draftReps = drop.reps;
        changed = true;
    }
    if (drop.weight !== null && drop.weight !== undefined) {
        drop.weight = null;
        changed = true;
    }
    if (drop.reps !== null && drop.reps !== undefined) {
        drop.reps = null;
        changed = true;
    }

    return changed;
}

function normalizeActiveDropDrafts() {
    const active = readActive();
    if (!active) return;
    let changed = false;

    (active.exercises || []).forEach(exercise => {
        (exercise?.sets || []).forEach(set => {
            (Array.isArray(set?.dropSets) ? set.dropSets : []).forEach(drop => {
                if (moveIncompleteDropToDraft(drop)) changed = true;
            });
        });
    });

    if (changed) saveActive(active);
}

function normalizeStoredSessionDropDrafts() {
    try {
        const sessions = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
        if (!Array.isArray(sessions)) return;
        let changed = false;

        sessions.forEach(session => {
            (session?.exercises || []).forEach(exercise => {
                (exercise?.sets || []).forEach(set => {
                    (Array.isArray(set?.dropSets) ? set.dropSets : []).forEach(drop => {
                        if (moveIncompleteDropToDraft(drop)) changed = true;
                    });
                });
            });
        });

        if (changed) localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
    }
    catch {
        // Leave malformed or unavailable history untouched.
    }
}

function getDropDisplayValue(drop, field) {
    if (drop?.completed) return drop?.[field] ?? "";
    const draftKey = field === "weight" ? "draftWeight" : "draftReps";
    return drop?.[draftKey] ?? drop?.[field] ?? "";
}

function refreshSuggestedWeights(set, exerciseId) {
    const drops = ensureDropSets(set);
    let prior = set;
    drops.forEach(drop => {
        drop.suggestedWeight = suggestedWeight(prior, exerciseId);
        prior = drop;
    });
}

function updateSuggestedPlaceholders(block, set, exerciseId) {
    if (!block || !set) return;
    refreshSuggestedWeights(set, exerciseId);
    const drops = ensureDropSets(set);
    block.querySelectorAll(".drop-set-row").forEach(row => {
        const index = Number(row.dataset.dropIndex);
        const input = row.querySelector(".drop-set-weight");
        const suggestion = drops[index]?.suggestedWeight;
        if (input) input.placeholder = suggestion ?? "Weight";
    });
}

function protectDropInputs(block) {
    block.querySelectorAll(".drop-set-weight, .drop-set-reps").forEach(input => {
        ["pointerdown", "pointerup", "touchstart", "touchend", "click"].forEach(type => {
            input.addEventListener(type, event => event.stopPropagation());
        });
    });
}

function closeMenus(except = null) {
    document.querySelectorAll(".drop-set-menu").forEach(menu => {
        if (menu !== except) menu.hidden = true;
    });
}

function renderBlock(row) {
    const { set, exerciseId } = getContext(row);
    const block = row.parentElement?.querySelector(`.drop-set-block[data-parent-set="${row.dataset.setIndex}"]`);
    if (!block || !set) return;
    refreshSuggestedWeights(set, exerciseId);
    const drops = ensureDropSets(set);
    block.hidden = drops.length === 0;
    block.innerHTML = drops.map((drop, index) => `
        <div class="drop-set-row ${drop.completed ? "completed" : ""}" data-drop-index="${index}">
            <span class="drop-set-label">↳ Drop ${index + 1}</span>
            <input class="drop-set-weight" type="number" inputmode="decimal" min="0" step="${getPracticalIncrement(exerciseId)}" value="${getDropDisplayValue(drop, "weight")}" placeholder="${drop.suggestedWeight ?? "Weight"}" aria-label="Drop ${index + 1} weight">
            <input class="drop-set-reps" type="number" inputmode="numeric" min="0" step="1" value="${getDropDisplayValue(drop, "reps")}" placeholder="Reps" aria-label="Drop ${index + 1} reps">
            <button class="drop-set-complete" type="button" aria-label="Complete drop ${index + 1}">${drop.completed ? "✓" : ""}</button>
            <button class="drop-set-remove" type="button" aria-label="Remove drop ${index + 1}">×</button>
        </div>
    `).join("") + (drops.length < MAX_DROPS ? '<button class="drop-set-add-another" type="button">+ Another drop</button>' : "");
    protectDropInputs(block);
}

function appendDropRow(row, drop, index, total, exerciseId) {
    const block = row.parentElement?.querySelector(`.drop-set-block[data-parent-set="${row.dataset.setIndex}"]`);
    if (!block) return;
    const markup = `
        <div class="drop-set-row ${drop.completed ? "completed" : ""}" data-drop-index="${index}">
            <span class="drop-set-label">↳ Drop ${index + 1}</span>
            <input class="drop-set-weight" type="number" inputmode="decimal" min="0" step="${getPracticalIncrement(exerciseId)}" value="${getDropDisplayValue(drop, "weight")}" placeholder="${drop.suggestedWeight ?? "Weight"}" aria-label="Drop ${index + 1} weight">
            <input class="drop-set-reps" type="number" inputmode="numeric" min="0" step="1" value="${getDropDisplayValue(drop, "reps")}" placeholder="Reps" aria-label="Drop ${index + 1} reps">
            <button class="drop-set-complete" type="button" aria-label="Complete drop ${index + 1}">${drop.completed ? "✓" : ""}</button>
            <button class="drop-set-remove" type="button" aria-label="Remove drop ${index + 1}">×</button>
        </div>`;
    const addAnother = block.querySelector(".drop-set-add-another");
    if (addAnother) addAnother.insertAdjacentHTML("beforebegin", markup);
    else block.insertAdjacentHTML("beforeend", markup);
    block.hidden = false;
    if (total >= MAX_DROPS) block.querySelector(".drop-set-add-another")?.remove();
    else if (!block.querySelector(".drop-set-add-another")) block.insertAdjacentHTML("beforeend", '<button class="drop-set-add-another" type="button">+ Another drop</button>');
    protectDropInputs(block.querySelector(`.drop-set-row[data-drop-index="${index}"]`));
}

function addDrop(row) {
    const { active, set, exerciseId } = getContext(row);
    if (!active || !set) return;
    const drops = ensureDropSets(set);
    if (drops.length >= MAX_DROPS) return;
    refreshSuggestedWeights(set, exerciseId);
    const prior = drops.at(-1) || set;
    const drop = {
        weight: null,
        draftWeight: null,
        suggestedWeight: suggestedWeight(prior, exerciseId),
        reps: null,
        draftReps: null,
        completed: false
    };
    drops.push(drop);
    persistDropSets(row, active, set);
    const scrollTop = window.scrollY;
    appendDropRow(row, drop, drops.length - 1, drops.length, exerciseId);
    row.classList.add("has-drop-set");
    requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - scrollTop) > .5) window.scrollTo(0, scrollTop);
    });
}

function enhanceRow(row) {
    if (row.dataset.dropSetEnhanced || row.closest("#workout-session-logger")?.dataset.editingSessionId) return;
    row.dataset.dropSetEnhanced = "1";
    const number = row.querySelector(":scope > strong");
    if (!number) return;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "drop-set-menu-trigger";
    trigger.textContent = number.textContent;
    trigger.setAttribute("aria-label", `Set ${number.textContent} actions`);
    number.replaceWith(trigger);

    const menu = document.createElement("div");
    menu.className = "drop-set-menu";
    menu.dataset.parentSet = row.dataset.setIndex;
    menu.hidden = true;
    menu.innerHTML = '<button type="button" data-add-drop-set>Add Drop Set</button>';
    row.insertAdjacentElement("afterend", menu);

    const block = document.createElement("div");
    block.className = "drop-set-block";
    block.dataset.parentSet = row.dataset.setIndex;
    block.hidden = true;
    menu.insertAdjacentElement("afterend", block);

    const { set } = getContext(row);
    if (Array.isArray(set?.dropSets) && set.dropSets.length) {
        row.classList.add("has-drop-set");
        dispatchDropSync(row, set);
    }
    renderBlock(row);
}

function rowForDropControl(control) {
    const card = control?.closest(".session-exercise-card");
    const setIndex = control?.dataset.parentSet;
    if (!card || setIndex == null) return null;
    return Array.from(card.querySelectorAll(".session-set-row")).find(row => row.dataset.setIndex === setIndex) || null;
}

function enhance() {
    document.querySelectorAll("#workout-session-logger .session-set-row").forEach(enhanceRow);
}

document.addEventListener("click", event => {
    const trigger = event.target.closest(".drop-set-menu-trigger");
    if (trigger) {
        const row = trigger.closest(".session-set-row");
        const { set } = getContext(row);
        if ((Array.isArray(set?.dropSets) ? set.dropSets.length : 0) < MAX_DROPS) addDrop(row);
        return;
    }

    const add = event.target.closest("[data-add-drop-set]");
    if (add) {
        const menu = add.closest(".drop-set-menu");
        const row = rowForDropControl(menu);
        if (row?.matches(".session-set-row")) addDrop(row);
        menu.hidden = true;
        return;
    }

    const block = event.target.closest(".drop-set-block");
    if (block) {
        const row = rowForDropControl(block);
        if (!row?.matches(".session-set-row")) return;
        const { active, set, exerciseId } = getContext(row);
        if (!active || !set) return;
        const drops = ensureDropSets(set);
        const dropRow = event.target.closest(".drop-set-row");
        const dropIndex = Number(dropRow?.dataset.dropIndex);
        const remove = event.target.closest(".drop-set-remove");
        const complete = event.target.closest(".drop-set-complete");
        if (event.target.closest(".drop-set-add-another")) {
            addDrop(row);
            return;
        }
        if (!remove && !complete) return;
        if (complete && Number.isInteger(dropIndex)) {
            const drop = drops[dropIndex];
            const completing = !drop.completed;

            if (completing) {
                drop.completed = true;
                drop.weight = drop.draftWeight ?? drop.weight ?? null;
                drop.reps = drop.draftReps ?? drop.reps ?? null;
                drop.draftWeight = null;
                drop.draftReps = null;
            }
            else {
                drop.completed = false;
                drop.draftWeight = drop.weight ?? drop.draftWeight ?? null;
                drop.draftReps = drop.reps ?? drop.draftReps ?? null;
                drop.weight = null;
                drop.reps = null;
            }

            refreshSuggestedWeights(set, exerciseId);
            persistDropSets(row, active, set);
            dropRow.classList.toggle("completed", drop.completed);
            complete.textContent = drop.completed ? "✓" : "";
            updateSuggestedPlaceholders(block, set, exerciseId);
            return;
        }
        if (remove && Number.isInteger(dropIndex)) drops.splice(dropIndex, 1);
        refreshSuggestedWeights(set, exerciseId);
        persistDropSets(row, active, set);
        row.classList.toggle("has-drop-set", drops.length > 0);
        renderBlock(row);
        return;
    }

    closeMenus();
});

document.addEventListener("input", event => {
    const input = event.target.closest(".drop-set-weight, .drop-set-reps");
    if (!input) return;
    const dropRow = input.closest(".drop-set-row");
    const block = input.closest(".drop-set-block");
    const row = rowForDropControl(block);
    if (!row?.matches(".session-set-row")) return;
    const { active, set, exerciseId } = getContext(row);
    if (!active || !set || !dropRow) return;
    const drop = ensureDropSets(set)[Number(dropRow.dataset.dropIndex)];
    if (!drop) return;

    const field = input.matches(".drop-set-weight") ? "weight" : "reps";
    const value = input.value === "" ? null : Number(input.value);
    if (drop.completed) {
        drop[field] = value;
    }
    else {
        const draftKey = field === "weight" ? "draftWeight" : "draftReps";
        drop[draftKey] = value;
        drop[field] = null;
    }

    if (field === "weight") {
        refreshSuggestedWeights(set, exerciseId);
        updateSuggestedPlaceholders(block, set, exerciseId);
    }
    persistDropSets(row, active, set, { deferSessionSync: true });
});

normalizeActiveDropDrafts();
normalizeStoredSessionDropDrafts();
new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
enhance();
