const SETTINGS_KEY = "level_up_plate_calculator_settings";
const OPTIONAL_PLATES = [45, 35, 25, 10, 5, 2.5, 1.25];
const DEFAULT_PLATES = [45, 25, 10, 5, 2.5];
const PLATE_MACHINE_IDS = new Set([
    "leg-press",
    "hack-squat",
    "leg-press-calf-raise",
    "machine-hip-thrust"
]);
const STYLE_ID = "warmup-plate-calculator-bridge-styles";

let observer = null;
let enhancementQueued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#workout-session-logger .warmup-plate-calculator-proxy{
  position:absolute!important;
  width:1px!important;
  height:1px!important;
  overflow:hidden!important;
  clip:rect(0 0 0 0)!important;
  clip-path:inset(50%)!important;
  white-space:nowrap!important;
  opacity:0!important;
  pointer-events:none!important;
}
`;
    document.head.appendChild(style);
}

function canonicalTrigger(card) {
    return [...(card?.querySelectorAll(".plate-calculator-trigger") || [])]
        .find(button => !button.classList.contains("warmup-plate-calculator-trigger")) || null;
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

function equipmentProfile(card) {
    const exerciseId = card?.dataset.exerciseId || "";
    if (!canonicalTrigger(card)) return null;
    if (PLATE_MACHINE_IDS.has(exerciseId)) {
        return { kind: "plate-machine", defaultBaseWeight: 0, defaultIncludeBase: false };
    }
    return { kind: "barbell", defaultBaseWeight: 45, defaultIncludeBase: true };
}

function exerciseSettings(card, profile) {
    const exerciseId = card?.dataset.exerciseId || "";
    const saved = readSettings()[exerciseId] || {};
    const plates = Array.isArray(saved.plates)
        ? saved.plates.map(Number).filter(value => OPTIONAL_PLATES.includes(value))
        : DEFAULT_PLATES;
    const baseWeight = Number.isFinite(Number(saved.baseWeight))
        ? Math.max(0, Number(saved.baseWeight))
        : profile.defaultBaseWeight;
    const includeBase = typeof saved.includeBase === "boolean"
        ? saved.includeBase
        : baseWeight > 0
            ? true
            : profile.defaultIncludeBase;
    return {
        includeBase,
        baseWeight,
        plates: plates.length ? [...new Set(plates)].sort((a, b) => b - a) : DEFAULT_PLATES
    };
}

function effectiveBaseWeight(settings) {
    return settings?.includeBase ? Math.max(0, Number(settings.baseWeight) || 0) : 0;
}

function formatWeight(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const rounded = Math.round(number * 100) / 100;
    return Number.isInteger(rounded)
        ? String(rounded)
        : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
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
        return { belowBase: true, exact: false, counts: new Map(), closestTotal: base, difference: base - total };
    }

    const SCALE = 4;
    const targetUnits = Math.max(0, Math.round(desiredPerSide * SCALE));
    const coins = available.map(value => ({ value, units: Math.round(value * SCALE) }));
    const largest = Math.max(...coins.map(item => item.units));
    const maxUnits = targetUnits + largest;
    const dp = new Array(maxUnits + 1).fill(Infinity);
    const previous = new Array(maxUnits + 1).fill(null);
    dp[0] = 0;

    for (let units = 1; units <= maxUnits; units += 1) {
        coins.forEach(coin => {
            if (units < coin.units || !Number.isFinite(dp[units - coin.units])) return;
            const candidate = dp[units - coin.units] + 1;
            if (candidate < dp[units]) {
                dp[units] = candidate;
                previous[units] = coin;
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
    while (cursor > 0 && previous[cursor]) {
        const coin = previous[cursor];
        counts.set(coin.value, (counts.get(coin.value) || 0) + 1);
        cursor -= coin.units;
    }

    const closestTotal = base + (bestUnits / SCALE) * 2;
    return {
        belowBase: false,
        exact: Math.abs(closestTotal - total) < 0.001,
        counts,
        closestTotal,
        difference: closestTotal - total
    };
}

function plateSummary(solution) {
    if (!solution) return "Enter load";
    if (solution.belowBase) return "Load is below base";
    const entries = [...solution.counts.entries()].sort((a, b) => b[0] - a[0]);
    if (!entries.length) return "No plates";
    return entries
        .map(([plate, count]) => count > 1 ? `${formatWeight(plate)} lb × ${count}` : `${formatWeight(plate)} lb`)
        .join(" · ");
}

function warmupCalculation(card, row) {
    const profile = equipmentProfile(card);
    const input = row?.querySelector(".session-warmup-weight");
    if (!profile || !input) return null;

    const settings = exerciseSettings(card, profile);
    const entered = Number(input.value);
    const base = effectiveBaseWeight(settings);
    const total = profile.kind === "plate-machine" && Number.isFinite(entered)
        ? entered + base
        : entered;
    const solution = calculatePlateSolution(total, base, settings.plates);
    const closestLoad = solution
        ? profile.kind === "plate-machine"
            ? solution.closestTotal - base
            : solution.closestTotal
        : null;
    return { profile, settings, solution, closestLoad };
}

function cleanupLegacyWarmupControls(card) {
    card?.querySelectorAll?.(".warmup-plate-calculator-trigger").forEach(button => button.remove());
    card?.querySelectorAll?.(".warmup-plate-weight-wrap").forEach(wrap => {
        const input = wrap.querySelector(".session-warmup-weight");
        if (input) wrap.insertAdjacentElement("beforebegin", input);
        wrap.remove();
    });
}

function updateCanonicalTriggerForWarmup(card, row) {
    const trigger = canonicalTrigger(card);
    const calculation = warmupCalculation(card, row);
    if (!trigger || !calculation) return false;

    card.dataset.activeWarmupPlateIndex = String(row.dataset.warmupIndex || "0");
    trigger.dataset.plateSource = "warmup";
    trigger.dataset.warmupIndex = String(row.dataset.warmupIndex || "0");

    if (trigger.previousElementSibling !== row) row.insertAdjacentElement("afterend", trigger);

    const { solution, closestLoad } = calculation;
    const summary = plateSummary(solution);
    const detail = trigger.querySelector(".plate-calculator-trigger-copy span");
    if (detail) {
        detail.textContent = solution && !solution.exact && !solution.belowBase
            ? `${summary} · ${formatWeight(closestLoad)} lb`
            : summary;
    }
    trigger.setAttribute("aria-label", `Open plate calculator. Per side: ${summary}`);
    return true;
}

function clearWarmupSelection(card) {
    if (!card) return;
    delete card.dataset.activeWarmupPlateIndex;
    const trigger = canonicalTrigger(card);
    if (trigger) {
        delete trigger.dataset.plateSource;
        delete trigger.dataset.warmupIndex;
    }
    card.querySelectorAll(".warmup-plate-calculator-proxy").forEach(node => node.remove());
}

function restoreWorkingTrigger(card) {
    if (!card) return;
    clearWarmupSelection(card);
    const row = card.querySelector(".session-set-row:not(.completed)") || card.querySelector(".session-set-row:last-of-type");
    const input = row?.querySelector(".session-weight");
    if (!input) return;
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
}

function prepareWarmupProxyForCanonicalClick(trigger) {
    const card = trigger?.closest?.(".session-exercise-card");
    if (!card || trigger.dataset.plateSource !== "warmup") return;

    const index = String(trigger.dataset.warmupIndex || card.dataset.activeWarmupPlateIndex || "0");
    const row = card.querySelector(`.session-warmup-row[data-warmup-index="${CSS.escape(index)}"]`);
    const warmupInput = row?.querySelector(".session-warmup-weight");
    if (!row || !warmupInput) return;

    card.querySelectorAll(".warmup-plate-calculator-proxy").forEach(node => node.remove());

    const proxy = document.createElement("div");
    proxy.className = "session-set-row warmup-plate-calculator-proxy";
    proxy.dataset.setIndex = `warmup-${index}`;

    const input = document.createElement("input");
    input.className = "session-weight";
    input.type = "number";
    input.value = warmupInput.value || "";
    proxy.appendChild(input);

    trigger.insertAdjacentElement("beforebegin", proxy);
    window.setTimeout(() => proxy.remove(), 0);
}

function enhanceCard(card) {
    if (!card || card.dataset.trackingType !== "reps") return;
    cleanupLegacyWarmupControls(card);
    const trigger = canonicalTrigger(card);
    const activeIndex = card.dataset.activeWarmupPlateIndex;
    if (!trigger || activeIndex == null) return;

    const row = card.querySelector(`.session-warmup-row[data-warmup-index="${CSS.escape(String(activeIndex))}"]`);
    if (!row) {
        clearWarmupSelection(card);
        return;
    }
    updateCanonicalTriggerForWarmup(card, row);
}

function enhanceLogger() {
    ensureStyles();
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return;
    logger.querySelectorAll('.session-exercise-card[data-tracking-type="reps"]').forEach(enhanceCard);
}

function queueEnhancement() {
    if (enhancementQueued) return;
    enhancementQueued = true;
    requestAnimationFrame(() => {
        enhancementQueued = false;
        enhanceLogger();
    });
}

function startObserver() {
    if (!document.body) {
        document.addEventListener("DOMContentLoaded", startObserver, { once: true });
        return;
    }
    observer?.disconnect();
    observer = new MutationObserver(mutations => {
        const relevant = mutations.some(mutation =>
            [...mutation.addedNodes].some(node =>
                node?.nodeType === Node.ELEMENT_NODE && (
                    node.id === "workout-session-logger" ||
                    node.matches?.(".session-warmup-row, .plate-calculator-trigger") ||
                    node.querySelector?.(".session-warmup-row, .plate-calculator-trigger")
                )
            )
        );
        if (relevant) queueEnhancement();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    queueEnhancement();
}

document.addEventListener("focusin", event => {
    const warmupWeight = event.target.closest?.(".session-warmup-row .session-warmup-weight");
    if (warmupWeight) {
        updateCanonicalTriggerForWarmup(
            warmupWeight.closest(".session-exercise-card"),
            warmupWeight.closest(".session-warmup-row")
        );
        return;
    }

    const workingWeight = event.target.closest?.(".session-set-row .session-weight");
    if (workingWeight) clearWarmupSelection(workingWeight.closest(".session-exercise-card"));
});

document.addEventListener("input", event => {
    const warmupWeight = event.target.closest?.(".session-warmup-row .session-warmup-weight");
    if (!warmupWeight) return;
    updateCanonicalTriggerForWarmup(
        warmupWeight.closest(".session-exercise-card"),
        warmupWeight.closest(".session-warmup-row")
    );
});

// Capture first so the canonical working-set click handler sees a temporary
// .session-set-row immediately before the same trigger. That lets the existing
// sheet consume the warm-up load without creating a second calculator UI.
document.addEventListener("click", event => {
    const trigger = event.target.closest?.(".plate-calculator-trigger");
    if (trigger) prepareWarmupProxyForCanonicalClick(trigger);
}, true);

document.addEventListener("click", event => {
    const completeWarmup = event.target.closest?.(".complete-warmup-btn");
    if (completeWarmup) {
        const card = completeWarmup.closest(".session-exercise-card");
        window.setTimeout(() => restoreWorkingTrigger(card), 0);
        return;
    }

    if (event.target.closest?.(".exercise-carousel-next, .exercise-carousel-prev, .logger-exercise-strip button")) {
        document.querySelectorAll(".session-exercise-card").forEach(clearWarmupSelection);
        window.setTimeout(queueEnhancement, 0);
    }
});

startObserver();
window.addEventListener("pageshow", queueEnhancement);
window.addEventListener("focus", queueEnhancement);
