const MACRO_STORAGE_KEY = "level_up_nutrition_macro";
const MANUAL_VALUE = "manual";
let manualDraft = null;

function readSavedMacro() {
    try {
        const parsed = JSON.parse(localStorage.getItem(MACRO_STORAGE_KEY) || "null");
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch {
        return null;
    }
}

function writeSavedMacro(value) {
    localStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
}

function numberFromText(value) {
    const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
}

function getOutputElements() {
    return {
        protein: document.getElementById("nutrition-protein-target"),
        carbs: document.getElementById("nutrition-carb-target"),
        fat: document.getElementById("nutrition-fat-target"),
        calories: document.getElementById("nutrition-macro-calories")
    };
}

function getDisplayedMacros() {
    const els = getOutputElements();
    return {
        protein: numberFromText(els.protein?.textContent),
        carbs: numberFromText(els.carbs?.textContent),
        fat: numberFromText(els.fat?.textContent)
    };
}

function macroCalories(macros) {
    return {
        protein: Math.max(0, Number(macros.protein) || 0) * 4,
        carbs: Math.max(0, Number(macros.carbs) || 0) * 4,
        fat: Math.max(0, Number(macros.fat) || 0) * 9
    };
}

function macroTotalCalories(macros) {
    const cals = macroCalories(macros);
    return cals.protein + cals.carbs + cals.fat;
}

function percentages(macros) {
    const cals = macroCalories(macros);
    const total = cals.protein + cals.carbs + cals.fat;
    if (!total) return { protein: 0, carbs: 0, fat: 0 };

    const protein = Math.round((cals.protein / total) * 100);
    const carbs = Math.round((cals.carbs / total) * 100);
    const fat = Math.max(0, 100 - protein - carbs);
    return { protein, carbs, fat };
}

function setTextIfChanged(element, text) {
    if (element && element.textContent !== text) element.textContent = text;
}

function setMacroText(macros, calories = null) {
    const els = getOutputElements();
    const pct = percentages(macros);
    setTextIfChanged(els.protein, `${Math.round(macros.protein)} g/day (${pct.protein}%)`);
    setTextIfChanged(els.carbs, `${Math.round(macros.carbs)} g/day (${pct.carbs}%)`);
    setTextIfChanged(els.fat, `${Math.round(macros.fat)} g/day (${pct.fat}%)`);

    const total = Number.isFinite(Number(calories))
        ? Math.round(Number(calories))
        : Math.round(macroTotalCalories(macros));
    setTextIfChanged(els.calories, `${total.toLocaleString()} kcal/day`);
}

function decoratePresetPercentages() {
    const select = document.getElementById("nutrition-macro-select");
    if (!select || select.value === MANUAL_VALUE) return;

    const macros = getDisplayedMacros();
    if (![macros.protein, macros.carbs, macros.fat].every(Number.isFinite)) return;
    const calories = numberFromText(document.getElementById("nutrition-macro-calories")?.textContent);
    setMacroText(macros, calories);
}

function ensureManualOption() {
    const select = document.getElementById("nutrition-macro-select");
    if (!select) return null;

    if (!select.querySelector(`option[value="${MANUAL_VALUE}"]`)) {
        const option = document.createElement("option");
        option.value = MANUAL_VALUE;
        option.textContent = "Manual";
        select.appendChild(option);
    }
    return select;
}

function readManualInputs() {
    return {
        protein: Number(document.querySelector('[data-manual-macro="protein"]')?.value),
        carbs: Number(document.querySelector('[data-manual-macro="carbs"]')?.value),
        fat: Number(document.querySelector('[data-manual-macro="fat"]')?.value)
    };
}

function validMacros(macros) {
    return [macros?.protein, macros?.carbs, macros?.fat]
        .every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
}

function editableMarkup(key, value, percent) {
    return `
        <span class="macro-output-editor">
            <input data-manual-macro="${key}" type="number" inputmode="numeric" min="0" step="1" value="${Math.round(Number(value) || 0)}" aria-label="${key} grams per day">
            <span class="macro-output-unit">g/day</span>
            <span class="macro-output-percent" data-manual-percent="${key}">(${percent}%)</span>
        </span>
    `;
}

function updateManualOutputPreview() {
    const macros = readManualInputs();
    if (!validMacros(macros)) return;
    manualDraft = { ...macros };

    const pct = percentages(macros);
    ["protein", "carbs", "fat"].forEach(key => {
        const el = document.querySelector(`[data-manual-percent="${key}"]`);
        setTextIfChanged(el, `(${pct[key]}%)`);
    });

    const total = Math.round(macroTotalCalories(macros));
    setTextIfChanged(
        document.getElementById("nutrition-macro-calories"),
        `${total.toLocaleString()} kcal/day`
    );

    const plan = (() => {
        try { return JSON.parse(localStorage.getItem("level_up_nutrition_plan") || "null"); }
        catch { return null; }
    })();
    const target = Number(plan?.currentCalories);
    const message = document.getElementById("nutrition-macro-message");
    if (message && Number.isFinite(target) && target > 0) {
        const difference = total - Math.round(target);
        const abs = Math.abs(difference);
        message.textContent = abs <= 5
            ? `Manual macros match your ${Math.round(target).toLocaleString()} kcal target.`
            : `Manual macros total ${total.toLocaleString()} kcal — ${abs.toLocaleString()} kcal ${difference > 0 ? "above" : "below"} your calorie target.`;
    }
}

function renderManualMode(macros) {
    if (!validMacros(macros)) return;
    manualDraft = {
        protein: Number(macros.protein),
        carbs: Number(macros.carbs),
        fat: Number(macros.fat)
    };

    const els = getOutputElements();
    const pct = percentages(manualDraft);

    if (els.protein) els.protein.innerHTML = editableMarkup("protein", manualDraft.protein, pct.protein);
    if (els.carbs) els.carbs.innerHTML = editableMarkup("carbs", manualDraft.carbs, pct.carbs);
    if (els.fat) els.fat.innerHTML = editableMarkup("fat", manualDraft.fat, pct.fat);

    document.querySelectorAll("[data-manual-macro]").forEach(input => {
        input.addEventListener("input", updateManualOutputPreview);
    });

    const button = document.getElementById("save-nutrition-macro-btn");
    if (button) button.textContent = "Save Manual Macros";
    updateManualOutputPreview();
}

function enterManualMode() {
    const saved = readSavedMacro();
    const displayed = getDisplayedMacros();
    const macros = validMacros(manualDraft)
        ? manualDraft
        : validMacros(saved?.manualMacros)
            ? saved.manualMacros
            : validMacros(displayed)
                ? displayed
                : { protein: 160, carbs: 200, fat: 60 };

    renderManualMode(macros);

    const description = document.getElementById("nutrition-macro-description");
    if (description) {
        description.textContent = "Adjust the calculated protein, carbohydrate and fat outputs directly. Percentages and calories update automatically.";
    }
}

function leaveManualMode() {
    manualDraft = null;
    const saved = readSavedMacro();
    const baseline = saved?.autoBaseline;
    if (validMacros(baseline)) {
        setMacroText(baseline, saved?.autoBaselineCalories);
    }

    const button = document.getElementById("save-nutrition-macro-btn");
    if (button) button.textContent = "Save Macro Preference";
}

function rememberAutoBaseline() {
    const displayed = getDisplayedMacros();
    if (!validMacros(displayed)) return;

    const previous = readSavedMacro() || {};
    writeSavedMacro({
        ...previous,
        autoBaseline: displayed,
        autoBaselineCalories: numberFromText(document.getElementById("nutrition-macro-calories")?.textContent)
    });
}

function saveManualMacros(event) {
    const select = document.getElementById("nutrition-macro-select");
    if (select?.value !== MANUAL_VALUE) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const macros = readManualInputs();
    if (!validMacros(macros)) return;
    manualDraft = { ...macros };

    const previous = readSavedMacro() || {};
    writeSavedMacro({
        ...previous,
        macroPreset: previous.macroPreset || "balanced",
        useManual: true,
        manualMacros: macros,
        updatedAt: new Date().toISOString()
    });

    const message = document.getElementById("nutrition-macro-message");
    if (message) message.textContent = "Manual macro targets saved.";

    const summary = document.getElementById("planner-summary-protein");
    if (summary) summary.textContent = `${Math.round(macros.protein)} g`;
}

function repairManualEditor() {
    const select = document.getElementById("nutrition-macro-select");
    if (select?.value !== MANUAL_VALUE) return;
    if (document.querySelector('[data-manual-macro="protein"]')) return;
    enterManualMode();
}

function queueManualEditorRepair() {
    window.setTimeout(repairManualEditor, 0);
    window.setTimeout(repairManualEditor, 80);
}

function initializeManualMacroUI() {
    const select = ensureManualOption();
    if (!select) return;

    if (select.dataset.manualMacroReady === "true") {
        repairManualEditor();
        return;
    }
    select.dataset.manualMacroReady = "true";

    // Remove the old standalone manual section if a cached version is present.
    document.querySelector("[data-manual-macros]")?.remove();

    const saved = readSavedMacro();
    if (saved?.useManual && validMacros(saved.manualMacros)) {
        select.value = MANUAL_VALUE;
        enterManualMode();
    }
    else {
        decoratePresetPercentages();
    }

    select.addEventListener("change", () => {
        if (select.value === MANUAL_VALUE) {
            rememberAutoBaseline();
            const current = readSavedMacro() || {};
            current.useManual = true;
            writeSavedMacro(current);
            enterManualMode();
        }
        else {
            const current = readSavedMacro() || {};
            current.useManual = false;
            current.macroPreset = select.value;
            writeSavedMacro(current);
            leaveManualMode();
            // The existing calculator updates the selected preset when Save is tapped.
            setTimeout(decoratePresetPercentages, 0);
        }
    });

    document.getElementById("save-nutrition-macro-btn")
        ?.addEventListener("click", saveManualMacros, true);

    // After the existing preset save handler runs, add percentages to its outputs.
    document.getElementById("save-nutrition-macro-btn")
        ?.addEventListener("click", () => {
            if (select.value !== MANUAL_VALUE) setTimeout(decoratePresetPercentages, 0);
        });
}

function enhanceIfPresent() {
    if (!document.querySelector('[data-planner-view="macros"]')) return;
    initializeManualMacroUI();
}

// Keep this lightweight: no global MutationObserver, so navigation remains responsive.
const presenceTimer = window.setInterval(enhanceIfPresent, 1200);
window.addEventListener("pagehide", () => window.clearInterval(presenceTimer), { once: true });
window.addEventListener("levelup:nutrition-updated", queueManualEditorRepair);
window.addEventListener("levelup:nutrition-phase-updated", queueManualEditorRepair);
enhanceIfPresent();
