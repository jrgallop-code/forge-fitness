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
    const match = String(value || "").replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
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
    const elements = getOutputElements();
    return {
        protein: numberFromText(elements.protein?.textContent),
        carbs: numberFromText(elements.carbs?.textContent),
        fat: numberFromText(elements.fat?.textContent)
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
    const calories = macroCalories(macros);
    return calories.protein + calories.carbs + calories.fat;
}

function percentages(macros) {
    const calories = macroCalories(macros);
    const total = calories.protein + calories.carbs + calories.fat;
    if (!total) return { protein: 0, carbs: 0, fat: 0 };

    const protein = Math.round((calories.protein / total) * 100);
    const carbs = Math.round((calories.carbs / total) * 100);
    const fat = Math.max(0, 100 - protein - carbs);
    return { protein, carbs, fat };
}

function validMacros(macros) {
    return [macros?.protein, macros?.carbs, macros?.fat]
        .every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
}

function setTextIfChanged(element, text) {
    if (element && element.textContent !== text) element.textContent = text;
}

function updateDistribution(percent) {
    const root = document.querySelector("[data-macro-adjuster]");
    if (!root) return;

    const carbEnd = Math.max(0, Math.min(100, percent.carbs));
    const fatEnd = Math.max(carbEnd, Math.min(100, percent.carbs + percent.fat));
    root.style.setProperty("--macro-carbs", `${percent.carbs}%`);
    root.style.setProperty("--macro-fat", `${percent.fat}%`);
    root.style.setProperty("--macro-protein", `${percent.protein}%`);
    root.style.setProperty("--macro-carb-end", `${carbEnd}%`);
    root.style.setProperty("--macro-fat-end", `${fatEnd}%`);

    document.querySelector("[data-macro-distribution]")?.setAttribute(
        "aria-label",
        `Macro calorie distribution: ${percent.carbs}% carbohydrate, ${percent.fat}% fat and ${percent.protein}% protein`
    );

    const carbHandle = document.querySelector('[data-macro-handle="carbs"]');
    const fatHandle = document.querySelector('[data-macro-handle="fat"]');
    carbHandle?.setAttribute("aria-valuenow", String(percent.carbs));
    carbHandle?.setAttribute("aria-valuemax", String(Math.max(5, percent.carbs + percent.fat - 5)));
    fatHandle?.setAttribute("aria-valuemin", String(Math.min(95, percent.carbs + 5)));
    fatHandle?.setAttribute("aria-valuenow", String(percent.carbs + percent.fat));
}

function setMacroText(macros, calories = null) {
    if (!validMacros(macros)) return;

    const elements = getOutputElements();
    const percent = percentages(macros);
    setTextIfChanged(elements.protein, `${Math.round(macros.protein)} g`);
    setTextIfChanged(elements.carbs, `${Math.round(macros.carbs)} g`);
    setTextIfChanged(elements.fat, `${Math.round(macros.fat)} g`);

    ["protein", "carbs", "fat"].forEach(key => {
        setTextIfChanged(
            document.querySelector(`[data-macro-percent="${key}"]`),
            `${percent[key]}%`
        );
    });

    const total = Number.isFinite(Number(calories))
        ? Math.round(Number(calories))
        : Math.round(macroTotalCalories(macros));
    setTextIfChanged(elements.calories, `${total.toLocaleString()} cal`);
    updateDistribution(percent);
}

function decoratePresetPercentages() {
    const select = document.getElementById("nutrition-macro-select");
    if (!select || select.value === MANUAL_VALUE) return;

    const macros = getDisplayedMacros();
    if (!validMacros(macros)) return;
    const calories = numberFromText(document.getElementById("nutrition-macro-calories")?.textContent);
    setMacroText(macros, calories);
}

function ensureManualOption() {
    const select = document.getElementById("nutrition-macro-select");
    if (!select) return null;

    let option = select.querySelector(`option[value="${MANUAL_VALUE}"]`);
    if (!option) {
        option = document.createElement("option");
        option.value = MANUAL_VALUE;
        select.appendChild(option);
    }
    option.textContent = "Custom";
    return select;
}

function getManualFields() {
    return document.querySelector("[data-manual-macro-fields]");
}

function readManualInputs() {
    return {
        protein: Number(document.querySelector('[data-manual-macro="protein"]')?.value),
        carbs: Number(document.querySelector('[data-manual-macro="carbs"]')?.value),
        fat: Number(document.querySelector('[data-manual-macro="fat"]')?.value)
    };
}

function updateManualOutputPreview() {
    const macros = readManualInputs();
    if (!validMacros(macros)) return;
    manualDraft = { ...macros };
    setMacroText(macros);
    const message = document.getElementById("nutrition-macro-message");
    if (message) message.textContent = "";
}

function renderManualMode(macros) {
    if (!validMacros(macros)) return;
    manualDraft = {
        protein: Number(macros.protein),
        carbs: Number(macros.carbs),
        fat: Number(macros.fat)
    };

    const fields = getManualFields();
    if (fields) fields.hidden = false;
    document.querySelector("[data-macro-adjuster]")?.classList.add("is-custom");

    ["protein", "carbs", "fat"].forEach(key => {
        const input = document.querySelector(`[data-manual-macro="${key}"]`);
        if (!input) return;
        input.value = String(Math.round(manualDraft[key]));
        if (input.dataset.macroInputReady !== "true") {
            input.dataset.macroInputReady = "true";
            input.addEventListener("input", updateManualOutputPreview);
        }
    });

    const button = document.getElementById("save-nutrition-macro-btn");
    if (button) button.textContent = "Save Custom Macros";
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
        description.textContent = "Enter your preferred grams. Percentages, calories and both bars update as you type.";
    }
}

