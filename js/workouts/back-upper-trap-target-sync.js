const BACK_ASSET = "assets/recovery/back-view.svg?v=recovery-back-vector-2";
const UPPER_TRAP_IDS = ["muscle_back_003", "muscle_back_004"];
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

function syncTargetMap(svg) {
    if (!svg || svg.dataset.upperTrapsBackSynced === "true") return;

    const source = svg.querySelector('[data-plan-target-muscle="Back"]');
    if (!source) return;

    UPPER_TRAP_IDS.forEach(id => {
        if (svg.querySelector(`[data-back-upper-trap-id="${id}"]`)) return;

        const href = `${BACK_ASSET}#${id}`;
        const use = document.createElementNS(SVG_NS, "use");
        use.setAttribute("href", href);
        use.setAttributeNS(XLINK_NS, "xlink:href", href);
        use.setAttribute("data-plan-target-muscle", "Back");
        use.setAttribute("data-back-upper-trap-id", id);
        use.setAttribute("class", "plan-target-muscle");

        const fill = source.style.getPropertyValue("--plan-target-fill");
        const intensity = source.style.getPropertyValue("--plan-target-intensity");
        if (fill) use.style.setProperty("--plan-target-fill", fill);
        if (intensity) use.style.setProperty("--plan-target-intensity", intensity);
        if (source.dataset.plannedSets) use.dataset.plannedSets = source.dataset.plannedSets;

        svg.appendChild(use);
    });

    svg.dataset.upperTrapsBackSynced = "true";
}

function syncAll(root = document) {
    root.querySelectorAll?.('.plan-target-map-slide[data-plan-target-map="back"] .plan-target-anatomy-svg')
        .forEach(syncTargetMap);
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => syncAll(content)).observe(content, { childList: true, subtree: true });
}

document.addEventListener("click", () => requestAnimationFrame(() => syncAll(document)), true);

syncAll(document);
