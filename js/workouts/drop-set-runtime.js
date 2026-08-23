const ACTIVE_KEY = "level_up_active_workout";
const MAX_DROPS = 3;

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

function getContext(row) {
    const card = row.closest(".session-exercise-card");
    const exerciseIndex = Number(card?.dataset.exerciseIndex);
    const setIndex = Number(row.dataset.setIndex);
    const active = readActive();
    const set = active?.exercises?.[exerciseIndex]?.sets?.[setIndex];
    return { active, card, exerciseIndex, setIndex, set };
}

function suggestedWeight(set) {
    const weight = Number(set?.weight ?? set?.suggestedWeight);
    if (!Number.isFinite(weight) || weight <= 0) return null;
    return Math.round(weight * .8 * 2) / 2;
}

function ensureDropSets(set) {
    if (!Array.isArray(set.dropSets)) set.dropSets = [];
    return set.dropSets;
}

function closeMenus(except = null) {
    document.querySelectorAll(".drop-set-menu").forEach(menu => {
        if (menu !== except) menu.hidden = true;
    });
}

function renderBlock(row) {
    const { set } = getContext(row);
    const block = row.parentElement?.querySelector(`.drop-set-block[data-parent-set="${row.dataset.setIndex}"]`);
    if (!block || !set) return;
    const drops = ensureDropSets(set);
    block.hidden = drops.length === 0;
    block.innerHTML = drops.map((drop, index) => `
        <div class="drop-set-row ${drop.completed ? "completed" : ""}" data-drop-index="${index}">
            <span class="drop-set-label">↳ Drop ${index + 1}</span>
            <input class="drop-set-weight" type="number" inputmode="decimal" min="0" step="0.5" value="${drop.weight ?? ""}" placeholder="${drop.suggestedWeight ?? suggestedWeight(index ? drops[index - 1] : set) ?? "Weight"}" aria-label="Drop ${index + 1} weight">
            <input class="drop-set-reps" type="number" inputmode="numeric" min="0" step="1" value="${drop.reps ?? ""}" placeholder="Reps" aria-label="Drop ${index + 1} reps">
            <button class="drop-set-complete" type="button" aria-label="Complete drop ${index + 1}">${drop.completed ? "✓" : ""}</button>
            <button class="drop-set-remove" type="button" aria-label="Remove drop ${index + 1}">×</button>
        </div>
    `).join("") + (drops.length < MAX_DROPS ? '<button class="drop-set-add-another" type="button">+ Another drop</button>' : "");
}

function addDrop(row) {
    const { active, set } = getContext(row);
    if (!active || !set) return;
    const drops = ensureDropSets(set);
    if (drops.length >= MAX_DROPS) return;
    const prior = drops.at(-1) || set;
    drops.push({ weight: null, suggestedWeight: suggestedWeight(prior), reps: null, completed: false });
    saveActive(active);
    renderBlock(row);
    row.classList.add("has-drop-set");
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
    menu.hidden = true;
    menu.innerHTML = '<button type="button" data-add-drop-set>Add Drop Set</button>';
    row.insertAdjacentElement("afterend", menu);

    const block = document.createElement("div");
    block.className = "drop-set-block";
    block.dataset.parentSet = row.dataset.setIndex;
    block.hidden = true;
    menu.insertAdjacentElement("afterend", block);

    const { set } = getContext(row);
    if (Array.isArray(set?.dropSets) && set.dropSets.length) row.classList.add("has-drop-set");
    renderBlock(row);
}

function enhance() {
    document.querySelectorAll("#workout-session-logger .session-set-row").forEach(enhanceRow);
}

document.addEventListener("click", event => {
    const trigger = event.target.closest(".drop-set-menu-trigger");
    if (trigger) {
        const row = trigger.closest(".session-set-row");
        const menu = row?.nextElementSibling?.matches(".drop-set-menu") ? row.nextElementSibling : null;
        if (!menu) return;
        const opening = menu.hidden;
        closeMenus(menu);
        menu.hidden = !opening;
        return;
    }

    const add = event.target.closest("[data-add-drop-set]");
    if (add) {
        const menu = add.closest(".drop-set-menu");
        const row = menu?.previousElementSibling;
        if (row?.matches(".session-set-row")) addDrop(row);
        menu.hidden = true;
        return;
    }

    const block = event.target.closest(".drop-set-block");
    if (block) {
        const menu = block.previousElementSibling;
        const row = menu?.previousElementSibling;
        if (!row?.matches(".session-set-row")) return;
        const { active, set } = getContext(row);
        if (!active || !set) return;
        const drops = ensureDropSets(set);
        const dropRow = event.target.closest(".drop-set-row");
        const dropIndex = Number(dropRow?.dataset.dropIndex);
        if (event.target.closest(".drop-set-remove") && Number.isInteger(dropIndex)) drops.splice(dropIndex, 1);
        if (event.target.closest(".drop-set-complete") && Number.isInteger(dropIndex)) drops[dropIndex].completed = !drops[dropIndex].completed;
        if (event.target.closest(".drop-set-add-another")) {
            addDrop(row);
            return;
        }
        saveActive(active);
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
    const row = block?.previousElementSibling?.previousElementSibling;
    if (!row?.matches(".session-set-row")) return;
    const { active, set } = getContext(row);
    const drop = ensureDropSets(set)[Number(dropRow.dataset.dropIndex)];
    if (!active || !drop) return;
    drop[input.matches(".drop-set-weight") ? "weight" : "reps"] = input.value === "" ? null : Number(input.value);
    saveActive(active);
});

new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
enhance();
