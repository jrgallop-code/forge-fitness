import { getExerciseById } from "./exercise-library.js?v=exercise-library-3";

const SETTINGS_KEY = "level_up_plate_calculator_settings";
const STYLESHEET_HREF = "css/plate-calculator.css?v=plate-calculator-2";
const DEFAULT_PLATES = [45, 25, 10, 5, 2.5];
const OPTIONAL_PLATES = [45, 35, 25, 10, 5, 2.5, 1.25];
const PLATE_MACHINE_IDS = new Set([
    "leg-press",
    "hack-squat",
    "leg-press-calf-raise",
    "machine-hip-thrust"
]);

let sheetContext = null;
let enhanceQueued = false;

function ensureStylesheet() {
    if (!document.querySelector('link[data-plate-calculator-style="true"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = STYLESHEET_HREF;
        link.dataset.plateCalculatorStyle = "true";
        document.head.appendChild(link);
    }

    if (!document.querySelector('style[data-plate-calculator-label-fix="true"]')) {
        const style = document.createElement("style");
        style.dataset.plateCalculatorLabelFix = "true";
        style.textContent = '.plate-calculator-visual::after{content:""!important;}';
        document.head.appendChild(style);
    }
}

function readSettings() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch {
        return {};
    }
}

function writeSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadingProfile(exerciseId) {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) return null;

    const equipment = String(exercise.equipment || "").trim().toLowerCase();
    if (equipment === "barbell") {
        return {
            kind: "barbell",
            defaultBaseWeight: 45,
            defaultIncludeBase: true,
            baseLabel: "Bar",
            settingsLabel: "Bar weight",
            toggleLabel: "Include bar weight",
            toggleHelp: "Turn this off for machine versions that use plates but no bar."
        };
    }

    if (PLATE_MACHINE_IDS.has(exerciseId)) {
        return {
            kind: "plate-machine",
            defaultBaseWeight: 0,
            defaultIncludeBase: false,
            baseLabel: "Machine base",
            settingsLabel: "Machine base weight",
            toggleLabel: "Include machine base",
            toggleHelp: "Adds the machine or sled weight on top of the plates you log."
        };
    }

    return null;
}

function getExerciseSettings(exerciseId, profile) {
    const saved = readSettings()[exerciseId] || {};
    const plates = Array.isArray(saved.plates)
        ? saved.plates.map(Number).filter(value => OPTIONAL_PLATES.includes(value))
        : DEFAULT_PLATES;
    const savedBaseWeight = Number.isFinite(Number(saved.baseWeight))
        ? Math.max(0, Number(saved.baseWeight))
        : profile.defaultBaseWeight;
    const includeBase = typeof saved.includeBase === "boolean"
        ? saved.includeBase
        : savedBaseWeight > 0
            ? true
            : profile.defaultIncludeBase;

    return {
        includeBase,
        baseWeight: savedBaseWeight,
        plates: plates.length ? [...new Set(plates)].sort((a, b) => b - a) : DEFAULT_PLATES
    };
}

function saveExerciseSettings(exerciseId, settings) {
    const all = readSettings();
    all[exerciseId] = {
        includeBase: Boolean(settings.includeBase),
        baseWeight: Math.max(0, Number(settings.baseWeight) || 0),
        plates: [...new Set((settings.plates || []).map(Number))]
            .filter(value => OPTIONAL_PLATES.includes(value))
            .sort((a, b) => b - a)
    };
    writeSettings(all);
}

function effectiveBaseWeight(settings) {
    return settings?.includeBase ? Math.max(0, Number(settings.baseWeight) || 0) : 0;
}

function calculationTotalForProfile(inputWeight, profile, settings) {
    const entered = Number(inputWeight);
    if (!Number.isFinite(entered)) return entered;
    return profile?.kind === "plate-machine"
        ? entered + effectiveBaseWeight(settings)
        : entered;
}

