const STYLE_ID = "warmup-plate-calculator-styles";
let enhancementQueued = false;
let observer = null;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#workout-session-logger .warmup-plate-weight-wrap{
  display:grid;
  grid-template-columns:minmax(0,1fr) 28px;
  align-items:center;
  gap:4px;
  min-width:0;
}
#workout-session-logger .warmup-plate-weight-wrap > .session-warmup-weight{
  width:100%!important;
  min-width:0!important;
}
#workout-session-logger .warmup-plate-calculator-trigger{
  display:grid;
  place-items:center;
  width:28px;
  height:28px;
  min-width:28px;
  min-height:28px;
  padding:0;
  border:0;
  border-radius:8px;
  background:transparent;
  color:var(--accent,#ef1821);
  font:inherit;
}
#workout-session-logger .warmup-plate-calculator-trigger[hidden]{
  display:none!important;
}
#workout-session-logger .warmup-plate-calculator-trigger:active{
  background:color-mix(in srgb,var(--accent,#ef1821) 10%,transparent);
}
#workout-session-logger .warmup-plate-calculator-trigger .plate-calculator-trigger-icon{
  display:grid;
  place-items:center;
  width:22px;
  height:22px;
  color:inherit;
}
#workout-session-logger .warmup-plate-calculator-trigger .plate-calculator-trigger-icon svg{
  width:21px;
  height:21px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
}
#workout-session-logger .warmup-plate-calculator-proxy{
  display:none!important;
}
`;
    document.head.appendChild(style);
}

function workingPlateTrigger(card) {
    return [...(card?.querySelectorAll(".plate-calculator-trigger") || [])]
        .find(button => !button.classList.contains("warmup-plate-calculator-trigger")) || null;
}

function currentWarmupIndex(card) {
    return String(card?.dataset.activeWarmupPlateIndex || "");
}

function setCurrentWarmup(row) {
    const card = row?.closest?.(".session-exercise-card");
    if (!card) return;
    card.dataset.activeWarmupPlateIndex = String(row.dataset.warmupIndex || "0");
    queueEnhancement();
}

function clearCurrentWarmup(card) {
    if (!card) return;
    delete card.dataset.activeWarmupPlateIndex;
    queueEnhancement();
}

function unwrapWarmupWeight(row) {
    const wrap = row?.querySelector?.(".warmup-plate-weight-wrap");
    if (!wrap) return;
    const input = wrap.querySelector(".session-warmup-weight");
    if (input) wrap.insertAdjacentElement("beforebegin", input);
    wrap.remove();
}

function removeWarmupControls(card) {
    card?.querySelectorAll?.(".session-warmup-row").forEach(unwrapWarmupWeight);
}

function ensureWeightWrap(row) {
    const input = row?.querySelector?.(".session-warmup-weight");
    if (!input) return null;

    let wrap = input.closest(".warmup-plate-weight-wrap");
    if (!wrap) {
        wrap = document.createElement("span");
        wrap.className = "warmup-plate-weight-wrap";
        input.insertAdjacentElement("beforebegin", wrap);
        wrap.appendChild(input);
    }

    return { wrap, input };
}

function createWarmupButton(card, row) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "warmup-plate-calculator-trigger";
    button.dataset.warmupIndex = String(row.dataset.warmupIndex || "0");
    button.hidden = true;
    button.innerHTML = `
      <span class="plate-calculator-trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M4 9v6M7 7v10M10 9v6M14 9v6M17 7v10M20 9v6M2.5 12h19"/></svg>
      </span>
    `;
    button.addEventListener("click", () => openForWarmup(card, row, button));
    return button;
}

function updateWarmupButton(button, row, isCurrent) {
    const input = row?.querySelector(".session-warmup-weight");
    const weight = Number(input?.value);
    button.hidden = !isCurrent;
    button.setAttribute(
        "aria-label",
        Number.isFinite(weight) && weight > 0
            ? `Open plate calculator for ${formatWeight(weight)} pound warm-up set`
            : "Open plate calculator for current warm-up set"
    );
}

function enhanceCard(card) {
    if (!card || card.dataset.trackingType !== "reps") return;
    const baseTrigger = workingPlateTrigger(card);
    const rows = [...card.querySelectorAll(".session-warmup-row")];
    const validIndexes = new Set(rows.map(row => String(row.dataset.warmupIndex || "0")));
    const activeIndex = currentWarmupIndex(card);

    if (activeIndex && !validIndexes.has(activeIndex)) delete card.dataset.activeWarmupPlateIndex;

    if (!baseTrigger || !rows.length) {
        removeWarmupControls(card);
        return;
    }

    rows.forEach(row => {
        const controls = ensureWeightWrap(row);
        if (!controls) return;
        const index = String(row.dataset.warmupIndex || "0");
        let button = controls.wrap.querySelector(".warmup-plate-calculator-trigger");
        if (!button) {
            button = createWarmupButton(card, row);
            controls.wrap.appendChild(button);
        }
        updateWarmupButton(button, row, index === currentWarmupIndex(card));
    });
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

function openForWarmup(card, row, button) {
    const baseTrigger = workingPlateTrigger(card);
    const warmupInput = row?.querySelector(".session-warmup-weight");
    if (!baseTrigger || !warmupInput) return;

    const proxy = document.createElement("div");
    proxy.className = "session-set-row warmup-plate-calculator-proxy";
    proxy.dataset.setIndex = `warmup-${row.dataset.warmupIndex || "0"}`;

    const input = document.createElement("input");
    input.className = "session-weight";
    input.type = "number";
    input.value = warmupInput.value || "";
    proxy.appendChild(input);

    // Reuse the canonical plate calculator for eligibility, saved plate sizes,
    // bar/machine base weight and the sheet UI. The temporary proxy only supplies
    // the selected warm-up load to that existing calculator.
    baseTrigger.insertAdjacentElement("beforebegin", proxy);
    baseTrigger.click();
    proxy.remove();

    button.blur();
}

function formatWeight(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const rounded = Math.round(number * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
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
    const warmupInput = event.target.closest?.(".session-warmup-row input");
    if (warmupInput) {
        setCurrentWarmup(warmupInput.closest(".session-warmup-row"));
        return;
    }

    const workingInput = event.target.closest?.(".session-set-row .session-weight");
    if (workingInput) clearCurrentWarmup(workingInput.closest(".session-exercise-card"));
});

document.addEventListener("input", event => {
    const warmupInput = event.target.closest?.(".session-warmup-row input");
    if (!warmupInput) return;
    setCurrentWarmup(warmupInput.closest(".session-warmup-row"));
});

document.addEventListener("click", event => {
    const completeWarmup = event.target.closest?.(".complete-warmup-btn");
    if (completeWarmup) {
        clearCurrentWarmup(completeWarmup.closest(".session-exercise-card"));
        window.setTimeout(queueEnhancement, 0);
        return;
    }

    if (event.target.closest?.(".exercise-warmup-btn, .exercise-carousel-next, .exercise-carousel-prev, .logger-exercise-strip button")) {
        window.setTimeout(queueEnhancement, 0);
    }
});

startObserver();
window.addEventListener("pageshow", queueEnhancement);
window.addEventListener("focus", queueEnhancement);