function leaveManualMode() {
    manualDraft = null;
    const fields = getManualFields();
    if (fields) fields.hidden = true;
    document.querySelector("[data-macro-adjuster]")?.classList.remove("is-custom");

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
    if (message) message.textContent = "Custom macro targets saved.";

    const summary = document.getElementById("planner-summary-protein");
    if (summary) summary.textContent = `${Math.round(macros.protein)} g`;
}

function displayedPercentages() {
    return {
        carbs: numberFromText(document.querySelector('[data-macro-percent="carbs"]')?.textContent) || 0,
        fat: numberFromText(document.querySelector('[data-macro-percent="fat"]')?.textContent) || 0,
        protein: numberFromText(document.querySelector('[data-macro-percent="protein"]')?.textContent) || 0
    };
}

function activateCustomMode() {
    const select = document.getElementById("nutrition-macro-select");
    if (!select || select.value === MANUAL_VALUE) return;
    select.value = MANUAL_VALUE;
    select.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyCustomPercentages(percent) {
    activateCustomMode();

    const current = getDisplayedMacros();
    const targetCalories = numberFromText(document.getElementById("nutrition-macro-calories")?.textContent)
        || Math.round(macroTotalCalories(current));
    if (!Number.isFinite(targetCalories) || targetCalories <= 0) return;

    const macros = {
        carbs: Math.round((targetCalories * percent.carbs / 100) / 4),
        fat: Math.round((targetCalories * percent.fat / 100) / 9),
        protein: Math.round((targetCalories * percent.protein / 100) / 4)
    };

    Object.entries(macros).forEach(([key, value]) => {
        const input = document.querySelector(`[data-manual-macro="${key}"]`);
        if (input) input.value = String(value);
    });
    updateManualOutputPreview();
}

function adjustBoundary(kind, boundaryPercent) {
    const percent = displayedPercentages();
    const carbEnd = percent.carbs;
    const fatEnd = percent.carbs + percent.fat;

    if (kind === "carbs") {
        const nextCarbs = Math.max(5, Math.min(fatEnd - 5, Math.round(boundaryPercent)));
        applyCustomPercentages({
            carbs: nextCarbs,
            fat: fatEnd - nextCarbs,
            protein: 100 - fatEnd
        });
        return;
    }

    const nextFatEnd = Math.max(carbEnd + 5, Math.min(95, Math.round(boundaryPercent)));
    applyCustomPercentages({
        carbs: carbEnd,
        fat: nextFatEnd - carbEnd,
        protein: 100 - nextFatEnd
    });
}

function bindBalanceControls() {
    const track = document.querySelector("[data-macro-balance-track]");
    if (!track || track.dataset.macroTrackReady === "true") return;
    track.dataset.macroTrackReady = "true";

    track.querySelectorAll("[data-macro-handle]").forEach(handle => {
        const updateFromPointer = event => {
            const bounds = track.getBoundingClientRect();
            if (!bounds.width) return;
            const position = ((event.clientX - bounds.left) / bounds.width) * 100;
            adjustBoundary(handle.dataset.macroHandle, position);
        };

        handle.addEventListener("pointerdown", event => {
            event.preventDefault();
            handle.setPointerCapture?.(event.pointerId);
            updateFromPointer(event);
        });
        handle.addEventListener("pointermove", event => {
            if (handle.hasPointerCapture?.(event.pointerId)) updateFromPointer(event);
        });
        handle.addEventListener("keydown", event => {
            if (!["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)) return;
            event.preventDefault();
            const direction = ["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1;
            const current = Number(handle.getAttribute("aria-valuenow")) || 0;
            adjustBoundary(handle.dataset.macroHandle, current + direction * (event.shiftKey ? 5 : 1));
        });
    });
}

function syncMacroPresentation() {
    const select = document.getElementById("nutrition-macro-select");
    if (!select) return;

    if (select.value === MANUAL_VALUE) {
        if (getManualFields()?.hidden || !validMacros(manualDraft)) enterManualMode();
        return;
    }
    decoratePresetPercentages();
}

function queueMacroPresentation() {
    window.setTimeout(syncMacroPresentation, 0);
    window.setTimeout(syncMacroPresentation, 80);
}

function initializeManualMacroUI() {
    const select = ensureManualOption();
    if (!select) return;

    if (select.dataset.manualMacroReady === "true") {
        syncMacroPresentation();
        return;
    }
    select.dataset.manualMacroReady = "true";
    bindBalanceControls();

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
            window.setTimeout(decoratePresetPercentages, 0);
        }
    });

    document.getElementById("save-nutrition-macro-btn")
        ?.addEventListener("click", saveManualMacros, true);

    document.getElementById("save-nutrition-macro-btn")
        ?.addEventListener("click", () => {
            if (select.value !== MANUAL_VALUE) window.setTimeout(decoratePresetPercentages, 0);
        });
}

function enhanceIfPresent() {
    if (!document.querySelector('[data-planner-view="macros"]')) return;
    initializeManualMacroUI();
}

const presenceTimer = window.setInterval(enhanceIfPresent, 1200);
window.addEventListener("pagehide", () => window.clearInterval(presenceTimer), { once: true });
window.addEventListener("levelup:nutrition-updated", queueMacroPresentation);
window.addEventListener("levelup:nutrition-phase-updated", queueMacroPresentation);
enhanceIfPresent();