function closestEnteredLoad(solution, profile, baseWeight) {
    if (!solution) return null;
    return profile?.kind === "plate-machine"
        ? solution.closestTotal - baseWeight
        : solution.closestTotal;
}

function formatWeight(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const rounded = Math.round(number * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

function calculatePlateSolution(totalWeight, baseWeight, plates) {
    const total = Number(totalWeight);
    const base = Math.max(0, Number(baseWeight) || 0);
    const available = [...new Set((plates || []).map(Number))]
        .filter(value => Number.isFinite(value) && value > 0)
        .sort((a, b) => b - a);

    if (!Number.isFinite(total) || total <= 0 || !available.length) return null;

    const desiredPerSide = (total - base) / 2;
    if (desiredPerSide < -0.001) {
        return {
            total,
            base,
            desiredPerSide,
            belowBase: true,
            exact: false,
            counts: new Map(),
            perSide: 0,
            closestTotal: base,
            difference: base - total
        };
    }

    const SCALE = 4;
    const targetUnits = Math.max(0, Math.round(desiredPerSide * SCALE));
    const coinUnits = available.map(value => ({ value, units: Math.round(value * SCALE) }));
    const largest = Math.max(...coinUnits.map(item => item.units));
    const maxUnits = targetUnits + largest;
    const dp = new Array(maxUnits + 1).fill(Infinity);
    const previousCoin = new Array(maxUnits + 1).fill(null);
    dp[0] = 0;

    for (let units = 1; units <= maxUnits; units += 1) {
        coinUnits.forEach(coin => {
            if (units < coin.units || !Number.isFinite(dp[units - coin.units])) return;
            const candidate = dp[units - coin.units] + 1;
            if (candidate < dp[units]) {
                dp[units] = candidate;
                previousCoin[units] = coin;
            }
        });
    }

    let bestUnits = 0;
    let bestDistance = Infinity;
    let bestCount = Infinity;
    for (let units = 0; units <= maxUnits; units += 1) {
        if (!Number.isFinite(dp[units])) continue;
        const distance = Math.abs(units - targetUnits);
        if (
            distance < bestDistance ||
            (distance === bestDistance && dp[units] < bestCount) ||
            (distance === bestDistance && dp[units] === bestCount && units < bestUnits)
        ) {
            bestUnits = units;
            bestDistance = distance;
            bestCount = dp[units];
        }
    }

    const counts = new Map();
    let cursor = bestUnits;
    while (cursor > 0 && previousCoin[cursor]) {
        const coin = previousCoin[cursor];
        counts.set(coin.value, (counts.get(coin.value) || 0) + 1);
        cursor -= coin.units;
    }

    const perSide = bestUnits / SCALE;
    const closestTotal = base + perSide * 2;
    const difference = closestTotal - total;

    return {
        total,
        base,
        desiredPerSide,
        belowBase: false,
        exact: Math.abs(difference) < 0.001,
        counts,
        perSide,
        closestTotal,
        difference
    };
}

function expandedPlateList(solution) {
    if (!solution || solution.belowBase) return [];
    return [...solution.counts.entries()]
        .sort((a, b) => b[0] - a[0])
        .flatMap(([plate, count]) => Array.from({ length: count }, () => plate));
}

function plateSummary(solution) {
    if (!solution) return "Enter load";
    if (solution.belowBase) return "Load is below base";
    const entries = [...solution.counts.entries()].sort((a, b) => b[0] - a[0]);
    if (!entries.length) return "No plates";
    return entries
        .map(([plate, count]) => count > 1 ? `${formatWeight(plate)} × ${count}` : formatWeight(plate))
        .join(" · ");
}

function currentRowForCard(card) {
    const focused = card.querySelector(".session-set-row:focus-within");
    if (focused) return focused;
    return card.querySelector(".session-set-row:not(.completed)") || card.querySelector(".session-set-row:last-of-type");
}

function updateTrigger(card, row, profile) {
    if (!card || !row || !profile) return;
    const exerciseId = card.dataset.exerciseId || "";
    const input = row.querySelector(".session-weight");
    if (!input) return;

    let trigger = card.querySelector(".plate-calculator-trigger");
    if (!trigger) {
        trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "plate-calculator-trigger";
        trigger.innerHTML = `
            <span class="plate-calculator-trigger-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4 9v6M7 7v10M10 9v6M14 9v6M17 7v10M20 9v6M2.5 12h19"/>
                </svg>
            </span>
            <span class="plate-calculator-trigger-copy"><strong>Per side</strong><span></span></span>
            <span class="plate-calculator-chevron" aria-hidden="true">›</span>
        `;
        trigger.addEventListener("click", () => openSheet(card, trigger.closest(".session-exercise-card")?.querySelector(".plate-calculator-trigger")?.previousElementSibling || currentRowForCard(card)));
    }

    if (trigger.previousElementSibling !== row) row.insertAdjacentElement("afterend", trigger);
    trigger.dataset.setIndex = row.dataset.setIndex || "0";

    const settings = getExerciseSettings(exerciseId, profile);
    const baseWeight = effectiveBaseWeight(settings);
    const calculationTotal = calculationTotalForProfile(input.value, profile, settings);
    const solution = calculatePlateSolution(calculationTotal, baseWeight, settings.plates);
    const summary = plateSummary(solution);
    const closestLoad = closestEnteredLoad(solution, profile, baseWeight);
    const detail = trigger.querySelector(".plate-calculator-trigger-copy span");
    if (detail) {
        detail.textContent = solution && !solution.exact && !solution.belowBase
            ? `${summary} · ${formatWeight(closestLoad)} lb`
            : summary;
    }
    trigger.setAttribute("aria-label", `Open plate calculator. Per side: ${summary}`);
}

function refreshCard(card) {
    if (!card || card.dataset.trackingType !== "reps") return;
    const exerciseId = card.dataset.exerciseId || "";
    const profile = loadingProfile(exerciseId);
    if (!profile) {
        card.querySelector(".plate-calculator-trigger")?.remove();
        return;
    }

    const row = currentRowForCard(card);
    if (row) updateTrigger(card, row, profile);
}

function enhanceLogger() {
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return;
    ensureStylesheet();
    logger.querySelectorAll('.session-exercise-card[data-tracking-type="reps"]').forEach(refreshCard);
}

function queueEnhancement() {
    if (enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(() => {
        enhanceQueued = false;
        enhanceLogger();
    });
}

function createSheet() {
    let overlay = document.querySelector(".plate-calculator-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "plate-calculator-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="plate-calculator-sheet" role="dialog" aria-modal="true" aria-labelledby="plate-calculator-title">
            <div class="plate-calculator-handle" aria-hidden="true"></div>
            <header class="plate-calculator-header">
                <h3 id="plate-calculator-title">Plate calculator</h3>
                <button type="button" class="plate-calculator-done">Done</button>
            </header>
            <div class="plate-calculator-body"></div>
        </section>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".plate-calculator-done")?.addEventListener("click", closeSheet);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeSheet();
    });
    return overlay;
}

function renderPlateVisual(solution) {
    const plates = expandedPlateList(solution).sort((a, b) => a - b);
    if (!plates.length) {
        return `<div class="plate-calculator-empty-visual"><span></span><strong>${solution?.belowBase ? "Below base weight" : "No plates needed"}</strong></div>`;
    }

    const shown = plates.length > 9 ? plates.slice(-9) : plates;
    const extra = Math.max(0, plates.length - shown.length);
    return `
        <div class="plate-calculator-visual" aria-label="Plates shown for one side, lighter plates outside and heavier plates inside">
            <div class="plate-calculator-sleeve" aria-hidden="true"></div>
            <div class="plate-calculator-plates">
                ${extra ? `<span class="plate-calculator-more">+${extra}</span>` : ""}
                ${shown.map((plate, index) => `
                    <span class="plate-calculator-plate" style="--plate-scale:${Math.max(.46, Math.min(1, plate / 45)).toFixed(2)};--plate-order:${index}" title="${formatWeight(plate)} lb">
                        <b>${formatWeight(plate)}</b>
                    </span>
                `).join("")}
                <span class="plate-calculator-stop" aria-hidden="true"></span>
            </div>
        </div>
    `;
}

function renderSheet() {
    if (!sheetContext) return;
    const { card, row, profile, exerciseId } = sheetContext;
    const input = row?.querySelector(".session-weight");
    const enteredLoad = Number(input?.value);
    const settings = getExerciseSettings(exerciseId, profile);
    const baseWeight = effectiveBaseWeight(settings);
    const calculationTotal = calculationTotalForProfile(enteredLoad, profile, settings);
    const solution = calculatePlateSolution(calculationTotal, baseWeight, settings.plates);
    const overlay = createSheet();
    const body = overlay.querySelector(".plate-calculator-body");
    if (!body) return;

    const closestLoad = closestEnteredLoad(solution, profile, baseWeight);
    const nearestTitle = profile.kind === "plate-machine" ? "Closest plate load" : "Closest available";
    const exactNote = solution && !solution.belowBase && !solution.exact
        ? `<div class="plate-calculator-nearest"><strong>${nearestTitle}: ${formatWeight(closestLoad)} lb</strong><span>${solution.difference > 0 ? "+" : ""}${formatWeight(solution.difference)} lb from entered load</span></div>`
        : "";
    const baseDisplay = settings.includeBase ? `${formatWeight(settings.baseWeight)} lb` : "None";
    const settingsSummary = settings.includeBase ? `${formatWeight(settings.baseWeight)} lb` : "Off";
    const displayedTotal = Number.isFinite(enteredLoad) && enteredLoad > 0
        ? profile.kind === "plate-machine"
            ? enteredLoad + baseWeight
            : enteredLoad
        : null;

    body.innerHTML = `
        <div class="plate-calculator-card">
            ${renderPlateVisual(solution)}
            <div class="plate-calculator-summary">
                <div><span>Per side</span><strong>${solution ? plateSummary(solution) : "Enter a load"}</strong></div>
                <div><span>${profile.baseLabel}</span><strong>${baseDisplay}</strong></div>
                <div><span>Total</span><strong>${Number.isFinite(displayedTotal) ? `${formatWeight(displayedTotal)} lb` : "—"}</strong></div>
            </div>
            ${exactNote}
        </div>

        <button type="button" class="plate-calculator-settings-toggle" aria-expanded="false">
            <span><strong>Equipment settings</strong><small>${profile.settingsLabel}: ${settingsSummary}</small></span>
            <span aria-hidden="true">›</span>
        </button>

        <div class="plate-calculator-settings" hidden>
            <label class="plate-calculator-base-toggle-row">
                <span class="plate-calculator-base-toggle-copy"><strong>${profile.toggleLabel}</strong><small>${profile.toggleHelp}</small></span>
                <span class="plate-calculator-switch">
                    <input class="plate-calculator-base-enabled" type="checkbox" ${settings.includeBase ? "checked" : ""} aria-label="${profile.toggleLabel}">
                    <i aria-hidden="true"></i>
                </span>
            </label>
            <label class="plate-calculator-base-row" ${settings.includeBase ? "" : "hidden"}>
                <span>${profile.settingsLabel}</span>
                <span class="plate-calculator-number-wrap"><input class="plate-calculator-base-input" type="number" inputmode="decimal" min="0" step="0.25" value="${formatWeight(settings.baseWeight)}"><b>lb</b></span>
            </label>
            <div class="plate-calculator-available">
                <span>Available plates</span>
                <div class="plate-calculator-plate-options">
                    ${OPTIONAL_PLATES.map(plate => `
                        <button type="button" data-plate-option="${plate}" aria-pressed="${settings.plates.includes(plate)}">${formatWeight(plate)}</button>
                    `).join("")}
                </div>
            </div>
            <p>Saved for this exercise on this device.</p>
        </div>
    `;

    body.querySelector(".plate-calculator-settings-toggle")?.addEventListener("click", event => {
        const button = event.currentTarget;
        const panel = body.querySelector(".plate-calculator-settings");
        const opening = panel?.hidden !== false;
        if (panel) panel.hidden = !opening;
        button.setAttribute("aria-expanded", String(opening));
    });

    body.querySelector(".plate-calculator-base-enabled")?.addEventListener("change", event => {
        const next = getExerciseSettings(exerciseId, profile);
        next.includeBase = Boolean(event.target.checked);
        saveExerciseSettings(exerciseId, next);
        renderSheet();
        refreshCard(card);
    });

    body.querySelector(".plate-calculator-base-input")?.addEventListener("change", event => {
        const next = getExerciseSettings(exerciseId, profile);
        next.baseWeight = Math.max(0, Number(event.target.value) || 0);
        saveExerciseSettings(exerciseId, next);
        renderSheet();
        refreshCard(card);
    });

    body.querySelector(".plate-calculator-plate-options")?.addEventListener("click", event => {
        const button = event.target.closest("button[data-plate-option]");
        if (!button) return;
        const value = Number(button.dataset.plateOption);
        const next = getExerciseSettings(exerciseId, profile);
        const selected = new Set(next.plates);
        if (selected.has(value)) {
            if (selected.size === 1) return;
            selected.delete(value);
        }
        else {
            selected.add(value);
        }
        next.plates = [...selected];
        saveExerciseSettings(exerciseId, next);
        renderSheet();
        refreshCard(card);
    });
}

function openSheet(card, requestedRow) {
    if (!card) return;
    const exerciseId = card.dataset.exerciseId || "";
    const profile = loadingProfile(exerciseId);
    if (!profile) return;
    const row = requestedRow?.matches?.(".session-set-row") ? requestedRow : currentRowForCard(card);
    if (!row) return;

    sheetContext = { card, row, profile, exerciseId };
    const overlay = createSheet();
    renderSheet();
    overlay.hidden = false;
    document.documentElement.classList.add("plate-calculator-open");
    requestAnimationFrame(() => overlay.classList.add("open"));
}

function closeSheet() {
    const overlay = document.querySelector(".plate-calculator-overlay");
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("open");
    document.documentElement.classList.remove("plate-calculator-open");
    window.setTimeout(() => {
        overlay.hidden = true;
        sheetContext = null;
    }, 180);
}

document.addEventListener("focusin", event => {
    const input = event.target.closest?.(".session-weight");
    if (!input) return;
    const row = input.closest(".session-set-row");
    const card = input.closest(".session-exercise-card");
    const profile = loadingProfile(card?.dataset.exerciseId || "");
    if (card && row && profile) updateTrigger(card, row, profile);
});

document.addEventListener("input", event => {
    const input = event.target.closest?.(".session-weight");
    if (!input) return;
    const row = input.closest(".session-set-row");
    const card = input.closest(".session-exercise-card");
    const profile = loadingProfile(card?.dataset.exerciseId || "");
    if (card && row && profile) {
        updateTrigger(card, row, profile);
        if (sheetContext?.row === row) renderSheet();
    }
});

document.addEventListener("click", event => {
    if (event.target.closest?.(".complete-set-btn, .logger-exercise-strip button, .exercise-carousel-next, .exercise-carousel-prev")) {
        window.setTimeout(queueEnhancement, 0);
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSheet();
});

const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation =>
        [...mutation.addedNodes].some(node =>
            node.nodeType === Node.ELEMENT_NODE && (
                node.id === "workout-session-logger" ||
                node.matches?.(".session-exercise-card, .session-set-row") ||
                node.querySelector?.("#workout-session-logger, .session-exercise-card, .session-set-row")
            )
        )
    );
    if (relevant) queueEnhancement();
});

observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener("pageshow", queueEnhancement);
window.addEventListener("focus", queueEnhancement);
queueEnhancement();
