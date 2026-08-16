const BACK_ASSET = "assets/recovery/back-view.svg?v=recovery-back-vector-1";
const UPPER_TRAP_IDS = ["muscle_back_003", "muscle_back_004"];
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

let queued = false;

function createUse(id, attributes = {}) {
    const use = document.createElementNS(SVG_NS, "use");
    const href = `${BACK_ASSET}#${id}`;
    use.setAttribute("href", href);
    use.setAttributeNS(XLINK_NS, "xlink:href", href);
    use.dataset.upperTrapFragment = id;

    Object.entries(attributes).forEach(([name, value]) => {
        if (name === "class") use.setAttribute("class", value);
        else if (name.startsWith("data-")) use.setAttribute(name, value);
        else use.setAttribute(name, value);
    });
    return use;
}

function copyRecoveryState(source, target) {
    if (!source || !target) return;
    ["--recovery-opacity", "--recovery-fill"].forEach(property => {
        const value = source.style.getPropertyValue(property);
        if (value) target.style.setProperty(property, value);
    });
    target.classList.toggle("no-data", source.classList.contains("no-data"));
}

function syncRecoveryBack() {
    document.querySelectorAll(".recovery-user-back-svg").forEach(svg => {
        const source = svg.querySelector('[data-recovery-muscle="Back"]');
        if (!source) return;

        UPPER_TRAP_IDS.forEach(id => {
            let use = svg.querySelector(`[data-upper-trap-fragment="${id}"][data-recovery-muscle="Back"]`);
            if (!use) {
                use = createUse(id, {
                    class: "recovery-user-muscle recovery-user-fill",
                    "data-recovery-muscle": "Back"
                });
                svg.appendChild(use);
            }
            copyRecoveryState(source, use);
        });
    });
}

function copyPlanState(source, target) {
    if (!source || !target) return;
    ["--plan-target-fill", "--plan-target-intensity"].forEach(property => {
        const value = source.style.getPropertyValue(property);
        if (value) target.style.setProperty(property, value);
    });
    if (source.dataset.plannedSets !== undefined) {
        target.dataset.plannedSets = source.dataset.plannedSets;
    }
}

function syncPlanTargetBack() {
    document.querySelectorAll('.plan-target-map-slide[data-plan-target-map="back"] .plan-target-anatomy-svg').forEach(svg => {
        const source = svg.querySelector('[data-plan-target-muscle="Back"]');
        if (!source) return;

        UPPER_TRAP_IDS.forEach(id => {
            let use = svg.querySelector(`[data-upper-trap-fragment="${id}"][data-plan-target-muscle="Back"]`);
            if (!use) {
                use = createUse(id, {
                    class: "plan-target-muscle",
                    "data-plan-target-muscle": "Back"
                });
                svg.appendChild(use);
            }
            copyPlanState(source, use);
        });
    });
}

function isBackGuide(svg) {
    const label = String(svg.getAttribute("aria-label") || "").trim().toLowerCase();
    return label.startsWith("back highlighted on back anatomy") ||
        label.startsWith("upper back highlighted on back anatomy");
}

function syncFormGuideBack() {
    document.querySelectorAll(".form-guide-muscle-svg-back").forEach(svg => {
        if (!isBackGuide(svg)) return;

        UPPER_TRAP_IDS.forEach(id => {
            if (svg.querySelector(`[data-upper-trap-fragment="${id}"]`)) return;
            const use = createUse(id, {
                class: "form-guide-muscle-highlight",
                fill: "#ff315f"
            });
            svg.appendChild(use);
        });
    });
}

function syncUpperTraps() {
    syncRecoveryBack();
    syncPlanTargetBack();
    syncFormGuideBack();
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        syncUpperTraps();
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(schedule).observe(content, {
        childList: true,
        subtree: true
    });
}

document.addEventListener("click", event => {
    if (event.target.closest?.('[data-recovery-facing], [data-recovery-map-button], .training-progress-tab[data-view="recovery"], .preset-plan-card, .plan-detail-exercise-row, .exercise-muscle-card, .exercise-guide-screen')) {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 120);
    }
}, true);

window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:open-exercise-guide", schedule);

schedule();
