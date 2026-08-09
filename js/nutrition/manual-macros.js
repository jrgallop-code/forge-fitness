const MACRO_STORAGE_KEY = "level_up_nutrition_macro";

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

function getDisplayedMacros() {
    return {
        protein: numberFromText(document.getElementById("nutrition-protein-target")?.textContent),
        carbs: numberFromText(document.getElementById("nutrition-carb-target")?.textContent),
        fat: numberFromText(document.getElementById("nutrition-fat-target")?.textContent)
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
    const pct = percentages(macros);
    const protein = document.getElementById("nutrition-protein-target");
    const carbs = document.getElementById("nutrition-carb-target");
    const fat = document.getElementById("nutrition-fat-target");
    const caloriesEl = document.getElementById("nutrition-macro-calories");

    setTextIfChanged(protein, `${Math.round(macros.protein)} g/day (${pct.protein}%)`);
    setTextIfChanged(carbs, `${Math.round(macros.carbs)} g/day (${pct.carbs}%)`);
    setTextIfChanged(fat, `${Math.round(macros.fat)} g/day (${pct.fat}%)`);

    const total = Number.isFinite(Number(calories))
        ? Math.round(Number(calories))
        : Math.round(macroTotalCalories(macros));

    setTextIfChanged(caloriesEl, `${total.toLocaleString()} kcal/day`);
}

function targetCalories() {
    const plan = (() => {
        try {
            return JSON.parse(localStorage.getItem("level_up_nutrition_plan") || "null");
        }
        catch {
            return null;
        }
    })();

    const active = Number(plan?.currentCalories);
    if (Number.isFinite(active) && active > 0) return active;

    return numberFromText(document.getElementById("nutrition-macro-calories")?.textContent);
}

function renderManualStatus(macros) {
    const status = document.getElementById("manual-macro-status");
    if (!status) return;

    const total = Math.round(macroTotalCalories(macros));
    const target = targetCalories();
    let text;
    let state;

    if (!Number.isFinite(target) || target <= 0) {
        text = `${total.toLocaleString()} kcal from your manual macros.`;
        state = "neutral";
    }
    else {
        const difference = total - Math.round(target);
        const abs = Math.abs(difference);
        text = abs <= 5
            ? `${total.toLocaleString()} kcal — matches your ${Math.round(target).toLocaleString()} kcal target.`
            : `${total.toLocaleString()} kcal from macros — ${abs.toLocaleString()} kcal ${difference > 0 ? "above" : "below"} your ${Math.round(target).toLocaleString()} kcal target.`;
        state = abs <= 5 ? "match" : "warning";
    }

    setTextIfChanged(status, text);
    if (status.dataset.state !== state) status.dataset.state = state;
}

function updateManualPreview() {
    const protein = Number(document.getElementById("manual-macro-protein")?.value);
    const carbs = Number(document.getElementById("manual-macro-carbs")?.value);
    const fat = Number(document.getElementById("manual-macro-fat")?.value);
    if (![protein, carbs, fat].every(value => Number.isFinite(value) && value >= 0)) return;

    const macros = { protein, carbs, fat };
    const pct = percentages(macros);
    setTextIfChanged(document.getElementById("manual-protein-percent"), `(${pct.protein}%)`);
    setTextIfChanged(document.getElementById("manual-carb-percent"), `(${pct.carbs}%)`);
    setTextIfChanged(document.getElementById("manual-fat-percent"), `(${pct.fat}%)`);
    renderManualStatus(macros);
}

function applySavedManualIfNeeded() {
    const saved = readSavedMacro();
    if (!saved?.useManual || !saved.manualMacros) return false;

    const macros = saved.manualMacros;
    if (![macros.protein, macros.carbs, macros.fat].every(value => Number.isFinite(Number(value)))) {
        return false;
    }

    setMacroText(macros, macroTotalCalories(macros));
    return true;
}

function decoratePresetPercentages() {
    if (!document.getElementById("nutrition-protein-target")) return;
    if (applySavedManualIfNeeded()) return;

    const macros = getDisplayedMacros();
    if (![macros.protein, macros.carbs, macros.fat].every(Number.isFinite)) return;
    setMacroText(macros, numberFromText(document.getElementById("nutrition-macro-calories")?.textContent));
}

function injectManualControls() {
    const macroCard = document.querySelector('[data-planner-view="macros"] .nutrition-goal-card');
    if (!macroCard || macroCard.querySelector("[data-manual-macros]")) return;

    const summary = macroCard.querySelector(".weight-summary");
    if (!summary) return;

    const saved = readSavedMacro();
    const displayed = getDisplayedMacros();
    const starting = saved?.manualMacros || {
        protein: Number.isFinite(displayed.protein) ? displayed.protein : 160,
        carbs: Number.isFinite(displayed.carbs) ? displayed.carbs : 200,
        fat: Number.isFinite(displayed.fat) ? displayed.fat : 60
    };

    const panel = document.createElement("section");
    panel.className = "manual-macro-panel";
    panel.dataset.manualMacros = "true";
    panel.innerHTML = `
        <div class="manual-macro-heading">
            <div>
                <span class="eyebrow">CUSTOM TARGETS</span>
                <h3>Manually Adjust Macros</h3>
                <p>Enter your preferred daily grams. Percentages update automatically from the calories provided by each macro.</p>
            </div>
            <label class="manual-macro-toggle">
                <input id="manual-macro-enabled" type="checkbox" ${saved?.useManual ? "checked" : ""}>
                <span>Use manual</span>
            </label>
        </div>

        <div class="manual-macro-input-grid">
            <label>Protein <span id="manual-protein-percent">(--%)</span>
                <div><input id="manual-macro-protein" type="number" inputmode="numeric" min="0" step="1" value="${Math.round(starting.protein)}"><span>g</span></div>
            </label>
            <label>Carbs <span id="manual-carb-percent">(--%)</span>
                <div><input id="manual-macro-carbs" type="number" inputmode="numeric" min="0" step="1" value="${Math.round(starting.carbs)}"><span>g</span></div>
            </label>
            <label>Fat <span id="manual-fat-percent">(--%)</span>
                <div><input id="manual-macro-fat" type="number" inputmode="numeric" min="0" step="1" value="${Math.round(starting.fat)}"><span>g</span></div>
            </label>
        </div>

        <p id="manual-macro-status" class="manual-macro-status"></p>
        <button id="save-manual-macros" class="secondary-btn" type="button">Save Manual Macros</button>
    `;

    summary.insertAdjacentElement("beforebegin", panel);

    ["manual-macro-protein", "manual-macro-carbs", "manual-macro-fat"]
        .forEach(id => document.getElementById(id)?.addEventListener("input", updateManualPreview));

    document.getElementById("save-manual-macros")?.addEventListener("click", () => {
        const macros = {
            protein: Number(document.getElementById("manual-macro-protein")?.value),
            carbs: Number(document.getElementById("manual-macro-carbs")?.value),
            fat: Number(document.getElementById("manual-macro-fat")?.value)
        };

        if (![macros.protein, macros.carbs, macros.fat].every(value => Number.isFinite(value) && value >= 0)) return;

        const previous = readSavedMacro() || {};
        const useManual = Boolean(document.getElementById("manual-macro-enabled")?.checked);
        writeSavedMacro({
            ...previous,
            macroPreset: previous.macroPreset || document.getElementById("nutrition-macro-select")?.value || "balanced",
            useManual,
            manualMacros: macros,
            updatedAt: new Date().toISOString()
        });

        if (useManual) setMacroText(macros, macroTotalCalories(macros));
        else decoratePresetPercentages();

        const message = document.getElementById("nutrition-macro-message");
        if (message) message.textContent = useManual ? "Manual macro targets saved." : "Manual macros saved. Preset targets remain active.";
        updatePlannerProteinSummary();
    });

    document.getElementById("manual-macro-enabled")?.addEventListener("change", event => {
        const savedNow = readSavedMacro() || {};
        savedNow.useManual = Boolean(event.target.checked);
        savedNow.updatedAt = new Date().toISOString();
        writeSavedMacro(savedNow);
        if (!applySavedManualIfNeeded()) decoratePresetPercentages();
        updatePlannerProteinSummary();
    });

    document.getElementById("nutrition-macro-select")?.addEventListener("change", () => {
        const savedNow = readSavedMacro();
        if (savedNow?.useManual) {
            savedNow.useManual = false;
            writeSavedMacro(savedNow);
            const toggle = document.getElementById("manual-macro-enabled");
            if (toggle) toggle.checked = false;
        }
        setTimeout(decoratePresetPercentages, 0);
    });

    document.getElementById("save-nutrition-macro-btn")?.addEventListener("click", () => {
        setTimeout(() => {
            const savedNow = readSavedMacro() || {};
            if (savedNow.useManual) {
                savedNow.useManual = false;
                writeSavedMacro(savedNow);
                const toggle = document.getElementById("manual-macro-enabled");
                if (toggle) toggle.checked = false;
            }
            decoratePresetPercentages();
            updatePlannerProteinSummary();
        }, 0);
    });

    updateManualPreview();
    decoratePresetPercentages();
}

function updatePlannerProteinSummary() {
    const saved = readSavedMacro();
    if (!saved?.useManual || !saved.manualMacros) return;
    const summary = document.getElementById("planner-summary-protein");
    if (summary) setTextIfChanged(summary, `${Math.round(Number(saved.manualMacros.protein) || 0)} g`);
}

function enhanceIfPresent() {
    const macrosView = document.querySelector('[data-planner-view="macros"]');
    if (!macrosView) return;
    injectManualControls();
    decoratePresetPercentages();
    updatePlannerProteinSummary();
}

// Do not observe the entire app DOM. The previous global MutationObserver reacted
// to its own text updates and could create a render loop that blocked bottom-nav taps.
// A lightweight presence check is enough because the Calories route is rendered as a unit.
const presenceTimer = window.setInterval(enhanceIfPresent, 1200);
window.addEventListener("levelup:nutrition-updated", enhanceIfPresent);
window.addEventListener("pagehide", () => window.clearInterval(presenceTimer), { once: true });
enhanceIfPresent();
