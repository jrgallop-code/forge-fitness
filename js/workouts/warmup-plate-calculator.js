const STYLE_ID = "warmup-plate-calculator-styles";
let enhancementQueued = false;
let observer = null;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#workout-session-logger .warmup-plate-calculator-trigger{
  display:grid;
  grid-template-columns:20px minmax(0,1fr) 14px;
  align-items:center;
  gap:7px;
  width:calc(100% - 40px);
  min-height:30px;
  margin:2px 0 5px 40px;
  padding:4px 7px;
  border:1px solid color-mix(in srgb,var(--accent,#ef1821) 18%,var(--line,rgba(127,127,127,.22)));
  border-radius:9px;
  background:color-mix(in srgb,var(--accent,#ef1821) 4%,transparent);
  color:var(--muted,#92929a);
  font:inherit;
  text-align:left;
}
#workout-session-logger .warmup-plate-calculator-trigger:active{
  background:color-mix(in srgb,var(--accent,#ef1821) 9%,transparent);
}
#workout-session-logger .warmup-plate-calculator-trigger-icon{
  display:grid;
  place-items:center;
  width:20px;
  height:20px;
  color:var(--accent,#ef1821);
}
#workout-session-logger .warmup-plate-calculator-trigger-icon svg{
  width:19px;
  height:19px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
}
#workout-session-logger .warmup-plate-calculator-trigger-copy{
  display:flex;
  align-items:baseline;
  gap:6px;
  min-width:0;
  line-height:1.2;
}
#workout-session-logger .warmup-plate-calculator-trigger-copy strong{
  flex:0 0 auto;
  color:var(--heading,var(--text,#f4f4f6));
  font-size:9.5px;
  font-weight:850;
}
#workout-session-logger .warmup-plate-calculator-trigger-copy span{
  min-width:0;
  overflow:hidden;
  color:var(--muted,#92929a);
  font-size:9px;
  text-overflow:ellipsis;
  white-space:nowrap;
}
#workout-session-logger .warmup-plate-calculator-chevron{
  color:var(--muted,#7d7d86);
  font-size:18px;
  line-height:1;
  text-align:right;
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

function warmupAnchor(row) {
    if (!row) return null;
    const index = String(row.dataset.warmupIndex || "0");
    const next = row.nextElementSibling;
    if (
        next?.matches?.('.inline-rest-timer[data-source-type="warmup"]') &&
        String(next.dataset.itemIndex || "0") === index
    ) {
        return next;
    }
    return row;
}

function createWarmupButton(card, row) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "warmup-plate-calculator-trigger";
    button.dataset.warmupIndex = String(row.dataset.warmupIndex || "0");
    button.innerHTML = `
      <span class="warmup-plate-calculator-trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M4 9v6M7 7v10M10 9v6M14 9v6M17 7v10M20 9v6M2.5 12h19"/></svg>
      </span>
      <span class="warmup-plate-calculator-trigger-copy"><strong>Warm-up plates</strong><span></span></span>
      <span class="warmup-plate-calculator-chevron" aria-hidden="true">›</span>
    `;
    button.addEventListener("click", () => openForWarmup(card, row, button));
    return button;
}

function updateWarmupButton(button, row) {
    const input = row?.querySelector(".session-warmup-weight");
    const weight = Number(input?.value);
    const detail = button.querySelector(".warmup-plate-calculator-trigger-copy span");
    const label = Number.isFinite(weight) && weight > 0
        ? `${formatWeight(weight)} lb · plate calculator`
        : "Enter warm-up weight";
    if (detail && detail.textContent !== label) detail.textContent = label;
    button.setAttribute(
        "aria-label",
        Number.isFinite(weight) && weight > 0
            ? `Open plate calculator for ${formatWeight(weight)} pound warm-up set`
            : "Open plate calculator for warm-up set"
    );
}

function enhanceCard(card) {
    if (!card || card.dataset.trackingType !== "reps") return;
    const baseTrigger = workingPlateTrigger(card);
    const rows = [...card.querySelectorAll(".session-warmup-row")];
    const validIndexes = new Set(rows.map(row => String(row.dataset.warmupIndex || "0")));

    card.querySelectorAll(".warmup-plate-calculator-trigger").forEach(button => {
        if (!baseTrigger || !validIndexes.has(String(button.dataset.warmupIndex || ""))) button.remove();
    });

    if (!baseTrigger || !rows.length) return;

    rows.forEach(row => {
        const index = String(row.dataset.warmupIndex || "0");
        let button = [...card.querySelectorAll(".warmup-plate-calculator-trigger")]
            .find(candidate => String(candidate.dataset.warmupIndex || "") === index);
        if (!button) button = createWarmupButton(card, row);

        const anchor = warmupAnchor(row);
        if (anchor && button.previousElementSibling !== anchor) anchor.insertAdjacentElement("afterend", button);
        updateWarmupButton(button, row);
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

    // The existing plate calculator is the authority for eligibility, saved plate
    // sizes, bar/machine base weight and the sheet UI. Its trigger reads the row
    // immediately before it, so provide a short-lived working-row-shaped proxy
    // containing the warm-up load, then invoke that same calculator synchronously.
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
                    node.matches?.(".session-warmup-row, .plate-calculator-trigger, .inline-rest-timer") ||
                    node.querySelector?.(".session-warmup-row, .plate-calculator-trigger, .inline-rest-timer")
                )
            )
        );
        if (relevant) queueEnhancement();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    queueEnhancement();
}

document.addEventListener("input", event => {
    if (!event.target.closest?.(".session-warmup-weight")) return;
    queueEnhancement();
});

document.addEventListener("click", event => {
    if (event.target.closest?.(".exercise-warmup-btn, .complete-warmup-btn, .exercise-carousel-next, .exercise-carousel-prev, .logger-exercise-strip button")) {
        window.setTimeout(queueEnhancement, 0);
    }
});

startObserver();
window.addEventListener("pageshow", queueEnhancement);
window.addEventListener("focus", queueEnhancement);
